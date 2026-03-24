const db = require('./db');

function getStaffStatus() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT u.user_id, u.full_name, u.role, t.timesheet_id, t.clock_in, t.clock_out
            FROM users u
            LEFT JOIN timesheets t ON u.user_id = t.staff_id 
                AND t.timesheet_id = (SELECT MAX(timesheet_id) FROM timesheets WHERE staff_id = u.user_id)
            ORDER BY u.role ASC, u.full_name ASC
        `;
        db.all(sql, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function processClockAction(username) {
    return new Promise((resolve, reject) => {
        db.get("SELECT user_id, full_name FROM users WHERE username = ?", [username], (err, user) => {
            if (err) return reject(err);
            if (!user) return reject(new Error("User not found"));

            db.get("SELECT timesheet_id, clock_in, clock_out FROM timesheets WHERE staff_id = ? ORDER BY timesheet_id DESC LIMIT 1", [user.user_id], (err, timesheet) => {
                if (err) return reject(err);

                if (timesheet && !timesheet.clock_out) {
                    db.run("UPDATE timesheets SET clock_out = CURRENT_TIMESTAMP WHERE timesheet_id = ?", [timesheet.timesheet_id], function(err) {
                        if (err) return reject(err);
                        resolve({ action: 'clocked_out', user: user.full_name });
                    });
                } else {
                    db.run("INSERT INTO timesheets (staff_id, clock_in) VALUES (?, CURRENT_TIMESTAMP)", [user.user_id], function(err) {
                        if (err) return reject(err);
                        resolve({ action: 'clocked_in', user: user.full_name });
                    });
                }
            });
        });
    });
}

function getDailyRevenue() {
    return new Promise((resolve) => {
        db.get("SELECT SUM(total_amount) as total FROM orders WHERE date(created_at) = date('now')", [], (err, row) => resolve(row?.total || 0));
    });
}

function getDailyCosts() {
    return new Promise((resolve) => {
        db.get(`SELECT SUM(oi.quantity * m.production_cost) as total FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN menu_items m ON oi.menu_item_id = m.item_id
                WHERE date(o.created_at) = date('now')`, [], (err, row) => resolve(row?.total || 0));
    });
}

function getBusiestHour() {
    return new Promise((resolve) => {
        db.get(`SELECT strftime('%H', created_at) as hour, COUNT(*) as count FROM orders 
                WHERE date(created_at) = date('now') GROUP BY hour ORDER BY count DESC LIMIT 1`, [], (err, row) => resolve(row?.hour || null));
    });
}

function getClockedInCount() {
    return new Promise((resolve) => {
        db.get("SELECT COUNT(DISTINCT staff_id) as count FROM timesheets WHERE clock_out IS NULL", [], (err, row) => resolve(row?.count || 0));
    });
}

function getHourlySalesDistribution() {
    return new Promise((resolve) => {
        db.all(`SELECT strftime('%H', created_at) as hour, SUM(total_amount) as revenue FROM orders 
                WHERE date(created_at) = date('now') GROUP BY hour ORDER BY hour ASC`, [], (err, rows) => resolve(rows || []));
    });
}

module.exports = {
    getStaffStatus, processClockAction, getDailyRevenue, getDailyCosts, getBusiestHour, getClockedInCount, getHourlySalesDistribution
};