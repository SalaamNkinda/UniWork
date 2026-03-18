// --- Tabbing Logic ---
function switchTab(tab) {
    // 1. Hide all sections
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('roster-section').classList.add('hidden');
    
    // 2. Show the target section
    const targetSection = document.getElementById(`${tab}-section`);
    if (targetSection) targetSection.classList.remove('hidden');

    // 3. Fetch data if necessary
    if (tab === 'roster') fetchStaffData();
}

// --- Fetch & Render Roster ---
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
    tbody.innerHTML = '';

    staff.forEach(person => {
        // Check if currently clocked in
        const isClockedIn = person.clock_in && !person.clock_out;
        
        // Format Shift Start Time (handle SQLite UTC dates securely)
        let startTime = "-";
        if (isClockedIn) {
            // Append 'Z' to force UTC parsing, then convert to local time string
            const dateObj = new Date(person.clock_in + "Z");
            startTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const statusPill = isClockedIn 
            ? `<span class="status-pill status-in">Clocked In</span>` 
            : `<span class="status-pill status-out">Clocked Out</span>`;

        // Capitalize Role
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

// Helper to grab cookies
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
    // Silently grab the username of the person currently logged in
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
            body: JSON.stringify({ username: username }) // Send the cookie value silently
        });
        const data = await res.json();

        if (data.success) {
            const actionText = data.action === 'clocked_in' ? 'Clocked In' : 'Clocked Out';
            alert(`Success: ${data.user} has successfully ${actionText}!`);
            fetchStaffData(); // Refresh table
        } else {
            alert(data.message); 
        }
    } catch(err) {
        console.error(err);
    }
}

// Initial fetch on page load
document.addEventListener('DOMContentLoaded', fetchStaffData);

// --- NEW: BUSINESS ANALYTICS LOGIC ---

async function loadBusinessStats() {
    try {
        const response = await fetch('/api/admin/stats/today');
        const result = await response.json();

        if (result.success) {
            const data = result.data;
            
            // Update the Metric Cards
            document.getElementById('revenue-val').innerText = `$${data.revenue}`;
            document.getElementById('profit-val').innerText = `$${data.profit}`;
            document.getElementById('margin-val').innerText = `${data.margin} Margin`;
            document.getElementById('busy-val').innerText = data.busiestTime;
            document.getElementById('staff-val').innerText = data.staffActive;

            // Render the Graph if chart data is provided
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
    if (!canvas) return; // Guard clause if element doesn't exist yet

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Revenue ($)',
                data: chartData.revenueData,
                borderColor: '#ff5a1f', // Uniform Orange Accent
                backgroundColor: 'rgba(255, 90, 31, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// --- INITIALIZATION ---
// Update your existing window.onload or add this:
window.addEventListener('DOMContentLoaded', () => {
    loadBusinessStats();
    // Keep your existing staff loading call here too
    if (typeof loadStaff === 'function') loadStaff(); 
});