const db = require('./db');

function getStaffStatus() {
    return new Promise((resolve, reject) => {
        // Gets every user and their most recent timesheet entry
        const sql = `
            SELECT 
                u.user_id, 
                u.full_name, 
                u.role,
                t.timesheet_id, 
                t.clock_in, 
                t.clock_out
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

function processClockAction(pin) {
    return new Promise((resolve, reject) => {
        // 1. Find the user by PIN
        db.get("SELECT user_id, full_name FROM users WHERE pin_code = ?", [pin], (err, user) => {
            if (err) return reject(err);
            if (!user) return reject(new Error("Invalid PIN"));

            // 2. Check their latest timesheet
            db.get("SELECT timesheet_id, clock_in, clock_out FROM timesheets WHERE staff_id = ? ORDER BY timesheet_id DESC LIMIT 1", [user.user_id], (err, timesheet) => {
                if (err) return reject(err);

                if (timesheet && !timesheet.clock_out) {
                    // Currently clocked in -> Clock out
                    db.run("UPDATE timesheets SET clock_out = CURRENT_TIMESTAMP WHERE timesheet_id = ?", [timesheet.timesheet_id], function(err) {
                        if (err) return reject(err);
                        resolve({ action: 'clocked_out', user: user.full_name });
                    });
                } else {
                    // Currently clocked out (or no timesheet ever) -> Clock in
                    db.run("INSERT INTO timesheets (staff_id, clock_in) VALUES (?, CURRENT_TIMESTAMP)", [user.user_id], function(err) {
                        if (err) return reject(err);
                        resolve({ action: 'clocked_in', user: user.full_name });
                    });
                }
            });
        });
    });
}

module.exports = {
    getStaffStatus,
    processClockAction
};