// public/js/pos.js
let selectedTableId = null;
let cart = [];
let allMenuItems = [];

// --- Initialize Flatpickr & Boot ---
document.addEventListener('DOMContentLoaded', () => {
    flatpickr("#inline-calendar", {
        inline: true,
        defaultDate: "today",
        onChange: function(selectedDates, dateStr, instance) {
            fetchFloorData(); // Refresh the floor and reservations for the clicked date
        }
    });
    fetchFloorData();
});

// --- Tabbing Logic ---
function switchTab(tab) {
    // 1. Hide all sections
    document.querySelectorAll('.layout-split, #kitchen-section').forEach(el => el.classList.add('hidden'));
    
    // 2. Show the target section
    const targetSection = document.getElementById(`${tab}-section`);
    if (targetSection) targetSection.classList.remove('hidden');

    // 3. Fetch data if necessary
    if (tab === 'floor') fetchFloorData();
    if (tab === 'pos') fetchMenu();
    if (tab === 'kitchen') fetchKitchenData();
}

// --- Floor Plan Logic ---
function getSelectedDateStr() {
    let dateStr = document.getElementById('inline-calendar').value;
    if (!dateStr) {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        dateStr = (new Date(d - offset)).toISOString().split('T')[0];
    }
    return dateStr;
}

async function fetchFloorData() {
    try {
        const dateStr = getSelectedDateStr();
        const res = await fetch(`/api/pos/floor?date=${dateStr}`);
        const data = await res.json();
        if(data.success) {
            renderTables(data.tables);
            renderReservations(data.reservations);
        }
    } catch(err) { console.error(err); }
}

function renderTables(tables) {
    const container = document.getElementById('tables-container');
    container.innerHTML = '';
    
    tables.forEach((table) => {
        let statusClass = 'status-empty';
        if (table.table_status === 'Seated') statusClass = 'status-seated';
        if (table.table_status === 'Occupied') statusClass = 'status-occupied';
        if (table.table_status === 'Reserved') statusClass = 'status-reserved'; // For 15-min logic

        container.innerHTML += `
            <div class="table-shape square ${statusClass}" onclick="selectTable(${table.table_id}, '${table.table_number}')">
                ${table.table_number}
            </div>
        `;
    });
}

function renderReservations(resList) {
    const container = document.getElementById('reservations-container');
    container.innerHTML = '';
    resList.forEach(r => {
        // Safe local parsing 
        const time = new Date(r.reservation_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        container.innerHTML += `
            <div style="border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <strong>${r.customer_name}</strong>
                    <span style="color: var(--navy);">${r.table_number}</span>
                </div>
                <div style="color: var(--muted-foreground); font-size: 0.9rem;">
                    <p style="margin: 0 0 0.25rem 0;">${time}</p>
                    <p style="margin: 0;">${r.guests} guests</p>
                </div>
            </div>
        `;
    });
}

function selectTable(id, name) {
    selectedTableId = id;
    document.getElementById('pos-table-display').innerText = `Ordering for: ${name}`;
    switchTab('pos');
}

async function openBookingModal() {
    document.getElementById('booking-modal').classList.remove('hidden');
    
    // Display the date selected in Flatpickr
    const dateStr = getSelectedDateStr();
    const displayDate = new Date(dateStr).toDateString();
    document.getElementById('b-date-display').innerText = `Booking Date: ${displayDate}`;
    
    // Fetch tables for the dropdown
    const res = await fetch(`/api/pos/floor?date=${dateStr}`);
    const data = await res.json();
    const select = document.getElementById('b-table');
    select.innerHTML = '';
    data.tables.forEach(t => {
        select.innerHTML += `<option value="${t.table_id}">${t.table_number}</option>`;
    });
}

function closeBookingModal() {
    document.getElementById('booking-modal').classList.add('hidden');
}

async function submitBooking() {
    const name = document.getElementById('b-name').value;
    const timeStr = document.getElementById('b-time').value; // from <input type="time">
    const guests = document.getElementById('b-guests').value;
    const tableId = document.getElementById('b-table').value;
    const dateStr = getSelectedDateStr();
    
    if(!name || !timeStr || !guests || !tableId) return alert("Please fill all fields.");

    // Standardize ISO-like timestamp for SQlite and JavaScript alignment
    const reservationDateTime = `${dateStr}T${timeStr}:00`; 

    try {
        const res = await fetch('/api/pos/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                customer_name: name, 
                reservation_time: reservationDateTime, 
                guests, 
                table_id: tableId 
            })
        });
        const data = await res.json();
        if(data.success) {
            closeBookingModal();
            fetchFloorData(); // Refresh the sidebar reservations
        } else {
            alert('Error: ' + data.message);
        }
    } catch(err) { console.error(err); }
}

// --- POS Logic ---
async function fetchMenu() {
    try {
        const res = await fetch('/api/pos/menu');
        const data = await res.json();
        if(data.success) {
            allMenuItems = data.menu;
            filterMenu('Mains');
        }
    } catch(err) { console.error(err); }
}

function filterMenu(category) {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    
    const targetPill = Array.from(document.querySelectorAll('.pill')).find(p => p.innerText.trim() === category);
    if (targetPill) targetPill.classList.add('active');

    const container = document.getElementById('menu-container');
    container.innerHTML = '';
    
    allMenuItems.filter(i => i.category === category).forEach(item => {
        container.innerHTML += `
            <div class="menu-card" onclick="addToCart(${item.item_id}, '${item.dish_name}', ${item.selling_price})">
                <h3>${item.dish_name}</h3>
                <p>$${item.selling_price.toFixed(2)}</p>
            </div>
        `;
    });
}

function addToCart(id, name, price) {
    const existing = cart.find(i => i.item_id === id);
    if (existing) existing.quantity++;
    else cart.push({ item_id: id, name, selling_price: price, quantity: 1 });
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-container');
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-cart-text">No items yet</p>';
        document.getElementById('cart-total').innerText = '$0.00';
        return;
    }

    container.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        const itemTotal = item.selling_price * item.quantity;
        total += itemTotal;
        container.innerHTML += `
            <div class="ticket-item">
                <div><strong>${item.name}</strong> x${item.quantity}</div>
                <div>$${itemTotal.toFixed(2)}</div>
            </div>
        `;
    });
    document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
}

async function sendToKitchen() {
    if (!selectedTableId) return alert("Please select a table from the Floor Plan first.");
    if (cart.length === 0) return alert("Cart is empty.");

    try {
        const res = await fetch('/api/pos/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableId: selectedTableId, cart: cart })
        });
        const data = await res.json();
        if (data.success) {
            cart = [];
            selectedTableId = null;
            document.getElementById('pos-table-display').innerText = "Select a table from the Floor Plan first.";
            renderCart();
            switchTab('floor'); 
        } else {
            alert('Error: ' + data.message);
        }
    } catch(err) { console.error(err); }
}

async function voidOrder() {
    const pin = prompt("Enter Admin PIN to void this order:");
    if (!pin) return;

    try {
        const res = await fetch('/api/pos/verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });
        const data = await res.json();
        
        if (data.success && data.isValid) {
            cart = [];
            renderCart();
            alert("Order voided successfully.");
        } else {
            alert("Invalid PIN. Only Admins can void orders.");
        }
    } catch(err) { console.error(err); }
}

// --- Kitchen Display Logic ---
async function fetchKitchenData() {
    try {
        const res = await fetch('/api/pos/kitchen');
        const data = await res.json();
        if(data.success) {
            renderKitchen(data.orders);
        }
    } catch(err) { console.error(err); }
}

function renderKitchen(orders) {
    document.getElementById('kds-count').innerText = `Active Orders: ${orders.length}`;
    const container = document.getElementById('kds-container');
    container.innerHTML = '';

    const now = new Date();

    orders.forEach(order => {
        const orderTime = new Date(order.created_at + 'Z'); 
        const minsAgo = Math.floor((now - orderTime) / 60000); 
        
        const maxTime = order.max_time || 20; 
        const isOverdue = minsAgo > maxTime; 

        let itemsHtml = order.items.map(i => `<div class="kds-item">${i.name} ${i.qty > 1 ? `<b>x${i.qty}</b>` : ''}</div>`).join('');

        container.innerHTML += `
            <div class="kds-card">
                <div class="kds-header ${isOverdue ? '' : 'normal'}">
                    <h2 style="margin:0">${order.table_number}</h2>
                    <div style="text-align: right;">
                        <span style="font-size: 1.2rem; font-weight: bold;">${minsAgo} mins</span>
                        ${isOverdue ? '<br><small>OVERDUE!</small>' : ''}
                    </div>
                </div>
                <div class="kds-body">
                    <p class="kds-items-title">Order Items</p>
                    ${itemsHtml}
                </div>
                <button class="kds-btn" onclick="markDone(${order.order_id})">Mark as Done</button>
            </div>
        `;
    });
}

async function markDone(orderId) {
    try {
        const res = await fetch(`/api/pos/kitchen/${orderId}/done`, { method: 'PUT' });
        const data = await res.json();
        if(data.success) fetchKitchenData(); 
    } catch(err) { console.error(err); }
}