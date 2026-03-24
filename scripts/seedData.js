// scripts/seedData.js
const db = require('../models/db');
const crypto = require('crypto');

console.log("🌱 Starting Massive Database Seeding...");

const hashPin = (pin) => crypto.createHash('sha256').update(pin).digest('hex');

db.get("SELECT count(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) {
        console.log("🌱 Users table empty. Creating 3 default roles...");
        
        const insertUser = `INSERT INTO users (full_name, username, role, password_hash, hourly_rate) VALUES (?, ?, ?, ?, ?)`;

        // Using Employee IDs (e.g., admin, waiter1, chef1) as the username
        db.run(insertUser, ['Majid', 'admin', 'admin', hashPin('1111'), 25.0]);
        db.run(insertUser, ['Salaam', 'waiter', 'waiter', hashPin('2222'), 15.0]);
        db.run(insertUser, ['Atif', 'chef', 'chef', hashPin('3333'), 18.0]);

        console.log("✅ 4 Users Created with Hashed PINs: Admin (1111), Waiter (2222), Chef (3333)");
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

db.serialize(() => {
    // 1. Seed Ingredients
    const insertIngredient = db.prepare(`INSERT INTO ingredients (ingredient_name, stock_level, unit, cost_per_unit, low_stock_threshold, stock_level_status, supplier) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    
    const ingredients = [
        ['Burger Bun', 500, 'pcs', 0.50, 50, 'OK', 'Bakery Co'],          // 1
        ['Beef Patty', 300, 'pcs', 2.00, 30, 'OK', 'Meat Palace'],        // 2
        ['Chicken Breast', 200, 'pcs', 1.50, 20, 'OK', 'Meat Palace'],    // 3
        ['Cheddar Cheese', 1000, 'pcs', 0.30, 100, 'OK', 'Dairy Farms'],  // 4
        ['Lettuce', 10000, 'g', 0.01, 1000, 'OK', 'Fresh Veg'],           // 5
        ['Tomato', 8000, 'g', 0.02, 500, 'OK', 'Fresh Veg'],              // 6
        ['Potatoes', 20000, 'g', 0.005, 2000, 'OK', 'Farm Corp'],         // 7
        ['Pizza Dough', 100, 'pcs', 1.00, 20, 'OK', 'Bakery Co'],         // 8
        ['Mozzarella', 5000, 'g', 0.05, 500, 'OK', 'Dairy Farms'],        // 9
        ['Pepperoni', 3000, 'g', 0.08, 300, 'OK', 'Meat Palace'],         // 10
        ['Spaghetti', 10000, 'g', 0.01, 1000, 'OK', 'Pasta Co'],          // 11
        ['Tomato Sauce', 10000, 'ml', 0.02, 1000, 'OK', 'Sauce Inc'],     // 12
        ['Cola Syrup', 10000, 'ml', 0.01, 1000, 'OK', 'Bev Inc'],         // 13
        ['Lemonade Syrup', 8000, 'ml', 0.015, 800, 'OK', 'Bev Inc'],      // 14
        ['Sparkling Water', 20000, 'ml', 0.002, 2000, 'OK', 'Bev Inc'],   // 15
        ['Vanilla Ice Cream', 10000, 'g', 0.04, 1000, 'OK', 'Dairy Farms'],// 16
        ['Chocolate Syrup', 5000, 'ml', 0.03, 500, 'OK', 'Sweet Treats'], // 17
        ['Brownie Square', 100, 'pcs', 1.00, 20, 'OK', 'Bakery Co'],      // 18
        ['Cheesecake Slice', 50, 'pcs', 1.50, 10, 'OK', 'Bakery Co'],     // 19
        ['Coffee Beans', 5000, 'g', 0.05, 500, 'OK', 'Roast Inc']         // 20
    ];

    ingredients.forEach(i => insertIngredient.run(i));
    insertIngredient.finalize();

    // 2. Seed Menu Items
    const insertMenu = db.prepare(`INSERT INTO menu_items (dish_name, category, selling_price, production_cost, estimated_time) VALUES (?, ?, ?, ?, ?)`);
    
    const menuItems = [
        ['Classic Cheeseburger', 'Mains', 12.99, 3.10, 15],       // 1
        ['Double Smash Burger', 'Mains', 16.99, 5.40, 18],        // 2
        ['Grilled Chicken Sandwich', 'Mains', 13.99, 2.80, 15],   // 3
        ['Pepperoni Pizza', 'Mains', 18.99, 4.30, 20],            // 4
        ['Spaghetti Bolognese', 'Mains', 14.99, 3.50, 15],        // 5
        ['French Fries', 'Mains', 4.99, 1.00, 10],                // 6
        ['Classic Cola', 'Drinks', 2.99, 0.50, 2],                // 7
        ['Fresh Lemonade', 'Drinks', 3.49, 0.75, 2],              // 8
        ['Sparkling Water', 'Drinks', 2.49, 0.20, 1],             // 9
        ['Vanilla Sundae', 'Desserts', 6.99, 2.00, 5],            // 10
        ['Chocolate Brownie', 'Desserts', 7.99, 2.50, 5],         // 11
        ['NY Cheesecake', 'Desserts', 8.99, 1.50, 2]              // 12
    ];

    menuItems.forEach(m => insertMenu.run(m));
    insertMenu.finalize();

    // 3. Seed Recipes (Linking them)
    const insertRecipe = db.prepare(`INSERT INTO recipes (item_id, ingredient_id, quantity) VALUES (?, ?, ?)`);
    
    const recipes = [
        // Classic Cheeseburger (Item 1)
        [1, 1, 1], [1, 2, 1], [1, 4, 1], [1, 5, 20], [1, 6, 30],
        
        // Double Smash Burger (Item 2)
        [2, 1, 1], [2, 2, 2], [2, 4, 2], [2, 5, 20],
        
        // Grilled Chicken Sandwich (Item 3)
        [3, 1, 1], [3, 3, 1], [3, 5, 30], [3, 6, 30],
        
        // Pepperoni Pizza (Item 4)
        [4, 8, 1], [4, 9, 200], [4, 10, 50], [4, 12, 100],
        
        // Spaghetti Bolognese (Item 5)
        [5, 11, 150], [5, 12, 100], [5, 2, 1], // Using patty meat as mince
        
        // French Fries (Item 6)
        [6, 7, 200],
        
        // Classic Cola (Item 7)
        [7, 13, 50], [7, 15, 250],
        
        // Fresh Lemonade (Item 8)
        [8, 14, 50], [8, 15, 250],
        
        // Sparkling Water (Item 9)
        [9, 15, 300],
        
        // Vanilla Sundae (Item 10)
        [10, 16, 150], [10, 17, 30],
        
        // Chocolate Brownie (Item 11)
        [11, 18, 1], [11, 16, 50], [11, 17, 20], // Brownie + Ice Cream + Syrup
        
        // NY Cheesecake (Item 12)
        [12, 19, 1]
    ];

    recipes.forEach(r => insertRecipe.run(r));
    insertRecipe.finalize();


    const seedOrders = [
        `INSERT INTO orders (order_status, created_at, total_amount, table_id, staff_id) VALUES ('Completed', datetime('now', '-2 hours'), 45.97, 1, 2)`,
        `INSERT INTO orders (order_status, created_at, total_amount, table_id, staff_id) VALUES ('Completed', datetime('now', '-1 hours'), 32.50, 2, 2)`,
        `INSERT INTO orders (order_status, created_at, total_amount, table_id, staff_id) VALUES ('Pending', datetime('now', '-30 minutes'), 18.99, 3, 2)`
    ];
    seedOrders.forEach(sql => db.run(sql));

    const seedOrderItems = [
        `INSERT INTO order_items (quantity, total_price, production_status, order_id, menu_item_id) VALUES (1, 12.99, 'Completed', 1, 1)`,
        `INSERT INTO order_items (quantity, total_price, production_status, order_id, menu_item_id) VALUES (2, 33.98, 'Completed', 1, 2)`,
        `INSERT INTO order_items (quantity, total_price, production_status, order_id, menu_item_id) VALUES (1, 18.99, 'In Progress', 3, 4)`
    ];
    seedOrderItems.forEach(sql => db.run(sql));

    console.log("✅ 20 Ingredients, 12 Menu Items, and 34 Recipes successfully seeded!");
    console.log("Press Ctrl+C to exit.");
});