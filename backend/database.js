import { Database } from '@db/sqlite';

// Create or connect to the database file
const db = new Database("restaurant.db");

// 1. Use .exec() to create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS Ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    stock_kg REAL NOT NULL
  );
`);

// 2. Use .prepare().get() to check if the table is empty
const result = db.prepare("SELECT COUNT(*) as count FROM Ingredients").get();

if (result.count === 0) {
  // 3. Use .exec() to insert the data
  db.exec("INSERT INTO Ingredients (name, stock_kg) VALUES ('Flour', 50.0), ('Cheese', 5.5), ('Tomatoes', 12.0)");
  console.log("Dummy data inserted into Ingredients table.");
}

export { db };