// public/js/pos.js
let selectedTableId = null;
let cart = [];
let allMenuItems = [];

// --- Tabbing Logic ---
function switchTab(tab) {
    document.querySelectorAll('.layout-split, #kitchen-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-links button').forEach(btn => btn.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${tab}-section`).classList.remove('hidden');

    if (tab === 'floor') fetchFloorData();
    if (tab === 'pos') fetchMenu();
    if (tab === 'kitchen') fetchKitchenData();
}

// --- Floor Plan Logic ---
async function fetchFloorData() {
    try {
        const res = await fetch('/api/pos/floor');
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
    document.querySelector('.nav-links button:nth-child(2)').classList.add('active');
    document.querySelector('.nav-links button:nth-child(1)').classList.remove('active');
}

// --- POS Logic ---
async function fetchMenu() {
    try {
        const res = await fetch('/api/pos/menu');
        const data = await res.json();
        if(data.success) {
            allMenuItems = data.menu;
            filterMenu('Mains'); // Default
        }
    } catch(err) { console.error(err); }
}

function filterMenu(category) {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    
    const targetPill = Array.from(document.querySelectorAll('.pill')).find(p => p.innerText.trim() === category);
    if (targetPill) {
        targetPill.classList.add('active');
    }

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
        container.innerHTML = '<p style="color: var(--muted-foreground); text-align: center; margin-top: 2rem;">No items yet</p>';
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
                <div>
                    <strong>${item.name}</strong> x${item.quantity}
                </div>
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
            alert('Order sent to kitchen! Ingredients Auto-Deducted.');
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
        const orderTime = new Date(order.created_at);
        // Calculate minutes ago
        const minsAgo = Math.floor((now - orderTime) / 60000); 
        const isOverdue = minsAgo > 20; // Highlight if older than 20 mins

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
                    <p style="color: var(--muted-foreground); font-size: 0.9rem; margin-top: 0;">Order Items</p>
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
        if(data.success) {
            fetchKitchenData(); // Refresh KDS
        }
    } catch(err) { console.error(err); }
}

// Load Floor plan by default on boot
document.addEventListener('DOMContentLoaded', fetchFloorData);