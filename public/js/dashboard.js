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

const db = require('./db');

// --- 1. Order History with Date Filter ---
function getOrderHistory(dateFilter) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT order_id, total_amount, strftime('%H:%M', created_at) as time, status 
            FROM orders 
            WHERE date(created_at) = date(?) 
            ORDER BY created_at DESC`;
        db.all(sql, [dateFilter], (err, rows) => err ? reject(err) : resolve(rows));
    });
}

// --- 2. Wastage Logs for Profit Analysis ---
function getWastageLogs() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT w.log_id, i.ingredient_name, w.quantity_wasted, w.reason, 
                   (w.quantity_wasted * i.unit_cost) as cost_impact,
                   strftime('%Y-%m-%d', w.logged_at) as date
            FROM wastage_log w
            JOIN ingredients i ON w.ingredient_id = i.ingredient_id
            ORDER BY w.logged_at DESC LIMIT 15`;
        db.all(sql, [], (err, rows) => err ? reject(err) : resolve(rows));
    });
}

// --- 3. Growth Comparisons (Today vs Yesterday / Month vs Last Month) ---
async function getGrowthStats() {
    const query = (sql, params = []) => new Promise((res) => db.get(sql, params, (err, row) => res(row?.total || 0)));

    const today = await query("SELECT SUM(total_amount) as total FROM orders WHERE date(created_at) = date('now')");
    const yesterday = await query("SELECT SUM(total_amount) as total FROM orders WHERE date(created_at) = date('now', '-1 day')");
    const thisMonth = await query("SELECT SUM(total_amount) as total FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')");
    const lastMonth = await query("SELECT SUM(total_amount) as total FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')");

    const calcDiff = (now, prev) => prev > 0 ? (((now - prev) / prev) * 100).toFixed(1) : (now > 0 ? 100 : 0);

    return {
        dayDiff: calcDiff(today, yesterday),
        monthDiff: calcDiff(thisMonth, lastMonth)
    };
}

// --- 4. 24-Hour Revenue Distribution ---
function get24HourRevenue() {
    return new Promise((resolve, reject) => {
        // Uses a recursive CTE to ensure all 24 hours appear in the graph
        const sql = `
            WITH RECURSIVE hours(h) AS (SELECT 0 UNION ALL SELECT h+1 FROM hours WHERE h<23)
            SELECT h as hour, IFNULL(SUM(o.total_amount), 0) as revenue
            FROM hours
            LEFT JOIN orders o ON strftime('%H', o.created_at) = printf('%02d', h) AND date(o.created_at) = date('now')
            GROUP BY h ORDER BY h ASC`;
        db.all(sql, [], (err, rows) => err ? reject(err) : resolve(rows));
    });
}

module.exports = { 
    ...module.exports, 
    getOrderHistory, getWastageLogs, getGrowthStats, get24HourRevenue 
};

// --- Updated Navigation Logic ---
function switchTab(tab) {
    const sections = ['dashboard-section', 'roster-section', 'revenue-history-section', 'profit-analysis-section'];
    sections.forEach(id => document.getElementById(id).classList.add('hidden'));
    
    const target = document.getElementById(`${tab}-section`);
    if (target) target.classList.remove('hidden');

    if (tab === 'revenue-history' || tab === 'profit-analysis') loadHistoryData();
    if (tab === 'roster') fetchStaffData();
}

async function loadHistoryData() {
    const date = document.getElementById('history-date-picker').value || new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/admin/history?date=${date}`);
    const data = await res.json();

    if (data.success) {
        const orderTbody = document.querySelector('#order-history-table tbody');
        orderTbody.innerHTML = data.orders.map(o => `
            <tr><td>#${o.order_id}</td><td>${o.time}</td><td>$${o.total_amount}</td><td>${o.status}</td></tr>
        `).join('');

        const wasteTbody = document.querySelector('#wastage-table tbody');
        wasteTbody.innerHTML = data.wastage.map(w => `
            <tr><td>${w.ingredient_name}</td><td>${w.reason}</td><td style="color:var(--danger)">-$${w.cost_impact.toFixed(2)}</td><td>${w.date}</td></tr>
        `).join('');
    }
}

// --- Updated Business Stats Logic ---
async function loadBusinessStats() {
    const res = await fetch('/api/admin/stats/today');
    const result = await res.json();

    if (result.success) {
        const { data } = result;
        document.getElementById('revenue-val').innerText = `$${data.revenue}`;
        document.getElementById('profit-val').innerText = `$${data.profit}`;
        
        // Growth Indicators
        const growthEl = document.getElementById('growth-day-text');
        growthEl.innerText = `${data.growth.dayDiff}% vs Yesterday`;
        growthEl.style.color = data.growth.dayDiff >= 0 ? 'var(--success)' : 'var(--danger)';
        
        document.getElementById('growth-month-val').innerText = `${data.growth.monthDiff}%`;

        if (data.chart) render24hChart(data.chart);
    }
}

function render24hChart(chartData) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Revenue Growth ($)',
                data: chartData.revenueData,
                borderColor: '#3b82f6',
                tension: 0.3,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: { x: { grid: { display: false } } }
        }
    });
}