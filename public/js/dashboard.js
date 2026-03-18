// /public/js/dashboard.js
let currentPin = "";

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

// --- PIN Modal Logic ---
function openPinModal() {
    clearPin();
    document.getElementById('pin-modal').classList.remove('hidden');
}

function closePinModal() {
    document.getElementById('pin-modal').classList.add('hidden');
}

function appendPin(num) {
    if (currentPin.length < 4) {
        currentPin += num.toString();
        updatePinDisplay();
    }
}

function clearPin() {
    currentPin = "";
    updatePinDisplay();
}

function updatePinDisplay() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
        if (index < currentPin.length) {
            dot.classList.add('filled');
            dot.innerText = "*"; // Mask the PIN for security
        } else {
            dot.classList.remove('filled');
            dot.innerText = "";
        }
    });
}

async function submitPin() {
    if (currentPin.length === 0) return;

    try {
        const res = await fetch('/api/admin/clock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: currentPin })
        });
        const data = await res.json();
        
        if (data.success) {
            const actionText = data.action === 'clocked_in' ? 'Clocked In' : 'Clocked Out';
            alert(`Success: ${data.user} has successfully ${actionText}!`);
            closePinModal();
            fetchStaffData(); // Refresh table
        } else {
            alert(data.message); // E.g., "Invalid PIN"
            clearPin(); // Clear so they can try again
        }
    } catch(err) {
        console.error(err);
    }
}

// Initial fetch on page load
document.addEventListener('DOMContentLoaded', fetchStaffData);