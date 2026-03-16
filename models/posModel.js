const db = require('./db');

function getTables() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM tables", [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function getReservations() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT r.*, t.table_number 
            FROM reservations r 
            JOIN tables t ON r.table_id = t.table_id
            WHERE date(r.reservation_time) = date('now')
            ORDER BY r.reservation_time ASC
        `, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
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

function verifyAdminPin(pin) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE pin_code = ? AND role = 'admin'", [pin], (err, row) => {
            if (err) return reject(err);
            resolve(!!row);
        });
    });
}

function createOrderTransaction(tableId, staffId, cartItems) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            const itemIds = cartItems.map(i => i.item_id).join(',');
            
            db.all(`SELECT item_id, selling_price FROM menu_items WHERE item_id IN (${itemIds})`, [], (err, menuItems) => {
                if (err) { db.run('ROLLBACK'); return reject(err); }

                const priceMap = {};
                menuItems.forEach(m => priceMap[m.item_id] = m.selling_price);

                // Re-calculate the actual total amount mathematically on the backend
                let totalAmount = cartItems.reduce((sum, item) => {
                    const realPrice = priceMap[item.item_id] || 0;
                    return sum + (realPrice * item.quantity);
                }, 0);

                // 1. Insert Order
                db.run(`INSERT INTO orders (order_status, total_amount, table_id, staff_id) VALUES ('Pending', ?, ?, ?)`, 
                [totalAmount, tableId, staffId], function(err) {
                    if (err) { db.run('ROLLBACK'); return reject(err); }
                    const orderId = this.lastID;

                    // 2. Update Table Status
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
        // Fetch estimated_time dynamically from DB
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
                        max_time: row.estimated_time || 20, // Default to 20 if missing
                        items: []
                    };
                } else {
                    // Update the max preparation time for the order container
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
    getTables, getReservations, createReservation, getMenuItems, verifyAdminPin, createOrderTransaction, getKitchenOrders, markOrderCompleted
};