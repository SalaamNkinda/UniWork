// --- Tabbing & Navigation Logic ---
function switchTab(tab) {
    // 1. Hide all potential sections
    const sections = ['dashboard', 'roster', 'revenue', 'profit'];
    sections.forEach(s => {
        const el = document.getElementById(`${s}-section`);
        if (el) el.classList.add('hidden');
    });
    
    // 2. Show the target section
    const targetSection = document.getElementById(`${tab}-section`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // 3. Trigger specific data fetches based on the active tab
    if (tab === 'roster') {
        fetchStaffData();
    } else if (tab === 'revenue') {
        fetchOrderHistory();
    } else if (tab === 'profit') {
        fetchProfitDetails();
    } else if (tab === 'dashboard') {
        loadBusinessStats();
    }
}

// --- Fetch & Render Roster (Existing Logic) ---
async function fetchStaffData() {
    try {
        const res = await fetch('/api/admin/staff');
        const data = await res.json();
        
        if(data.success) {
            renderStaffTable(data.staff);
        }
    } catch(err) {
        console.error("Failed to fetch staff data", err);
    }
}

function renderStaffTable(staff) {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    staff.forEach(person => {
        const isClockedIn = person.clock_in && !person.clock_out;
        
        let startTime = "-";
        if (isClockedIn) {
            const timeString = person.clock_in.replace(' ', 'T') + '+04:00';
            const dateObj = new Date(timeString);
            startTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const statusPill = isClockedIn 
            ? `<span class="status-pill status-in">Clocked In</span>` 
            : `<span class="status-pill status-out">Clocked Out</span>`;

        const roleStr = person.role.charAt(0).toUpperCase() + person.role.slice(1);

        tbody.innerHTML += `
            <tr>
                <td>${person.full_name}</td>
                <td style="color: var(--muted-foreground);">${roleStr}</td>
                <td>${startTime}</td>
                <td>${statusPill}</td>
            </tr>
        `;
    });
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

async function handleClockAction() {
    const username = getCookie('current_user');
    
    if (!username) {
        alert("Session expired. Please log in again.");
        window.location.href = '/';
        return;
    }

    try {
        const res = await fetch('/api/admin/clock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        });
        const data = await res.json();

        if (data.success) {
            const actionText = data.action === 'clocked_in' ? 'Clocked In' : 'Clocked Out';
            alert(`Success: ${data.user} has successfully ${actionText}!`);
            fetchStaffData(); 
        } else {
            alert(data.message); 
        }
    } catch(err) {
        console.error(err);
    }
}

async function fetchOrderHistory() {
    const dateInput = document.getElementById('revenue-date-filter');
    
    const now = new Date();
    const dubaiTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
    const defaultDate = dubaiTime.toISOString().split('T')[0];
    
    const selectedDate = dateInput.value || defaultDate;
    
    try {
        const res = await fetch(`/api/admin/orders?date=${selectedDate}`);
        const data = await res.json();
        
        if (data.success) {
            const tbody = document.getElementById('order-history-body');
            tbody.innerHTML = data.orders.map(order => `
                <tr>
                    <td>#${order.order_id}</td>
                    <td>${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>Table ${order.table_id || 'N/A'}</td>
                    <td>$${order.total_amount.toFixed(2)}</td>
                    <td><span class="status-pill status-in">${order.order_status}</span></td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Failed to fetch order history", err);
    }
}

async function fetchProfitDetails() {
    try {
        const res = await fetch('/api/admin/profit-analytics');
        const result = await res.json();
        
        if (result.success) {
            const { comparisons, wastage } = result.data;
            
            // Update Comparison Cards
            const dayEl = document.getElementById('day-comp-val');
            dayEl.innerText = `${comparisons.dayChange}%`;
            dayEl.style.color = comparisons.dayChange >= 0 ? 'var(--success)' : 'var(--danger)';
            
            const monthEl = document.getElementById('month-comp-val');
            monthEl.innerText = `${comparisons.monthChange}%`;
            monthEl.style.color = comparisons.monthChange >= 0 ? 'var(--success)' : 'var(--danger)';

            // Render Wastage Table
            const tbody = document.getElementById('wastage-history-body');
            tbody.innerHTML = wastage.map(item => `
                <tr>
                    <td>${item.ingredient_name}</td>
                    <td>${item.quantity_wasted} ${item.unit}</td>
                    <td>${item.reason}</td>
                    <td style="color: var(--danger)">-$${(item.quantity_wasted * item.cost_per_unit).toFixed(2)}</td>
                    <td>${new Date(item.logged_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Failed to fetch profit details", err);
    }
}

// --- BUSINESS ANALYTICS & 24H CHART ---
async function loadBusinessStats() {
    try {
        const response = await fetch('/api/admin/stats/today');
        const result = await response.json();

        if (result.success) {
            const data = result.data;
            
            document.getElementById('revenue-val').innerText = `$${data.revenue}`;
            document.getElementById('profit-val').innerText = `$${data.profit}`;
            document.getElementById('margin-val').innerText = `${data.margin} Margin`;
            document.getElementById('busy-val').innerText = data.busiestTime;
            document.getElementById('staff-val').innerText = data.staffActive;

            if (data.chart) {
                renderDashboardChart(data.chart);
            }
        }
    } catch (err) {
        console.error("Failed to load business stats:", err);
    }
}

function renderDashboardChart(chartData) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Generate full 24-hour labels for the scrollable view
    const labels24h = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    
    // Map existing data to the 24-hour slots
    const data24h = labels24h.map(label => {
        const index = chartData.labels.indexOf(label);
        return index !== -1 ? chartData.revenueData[index] : 0;
    });

    if (window.revenueChartInstance) {
        window.revenueChartInstance.destroy();
    }

    window.revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels24h,
            datasets: [{
                label: 'Revenue ($)',
                data: data24h,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    loadBusinessStats();
    fetchStaffData();
    
    // Set default date for revenue filter
    const dateInput = document.getElementById('revenue-date-filter');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
});