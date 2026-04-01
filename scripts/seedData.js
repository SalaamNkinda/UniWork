// scripts/seedData.js
const db = require('../models/db');
const crypto = require('crypto');

console.log("🌱 Starting Massive Database Seeding...");

const hashPin = (pin) => crypto.createHash('sha256').update(pin).digest('hex');

db.get("SELECT count(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) {
        console.log("🌱 Users table empty. Creating 5 default roles...");
        
        const insertUser = `INSERT INTO users (full_name, username, role, password_hash, hourly_rate) VALUES (?, ?, ?, ?, ?)`;

        // Using Employee IDs (e.g., admin, waiter1, chef1) as the username
        db.run(insertUser, ['Salaam', 'admin', 'admin', hashPin('1111'), 25.0]);
        db.run(insertUser, ['Qais', 'waiter', 'waiter', hashPin('2222'), 15.0]);
        db.run(insertUser, ['Sharon', 'waiter2', 'waiter', hashPin('2123'), 15.0]);
        db.run(insertUser, ['aiden', 'chef2', 'chef', hashPin('3123'), 18.0]);
        db.run(insertUser, ['Atif', 'chef', 'chef', hashPin('3333'), 18.0]);

        console.log("✅ 5 Users Created with Hashed PINs: Admin (1111), Waiter (2222), Waiter2 (2123), Chef (3333), Chef2 (3123)");
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
    const getOffsetDate = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };
    
    // 1. Seed Ingredients (Expanded to 38 Ingredients)
    const ingredients = [
        /* 1 */  ['Burger Bun', 500, 'pcs', 0.50, 50, 'OK', 'Bakery Co', getOffsetDate(3)],          
        /* 2 */  ['Beef Patty', 300, 'pcs', 2.00, 30, 'OK', 'Meat Palace', getOffsetDate(5)],        
        /* 3 */  ['Chicken Breast', 200, 'pcs', 1.50, 20, 'OK', 'Meat Palace', getOffsetDate(4)],    
        /* 4 */  ['Cheddar Cheese', 1000, 'pcs', 0.30, 100, 'OK', 'Dairy Farms', getOffsetDate(14)], 
        /* 5 */  ['Lettuce', 10000, 'g', 0.01, 1000, 'OK', 'Fresh Veg', getOffsetDate(-1)],          
        /* 6 */  ['Tomato', 8000, 'g', 0.02, 500, 'OK', 'Fresh Veg', getOffsetDate(2)],              
        /* 7 */  ['Potatoes', 20000, 'g', 0.005, 2000, 'OK', 'Farm Corp', getOffsetDate(30)],        
        /* 8 */  ['Pizza Dough', 100, 'pcs', 1.00, 20, 'OK', 'Bakery Co', getOffsetDate(4)],         
        /* 9 */  ['Mozzarella', 5000, 'g', 0.05, 500, 'OK', 'Dairy Farms', getOffsetDate(20)],       
        /* 10 */ ['Pepperoni', 3000, 'g', 0.08, 300, 'OK', 'Meat Palace', getOffsetDate(45)],        
        /* 11 */ ['Spaghetti', 10000, 'g', 0.01, 1000, 'OK', 'Pasta Co', getOffsetDate(365)],        
        /* 12 */ ['Tomato Sauce', 10000, 'ml', 0.02, 1000, 'OK', 'Sauce Inc', getOffsetDate(180)],   
        /* 13 */ ['Cola Syrup', 10000, 'ml', 0.01, 1000, 'OK', 'Bev Inc', getOffsetDate(365)],       
        /* 14 */ ['Lemonade Syrup', 8000, 'ml', 0.015, 800, 'OK', 'Bev Inc', getOffsetDate(180)],    
        /* 15 */ ['Sparkling Water', 20000, 'ml', 0.002, 2000, 'OK', 'Bev Inc', null],               
        /* 16 */ ['Vanilla Ice Cream', 10000, 'g', 0.04, 1000, 'OK', 'Dairy Farms', getOffsetDate(60)],
        /* 17 */ ['Chocolate Syrup', 5000, 'ml', 0.03, 500, 'OK', 'Sweet Treats', getOffsetDate(365)], 
        /* 18 */ ['Brownie Square', 100, 'pcs', 1.00, 20, 'OK', 'Bakery Co', getOffsetDate(-3)],     
        /* 19 */ ['Cheesecake Slice', 50, 'pcs', 1.50, 10, 'OK', 'Bakery Co', getOffsetDate(1)],     
        /* 20 */ ['Coffee Beans', 5000, 'g', 0.05, 500, 'OK', 'Roast Inc', getOffsetDate(90)],
        /* 21 */ ['Bacon', 4000, 'g', 0.10, 400, 'OK', 'Meat Palace', getOffsetDate(14)],
        /* 22 */ ['Red Onions', 5000, 'g', 0.01, 500, 'OK', 'Fresh Veg', getOffsetDate(10)],
        /* 23 */ ['Mushrooms', 3000, 'g', 0.03, 300, 'OK', 'Fresh Veg', getOffsetDate(4)],
        /* 24 */ ['Jalapenos', 2000, 'g', 0.02, 200, 'OK', 'Fresh Veg', getOffsetDate(20)],
        /* 25 */ ['BBQ Sauce', 5000, 'ml', 0.02, 500, 'OK', 'Sauce Inc', getOffsetDate(180)],
        /* 26 */ ['Mayonnaise', 4000, 'ml', 0.03, 400, 'OK', 'Sauce Inc', getOffsetDate(90)],
        /* 27 */ ['Hot Dog Bun', 200, 'pcs', 0.40, 20, 'OK', 'Bakery Co', getOffsetDate(3)],
        /* 28 */ ['Beef Sausage', 200, 'pcs', 1.20, 20, 'OK', 'Meat Palace', getOffsetDate(7)],
        /* 29 */ ['Tortilla Wrap', 300, 'pcs', 0.30, 30, 'OK', 'Bakery Co', getOffsetDate(14)],
        /* 30 */ ['Avocado', 100, 'pcs', 1.50, 10, 'OK', 'Fresh Veg', getOffsetDate(3)],
        /* 31 */ ['Salmon Fillet', 100, 'pcs', 4.00, 10, 'OK', 'Ocean Catch', getOffsetDate(2)],
        /* 32 */ ['White Rice', 20000, 'g', 0.005, 2000, 'OK', 'Farm Corp', getOffsetDate(365)],
        /* 33 */ ['Soy Sauce', 3000, 'ml', 0.02, 300, 'OK', 'Sauce Inc', getOffsetDate(365)],
        /* 34 */ ['Eggs', 500, 'pcs', 0.20, 50, 'OK', 'Dairy Farms', getOffsetDate(14)],
        /* 35 */ ['Orange Juice', 10000, 'ml', 0.015, 1000, 'OK', 'Bev Inc', getOffsetDate(10)],
        /* 36 */ ['Draft Beer Keg', 50000, 'ml', 0.005, 5000, 'OK', 'Brew Co', getOffsetDate(60)],
        /* 37 */ ['Red Wine', 20000, 'ml', 0.01, 2000, 'OK', 'Vineyard Co', getOffsetDate(365)],
        /* 38 */ ['Milk', 10000, 'ml', 0.01, 1000, 'OK', 'Dairy Farms', getOffsetDate(7)]
    ];

    db.serialize(() => {
        const insertIngredient = db.prepare(`INSERT INTO ingredients (ingredient_name, stock_level, unit, cost_per_unit, low_stock_threshold, stock_level_status, supplier) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        const insertBatch = db.prepare(`INSERT INTO ingredient_batches (ingredient_id, quantity, expiry_date) VALUES (?, ?, ?)`);

        ingredients.forEach((item) => {
            insertIngredient.run([item[0], item[1], item[2], item[3], item[4], item[5], item[6]], function(err) {
                if (err) return console.error("Error inserting ingredient:", err.message);
                
                const newIngredientId = this.lastID;
                const quantity = item[1];
                const expiryDate = item[7];

                insertBatch.run([newIngredientId, quantity, expiryDate], function(err) {
                    if (err) console.error("Error inserting batch:", err.message);
                });
            });
        });

        setTimeout(() => {
            insertIngredient.finalize();
            insertBatch.finalize();
        }, 1000);
    });

    // 2. Seed Menu Items (Expanded to 27 Items)
    const insertMenu = db.prepare(`INSERT INTO menu_items (dish_name, category, selling_price, production_cost, estimated_time) VALUES (?, ?, ?, ?, ?)`);
    
    const menuItems = [
        ['Classic Cheeseburger', 'Mains', 12.99, 3.10, 15],       // 1
        ['Double Smash Burger', 'Mains', 16.99, 5.40, 18],        // 2
        ['Grilled Chicken Sandwich', 'Mains', 13.99, 2.80, 15],   // 3
        ['Pepperoni Pizza', 'Mains', 18.99, 4.30, 20],            // 4
        ['Spaghetti Bolognese', 'Mains', 14.99, 3.50, 15],        // 5
        ['French Fries', 'Sides', 4.99, 1.00, 10],                // 6
        ['Classic Cola', 'Drinks', 2.99, 0.50, 2],                // 7
        ['Fresh Lemonade', 'Drinks', 3.49, 0.75, 2],              // 8
        ['Sparkling Water', 'Drinks', 2.49, 0.20, 1],             // 9
        ['Vanilla Sundae', 'Desserts', 6.99, 2.00, 5],            // 10
        ['Chocolate Brownie', 'Desserts', 7.99, 2.50, 5],         // 11
        ['NY Cheesecake', 'Desserts', 8.99, 1.50, 2],             // 12
        ['Bacon BBQ Burger', 'Mains', 15.99, 4.50, 15],           // 13
        ['Mushroom Swiss Burger', 'Mains', 14.99, 4.00, 15],      // 14
        ['Spicy Chicken Wrap', 'Mains', 12.99, 3.20, 10],         // 15
        ['Classic Hot Dog', 'Mains', 8.99, 2.00, 10],             // 16
        ['Grilled Salmon Bowl', 'Mains', 22.99, 7.50, 20],        // 17
        ['Veggie Supreme Pizza', 'Mains', 17.99, 3.80, 20],       // 18
        ['Loaded Cheese Fries', 'Sides', 8.99, 2.50, 10],         // 19
        ['Crispy Onion Rings', 'Sides', 6.99, 1.50, 10],          // 20
        ['Chicken Caesar Salad', 'Mains', 13.99, 3.00, 10],       // 21
        ['Fresh Orange Juice', 'Drinks', 4.99, 1.20, 2],          // 22
        ['Draft Beer (Pint)', 'Drinks', 6.00, 1.50, 2],           // 23
        ['Glass of Red Wine', 'Drinks', 8.00, 2.00, 2],           // 24
        ['Iced Latte', 'Drinks', 4.50, 1.00, 3],                  // 25
        ['Avocado Toast', 'Mains', 10.99, 2.80, 10],              // 26
        ['Chicken Fried Rice', 'Mains', 14.99, 3.50, 15]          // 27
    ];

    menuItems.forEach(m => insertMenu.run(m));
    insertMenu.finalize();

    // 3. Seed Recipes (Linking them all together)
    const insertRecipe = db.prepare(`INSERT INTO recipes (item_id, ingredient_id, quantity) VALUES (?, ?, ?)`);
    
    const recipes = [
        // 1: Classic Cheeseburger
        [1, 1, 1], [1, 2, 1], [1, 4, 1], [1, 5, 20], [1, 6, 30],
        // 2: Double Smash Burger
        [2, 1, 1], [2, 2, 2], [2, 4, 2], [2, 5, 20],
        // 3: Grilled Chicken Sandwich
        [3, 1, 1], [3, 3, 1], [3, 5, 30], [3, 6, 30],
        // 4: Pepperoni Pizza
        [4, 8, 1], [4, 9, 200], [4, 10, 50], [4, 12, 100],
        // 5: Spaghetti Bolognese (Patty meat used as mince)
        [5, 11, 150], [5, 12, 100], [5, 2, 1], 
        // 6: French Fries
        [6, 7, 200],
        // 7: Classic Cola
        [7, 13, 50], [7, 15, 250],
        // 8: Fresh Lemonade
        [8, 14, 50], [8, 15, 250],
        // 9: Sparkling Water
        [9, 15, 300],
        // 10: Vanilla Sundae
        [10, 16, 150], [10, 17, 30],
        // 11: Chocolate Brownie
        [11, 18, 1], [11, 16, 50], [11, 17, 20], 
        // 12: NY Cheesecake
        [12, 19, 1],
        
        // --- NEW ITEMS RECIPES ---
        
        // 13: Bacon BBQ Burger
        [13, 1, 1], [13, 2, 1], [13, 4, 1], [13, 21, 50], [13, 25, 30],
        // 14: Mushroom Swiss Burger (Using Cheddar as proxy for Swiss to save an ingredient)
        [14, 1, 1], [14, 2, 1], [14, 4, 1], [14, 23, 50], [14, 26, 20],
        // 15: Spicy Chicken Wrap
        [15, 29, 1], [15, 3, 1], [15, 24, 20], [15, 5, 30], [15, 26, 20],
        // 16: Classic Hot Dog
        [16, 27, 1], [16, 28, 1], [16, 22, 20],
        // 17: Grilled Salmon Bowl
        [17, 31, 1], [17, 32, 200], [17, 33, 20], [17, 30, 0.5],
        // 18: Veggie Supreme Pizza
        [18, 8, 1], [18, 9, 150], [18, 12, 100], [18, 22, 30], [18, 23, 30],
        // 19: Loaded Cheese Fries
        [19, 7, 250], [19, 4, 2], [19, 21, 50], [19, 24, 20],
        // 20: Crispy Onion Rings (Using dough as a proxy for batter)
        [20, 22, 150], [20, 8, 0.2],
        // 21: Chicken Caesar Salad
        [21, 5, 150], [21, 3, 1], [21, 26, 30],
        // 22: Fresh Orange Juice
        [22, 35, 300],
        // 23: Draft Beer (Pint)
        [23, 36, 500],
        // 24: Glass of Red Wine
        [24, 37, 150],
        // 25: Iced Latte
        [25, 20, 30], [25, 38, 200],
        // 26: Avocado Toast
        [26, 1, 1], [26, 30, 1], [26, 34, 2],
        // 27: Chicken Fried Rice
        [27, 32, 200], [27, 34, 2], [27, 33, 30], [27, 3, 0.5]
    ];

    recipes.forEach(r => insertRecipe.run(r));
    insertRecipe.finalize();

    console.log("✅ 38 Ingredients, 27 Menu Items, and 91 Recipe Links successfully seeded!");
    console.log("Press Ctrl+C to exit.");
});