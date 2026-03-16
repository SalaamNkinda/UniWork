// scripts/deleteData.js
const db = require('../models/db');

console.log("🗑️ Starting Database Cleanup...");

db.serialize(() => {
    // 1. Delete all transactional data (Orders, Logs)
    db.run(`DELETE FROM order_items`);
    db.run(`DELETE FROM orders`);
    db.run(`DELETE FROM wastage_log`);
    db.run(`DELETE FROM timesheets`);
    
    // 2. Delete inventory & menu data
    db.run(`DELETE FROM recipes`);
    db.run(`DELETE FROM menu_items`);
    db.run(`DELETE FROM ingredients`);

    // 3. Reset auto-increment counters (sqlite_sequence)
    const tablesToReset = ['order_items', 'orders', 'wastage_log', 'timesheets', 'recipes', 'menu_items', 'ingredients'];
    tablesToReset.forEach(table => {
        db.run(`UPDATE sqlite_sequence SET seq = 0 WHERE name = '${table}'`, (err) => {
            if (err) console.error(`Failed to reset sequence for ${table}`);
        });
    });

    // 4. Reset Floor Plan Tables back to Empty
    db.run(`UPDATE tables SET table_status = 'Empty'`);

    console.log("✅ All Inventory, Menus, and Orders have been deleted.");
    console.log("✅ Auto-increment counters reset to 0.");
    console.log("Press Ctrl+C to exit.");
});