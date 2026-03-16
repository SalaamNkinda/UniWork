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
            ORDER BY r.reservation_time ASC
        `, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
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
            resolve(!!row); // Returns true if admin found, false otherwise
        });
    });
}

// Complex Transaction: Creates Order, Order Items, Updates Table, and Auto-Deducts Ingredients
function createOrderTransaction(tableId, staffId, cartItems) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            let totalAmount = cartItems.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);

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
                        const itemTotal = item.selling_price * item.quantity;
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
}

function getKitchenOrders() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT o.order_id, o.created_at, t.table_number, m.dish_name, oi.quantity 
            FROM orders o
            JOIN tables t ON o.table_id = t.table_id
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN menu_items m ON oi.menu_item_id = m.item_id
            WHERE o.order_status = 'Pending'
            ORDER BY o.created_at ASC
        `;
        db.all(sql, [], (err, rows) => {
            if (err) return reject(err);
            
            // Group items by order_id in JavaScript
            const ordersMap = {};
            rows.forEach(row => {
                if (!ordersMap[row.order_id]) {
                    ordersMap[row.order_id] = {
                        order_id: row.order_id,
                        table_number: row.table_number,
                        created_at: row.created_at,
                        items: []
                    };
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
            // Also free up the table
            db.run(`UPDATE tables SET table_status = 'Empty' WHERE table_id = (SELECT table_id FROM orders WHERE order_id = ?)`, [orderId], () => {
                resolve(this.changes);
            });
        });
    });
}

module.exports = {
    getTables, getReservations, getMenuItems, verifyAdminPin, createOrderTransaction, getKitchenOrders, markOrderCompleted
};