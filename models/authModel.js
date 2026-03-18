const db = require('./db');

function verifyLogin(username, hashedPin) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM users WHERE (username = ? OR role = ?) AND password_hash = ?`;
        
        db.get(sql, [username, username, hashedPin], (err, row) => {
            if (err) return reject(err);
            resolve(row); 
        });
    });
}

module.exports = {
    verifyLogin
};