const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto'); // <-- Added for hashing

// Connect to database
const dbPath = path.resolve(__dirname, '../restaurant.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database.');
    }
});

// Create Tables
db.serialize(() => {
    // Enable Foreign Keys
    db.run("PRAGMA foreign_keys = ON");

    //USERS
    db.run(`CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT,
        username TEXT UNIQUE,
        role TEXT, 
        password_hash TEXT,
        pin_code TEXT,
        hourly_rate REAL
    )`);

    //INGREDIENTS
    db.run(`CREATE TABLE IF NOT EXISTS ingredients (
        ingredient_id INTEGER PRIMARY KEY AUTOINCREMENT,
        ingredient_name TEXT,
        stock_level REAL,
        unit TEXT, 
        cost_per_unit REAL,
        low_stock_threshold REAL,
        stock_level_status TEXT,
        supplier TEXT
    )`);

    //MENU_ITEMS
    db.run(`CREATE TABLE IF NOT EXISTS menu_items (
        item_id INTEGER PRIMARY KEY AUTOINCREMENT,
        dish_name TEXT,
        category TEXT,
        selling_price REAL,
        production_cost REAL,
        estimated_time INTEGER
    )`);

    //RECIPES
    db.run(`CREATE TABLE IF NOT EXISTS recipes (
        recipe_id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER,
        ingredient_id INTEGER,
        quantity REAL,
        FOREIGN KEY(item_id) REFERENCES menu_items(item_id) ON DELETE CASCADE,
        FOREIGN KEY(ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE
    )`);

    //TABLES
    db.run(`CREATE TABLE IF NOT EXISTS tables (
        table_id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number TEXT,
        table_status TEXT
    )`);

    //ORDERS
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        order_id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_amount REAL,
        table_id INTEGER,
        staff_id INTEGER,
        FOREIGN KEY(table_id) REFERENCES tables(table_id),
        FOREIGN KEY(staff_id) REFERENCES users(user_id)
    )`);

    //ORDER_ITEMS
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
        quantity INTEGER,
        special_notes TEXT,
        total_price REAL,
        production_status TEXT,
        order_id INTEGER,
        menu_item_id INTEGER,
        FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
        FOREIGN KEY(menu_item_id) REFERENCES menu_items(item_id)
    )`);

    //TIMESHEETS
    db.run(`CREATE TABLE IF NOT EXISTS timesheets (
        timesheet_id INTEGER PRIMARY KEY AUTOINCREMENT,
        clock_in DATETIME,
        clock_out DATETIME,
        staff_id INTEGER,
        FOREIGN KEY(staff_id) REFERENCES users(user_id)
    )`);

    //WASTAGE_LOG
    db.run(`CREATE TABLE IF NOT EXISTS wastage_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        quantity_wasted REAL,
        reason TEXT,
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ingredient_id INTEGER,
        FOREIGN KEY(ingredient_id) REFERENCES ingredients(ingredient_id)
    )`);

    //RESERVATIONS 
    db.run(`CREATE TABLE IF NOT EXISTS reservations (
        reservation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        reservation_time DATETIME,
        guests INTEGER,
        table_id INTEGER,
        FOREIGN KEY(table_id) REFERENCES tables(table_id)
    )`);
    
    console.log("✅ Tables created (or verified). Database is clean.");
});

const hashPin = (pin) => crypto.createHash('sha256').update(pin).digest('hex');

// seeding the necessary data for starting
db.get("SELECT count(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) {
        console.log("🌱 Users table empty. Creating 3 default roles...");
        
        const insertUser = `INSERT INTO users (full_name, username, role, pin_code, password_hash, hourly_rate) VALUES (?, ?, ?, ?, ?, ?)`;

        // 1. Admin - PIN 1111
        db.run(insertUser, ['Admin', 'admin one', 'admin', '1111', hashPin('1111'), 25.0]);
        
        // 2. Waiter - PIN 2222
        db.run(insertUser, ['Waiter', 'waiter one ', 'waiter', '2222', hashPin('2222'), 15.0]);
        
        // 3. Chef - PIN 3333
        db.run(insertUser, ['Chef', 'chef one', 'chef', '3333', hashPin('3333'), 18.0]);

        console.log("✅ 3 Users Created with Hashed PINs: Admin (1111), Waiter (2222), Chef (3333)");
    } else {
        console.log("✅ Database ready (Users already exist).");
    }
});

db.get("SELECT count(*) as count FROM tables", (err, row) => {
    if (row && row.count === 0) {
        console.log("🌱 Tables table empty. Creating 6 default tables...");
        
        const insertTable = `INSERT INTO tables (table_number, table_status) VALUES (?, ?)`;

        for (let i = 1; i <= 6; i++) {
            db.run(insertTable, [`Table ${i}`, 'Empty']);
        }

        console.log("✅ 6 Default Tables Created (All set to 'Empty').");
    } else {
        console.log("✅ Database ready (Tables already exist).");
    }
});

module.exports = db;