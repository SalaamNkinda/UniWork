const db = require('./db');
const crypto = require('crypto');

function getTables() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM tables", [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function getReservations(dateStr) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT r.*, t.table_number 
            FROM reservations r 
            JOIN tables t ON r.table_id = t.table_id
            WHERE date(r.reservation_time) = date(?)
            ORDER BY r.reservation_time ASC
        `, [dateStr], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

// Ensure table doesn't have an overlapping booking within 2 hours
function checkTableAvailability(tableId, reservationTime) {
    return new Promise((resolve, reject) => {
        // Math breakdown: ABS(ExistingRes - NewRes) * 24 Hours < 2 Hours
        const sql = `
            SELECT * FROM reservations 
            WHERE table_id = ? 
            AND ABS(julianday(reservation_time) - julianday(?)) * 24 < 2
        `;
        db.all(sql, [tableId, reservationTime], (err, rows) => {
            if (err) return reject(err);
            // If rows exist, table is not available
            resolve(rows.length === 0);
        });
    });
}

function createReservation(data) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO reservations (customer_name, reservation_time, guests, table_id) VALUES (?, ?, ?, ?)`,
        [data.customer_name, data.reservation_time, data.guests, data.table_id], function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
        });
    });
}

function getMenuItems() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM menu_items ORDER BY category ASC", [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function verifyAdminPassword(password) {
    return new Promise((resolve, reject) => {
        // Hash the typed password using SHA-256 (matches your auth.js logic)
        const hashedPass = crypto.createHash('sha256').update(password.toString()).digest('hex');

        // Check if a user exists with this password who is an admin or owner
        db.get("SELECT * FROM users WHERE hashed_password = ? AND (role = 'admin' OR role = 'owner')", [hashedPass], (err, row) => {
            if (err) return reject(err);
            resolve(!!row); // Returns true if authorized, false if not
        });
    });
};

function createOrderTransaction(tableId, staffId, cartItems) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            const itemIds = cartItems.map(i => i.item_id).join(',');
            
            db.all(`SELECT item_id, selling_price FROM menu_items WHERE item_id IN (${itemIds})`, [], (err, menuItems) => {
                if (err) { db.run('ROLLBACK'); return reject(err); }

                const priceMap = {};
                menuItems.forEach(m => priceMap[m.item_id] = m.selling_price);

                let totalAmount = cartItems.reduce((sum, item) => {
                    const realPrice = priceMap[item.item_id] || 0;
                    return sum + (realPrice * item.quantity);
                }, 0);

                // 1. Insert Order
                db.run(`INSERT INTO orders (order_status, total_amount, table_id, staff_id) VALUES ('Pending', ?, ?, ?)`, 
                [totalAmount, tableId, staffId], function(err) {
                    if (err) { db.run('ROLLBACK'); return reject(err); }
                    const orderId = this.lastID;

                    // 2. Update Table Status to physically occupied
                    db.run(`UPDATE tables SET table_status = 'Occupied' WHERE table_id = ?`, [tableId]);

                    // 3. Loop through Cart Items using Promise.all
                    let itemPromises = cartItems.map(item => {
                        return new Promise((resItem, rejItem) => {
                            const realPrice = priceMap[item.item_id] || 0;
                            const itemTotal = realPrice * item.quantity;

                            db.run(`INSERT INTO order_items (quantity, total_price, production_status, order_id, menu_item_id) VALUES (?, ?, 'In Progress', ?, ?)`,
                            [item.quantity, itemTotal, orderId, item.item_id], function(err) {
                                if (err) return rejItem(err);

                                // 4. Auto-Deduct Ingredients via Recipes table
                                db.all(`SELECT ingredient_id, quantity FROM recipes WHERE item_id = ?`, [item.item_id], (err, recipes) => {
                                    if (err) return rejItem(err);
                                    if (!recipes || recipes.length === 0) return resItem();

                                    let deductPromises = recipes.map(recipe => {
                                        return new Promise((resDed, rejDed) => {
                                            const deductAmount = recipe.quantity * item.quantity;
                                            db.run(`
                                                UPDATE ingredients 
                                                SET stock_level = MAX(0, stock_level - ?),
                                                    stock_level_status = CASE WHEN MAX(0, stock_level - ?) <= low_stock_threshold THEN 'LOW' ELSE 'OK' END
                                                WHERE ingredient_id = ?
                                            `, [deductAmount, deductAmount, recipe.ingredient_id], (err) => {
                                                if (err) return rejDed(err);
                                                resDed();
                                            });
                                        });
                                    });

                                    Promise.all(deductPromises).then(resItem).catch(rejItem);
                                });
                            });
                        });
                    });

                    Promise.all(itemPromises)
                        .then(() => {
                            db.run('COMMIT', err => {
                                if (err) { db.run('ROLLBACK'); return reject(err); }
                                resolve(orderId);
                            });
                        })
                        .catch(err => {
                            db.run('ROLLBACK');
                            reject(err);
                        });
                });
            });
        });
    });
}

function getKitchenOrders() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT o.order_id, o.created_at, t.table_number, m.dish_name, oi.quantity, m.estimated_time 
            FROM orders o
            JOIN tables t ON o.table_id = t.table_id
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN menu_items m ON oi.menu_item_id = m.item_id
            WHERE o.order_status = 'Pending'
            ORDER BY o.created_at ASC
        `;
        db.all(sql, [], (err, rows) => {
            if (err) return reject(err);
            
            const ordersMap = {};
            rows.forEach(row => {
                if (!ordersMap[row.order_id]) {
                    ordersMap[row.order_id] = {
                        order_id: row.order_id,
                        table_number: row.table_number,
                        created_at: row.created_at,
                        max_time: row.estimated_time || 20,
                        items: []
                    };
                } else {
                    if (row.estimated_time && row.estimated_time > ordersMap[row.order_id].max_time) {
                        ordersMap[row.order_id].max_time = row.estimated_time;
                    }
                }
                ordersMap[row.order_id].items.push({ name: row.dish_name, qty: row.quantity });
            });
            
            resolve(Object.values(ordersMap));
        });
    });
}

function markOrderCompleted(orderId) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE orders SET order_status = 'Completed' WHERE order_id = ?`, [orderId], function(err) {
            if (err) return reject(err);
            resolve(this.changes);
        });
    });
}

module.exports = {
    getTables, getReservations, checkTableAvailability, createReservation, getMenuItems, verifyAdminPassword, createOrderTransaction, getKitchenOrders, markOrderCompleted
};