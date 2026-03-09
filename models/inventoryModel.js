/**
 * inventoryModel.js
 * Handles all database queries for Atif's "Inventory & Menu Manager"
 * Covers: Ingredients, Menu Items, Recipes, and Wastage Logging
 *
 * Schema source: models/db.js
 * Tables used:
 *   - ingredients       (ingredient_id, ingredient_name, stock_level, unit, cost_per_unit, low_stock_threshold, stock_level_status, supplier)
 *   - menu_items        (item_id, dish_name, category, selling_price, production_cost, estimated_time)
 *   - recipes           (recipe_id, item_id FK, ingredient_id FK, quantity)
 *   - wastage_log       (log_id, quantity_wasted, reason, logged_at, ingredient_id FK)
 */

const db = require('../models/db');

// SECTION 1: INGREDIENT CRUD

/**
 * Fetches all ingredients from the database.
 * Used to populate the Ingredients Page list.
 * @returns {Promise<Array>} Array of all ingredient rows
 */
function getAllIngredients() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        ingredient_id,
        ingredient_name,
        stock_level,
        unit,
        cost_per_unit,
        low_stock_threshold,
        stock_level_status,
        supplier
      FROM ingredients
      ORDER BY ingredient_name ASC
    `;
    db.all(sql, [], (err, rows) => {
      if (err) return reject(new Error(`getAllIngredients failed: ${err.message}`));
      resolve(rows);
    });
  });
}

/**
 * Inserts a new raw ingredient into the Ingredients table.
 * Also sets Stock_level_status based on the provided thresholds.
 * @param {Object} data - Ingredient fields
 * @param {string} data.Ingredient_name
 * @param {number} data.Stock_level
 * @param {string} data.Unit            - e.g. 'grams', 'litres', 'units'
 * @param {number} data.Cost_per_unit
 * @param {number} data.Low_stock_threshold
 * @param {string} data.Supplier
 * @returns {Promise<Object>} The newly created ingredient's ID
 */
function addIngredient(data) {
  return new Promise((resolve, reject) => {
    const {
      ingredient_name,
      stock_level,
      unit,
      cost_per_unit,
      low_stock_threshold,
      supplier,
    } = data;

    // Derive initial stock status
    const stock_level_status = stock_level <= low_stock_threshold ? 'LOW' : 'OK';

    const sql = `
      INSERT INTO ingredients
        (ingredient_name, stock_level, unit, cost_per_unit, low_stock_threshold, stock_level_status, supplier)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      ingredient_name,
      stock_level,
      unit,
      cost_per_unit,
      low_stock_threshold,
      stock_level_status,
      supplier,
    ];

    db.run(sql, params, function (err) {
      if (err) return reject(new Error(`addIngredient failed: ${err.message}`));
      resolve({ ingredient_id: this.lastID, message: 'Ingredient added successfully.' });
    });
  });
}

/**
 * Updates an existing ingredient's details (price, supplier, stock, etc.).
 * Re-evaluates Stock_level_status after the update.
 * @param {number} id   - ingredient_id of the row to update
 * @param {Object} data - Fields to update (same shape as addIngredient)
 * @returns {Promise<Object>} Confirmation of rows changed
 */
function updateIngredient(id, data) {
  return new Promise((resolve, reject) => {
    const {
      ingredient_name,
      stock_level,
      unit,
      cost_per_unit,
      low_stock_threshold,
      supplier,
    } = data;

    const stock_level_status = stock_level <= low_stock_threshold ? 'LOW' : 'OK';

    const sql = `
      UPDATE ingredients
      SET
        ingredient_name     = ?,
        stock_level         = ?,
        unit                = ?,
        cost_per_unit       = ?,
        low_stock_threshold = ?,
        stock_level_status  = ?,
        supplier            = ?
      WHERE ingredient_id = ?
    `;
    const params = [
      ingredient_name,
      stock_level,
      unit,
      cost_per_unit,
      low_stock_threshold,
      stock_level_status,
      supplier,
      id,
    ];

    db.run(sql, params, function (err) {
      if (err) return reject(new Error(`updateIngredient failed: ${err.message}`));
      if (this.changes === 0) return reject(new Error(`Ingredient with ID ${id} not found.`));
      resolve({ changes: this.changes, message: 'Ingredient updated successfully.' });
    });
  });
}

/**
 * Deletes an ingredient by its primary key.
 * Note: Ensure no active Recipes reference this ingredient before calling.
 * @param {number} id - ingredient_id to remove
 * @returns {Promise<Object>} Confirmation of deletion
 */
function deleteIngredient(id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM ingredients WHERE ingredient_id = ?`;

    db.run(sql, [id], function (err) {
      if (err) return reject(new Error(`deleteIngredient failed: ${err.message}`));
      if (this.changes === 0) return reject(new Error(`Ingredient with ID ${id} not found.`));
      resolve({ changes: this.changes, message: 'Ingredient deleted successfully.' });
    });
  });
}

// SECTION 2: LOW STOCK LOGIC

/**
 * Returns all ingredients where Stock_level has fallen at or below
 * the Low_stock_threshold — used to populate the red-row alerts on the UI.
 * @returns {Promise<Array>} Array of low-stock ingredient rows
 */
function getLowStockItems() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        ingredient_id,
        ingredient_name,
        stock_level,
        unit,
        low_stock_threshold,
        supplier
      FROM ingredients
      WHERE stock_level <= low_stock_threshold
      ORDER BY stock_level ASC
    `;
    db.all(sql, [], (err, rows) => {
      if (err) return reject(new Error(`getLowStockItems failed: ${err.message}`));
      resolve(rows);
    });
  });
}

// SECTION 3: RECIPE & MENU MANAGEMENT

/**
 * Creates a menu item and links it to its ingredients in a single
 * atomic transaction. If any step fails, the entire operation is
 * rolled back to keep data consistent.
 *
 * @param {Object} itemData - Menu item fields
 * @param {string} itemData.dish_name        - Display name, e.g. "Margherita Pizza"
 * @param {string} itemData.category         - e.g. "Pizza", "Drinks"
 * @param {number} itemData.selling_price    - Price shown to customers
 * @param {number} itemData.estimated_time   - Prep time in minutes
 *
 * @param {Array<Object>} recipeIngredients  - Ingredient links for the Recipes table
 * @param {number} recipeIngredients[].ingredient_id
 * @param {number} recipeIngredients[].quantity  - Amount used per dish (in the ingredient's Unit)
 *
 * @returns {Promise<Object>} The new item_id and a success message
 */
function createMenuItem(itemData, recipeIngredients) {
  return new Promise((resolve, reject) => {
    const { dish_name, category, selling_price, estimated_time } = itemData;

    // Step 1: Start the transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) return reject(new Error(`Transaction BEGIN failed: ${err.message}`));
      });

      // Step 2: Insert into menu_items (production_cost calculated after and written back)
      const insertItemSql = `
        INSERT INTO menu_items (dish_name, category, selling_price, production_cost, estimated_time)
        VALUES (?, ?, ?, 0, ?)
      `;
      db.run(insertItemSql, [dish_name, category, selling_price, estimated_time], function (err) {
        if (err) {
          db.run('ROLLBACK');
          return reject(new Error(`createMenuItem (insert item) failed: ${err.message}`));
        }

        const newItemId = this.lastID;

        // Step 3: Insert each ingredient link into recipes
        const insertRecipeSql = `
          INSERT INTO recipes (item_id, ingredient_id, quantity)
          VALUES (?, ?, ?)
        `;
        const stmt = db.prepare(insertRecipeSql);
        let insertError = null;

        for (const ingredient of recipeIngredients) {
          stmt.run([newItemId, ingredient.ingredient_id, ingredient.quantity], (err) => {
            if (err) insertError = err;
          });
        }

        stmt.finalize((err) => {
          if (err || insertError) {
            db.run('ROLLBACK');
            return reject(
              new Error(`createMenuItem (insert recipes) failed: ${(err || insertError).message}`)
            );
          }

          // Step 4: Calculate & store the real Production_cost
          calculateProductionCost(newItemId)
            .then((cost) => {
              const updateCostSql = `UPDATE menu_items SET production_cost = ? WHERE item_id = ?`;
              db.run(updateCostSql, [cost, newItemId], (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(
                    new Error(`createMenuItem (update cost) failed: ${err.message}`)
                  );
                }

                // Step 5: All good — commit the transaction
                db.run('COMMIT', (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(new Error(`Transaction COMMIT failed: ${err.message}`));
                  }
                  resolve({
                    item_id: newItemId,
                    production_cost: cost,
                    message: 'Menu item and recipe created successfully.',
                  });
                });
              });
            })
            .catch((costErr) => {
              db.run('ROLLBACK');
              reject(new Error(`createMenuItem (cost calculation) failed: ${costErr.message}`));
            });
        });
      });
    });
  });
}

/**
 * Calculates the total ingredient cost for a menu item by joining
 * Recipes with Ingredients and summing (quantity * Cost_per_unit).
 * Used for the auto-costing feature on the Recipe Builder page.
 *
 * @param {number} menuItemId - The Item_id from Menu_items
 * @returns {Promise<number>} The computed production cost (rounded to 2 dp)
 */
function calculateProductionCost(menuItemId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        SUM(r.quantity * i.cost_per_unit) AS total_cost
      FROM recipes r
      JOIN ingredients i ON r.ingredient_id = i.ingredient_id
      WHERE r.item_id = ?
    `;
    db.get(sql, [menuItemId], (err, row) => {
      if (err) return reject(new Error(`calculateProductionCost failed: ${err.message}`));
      // SUM returns NULL if no recipe rows exist; default to 0
      const cost = row && row.total_cost !== null ? parseFloat(row.total_cost.toFixed(2)) : 0;
      resolve(cost);
    });
  });
}

// SECTION 4: WASTAGE HANDLING

/**
 * Logs a wastage event and decrements the ingredient's Stock_level
 * in a single atomic transaction. Also re-evaluates Stock_level_status.
 *
 * @param {number} ingredientId   - The ingredient_id affected
 * @param {number} quantity       - Amount wasted (in the ingredient's Unit)
 * @param {string} reason         - Human-readable reason (e.g. "Dropped", "Spoiled")
 * @returns {Promise<Object>}     - The new log_id and updated stock level
 */
function logWastage(ingredientId, quantity, reason) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) return reject(new Error(`Wastage transaction BEGIN failed: ${err.message}`));
      });

      // Step 1: Insert into wastage_log (logged_at has DEFAULT CURRENT_TIMESTAMP in db.js)
      const insertWastageSql = `
        INSERT INTO wastage_log (ingredient_id, quantity_wasted, reason)
        VALUES (?, ?, ?)
      `;
      db.run(insertWastageSql, [ingredientId, quantity, reason], function (err) {
        if (err) {
          db.run('ROLLBACK');
          return reject(new Error(`logWastage (insert log) failed: ${err.message}`));
        }

        const newLogId = this.lastID;

        // Step 2: Decrement stock_level (floor at 0 to avoid negative stock)
        const updateStockSql = `
          UPDATE ingredients
          SET
            stock_level        = MAX(0, stock_level - ?),
            stock_level_status = CASE
                                   WHEN MAX(0, stock_level - ?) <= low_stock_threshold
                                   THEN 'LOW'
                                   ELSE 'OK'
                                 END
          WHERE ingredient_id = ?
        `;
        db.run(updateStockSql, [quantity, quantity, ingredientId], function (err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(new Error(`logWastage (update stock) failed: ${err.message}`));
          }
          if (this.changes === 0) {
            db.run('ROLLBACK');
            return reject(new Error(`Ingredient with ID ${ingredientId} not found.`));
          }

          // Step 3: Fetch the new stock level to return to caller
          db.get(
            `SELECT stock_level, stock_level_status FROM ingredients WHERE ingredient_id = ?`,
            [ingredientId],
            (err, row) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(new Error(`logWastage (fetch updated stock) failed: ${err.message}`));
              }

              db.run('COMMIT', (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(new Error(`Wastage transaction COMMIT failed: ${err.message}`));
                }
                resolve({
                  log_id: newLogId,
                  ingredient_id: ingredientId,
                  new_stock_level: row.stock_level,
                  stock_level_status: row.stock_level_status,
                  message: 'Wastage logged and stock updated successfully.',
                });
              });
            }
          );
        });
      });
    });
  });
}

// EXPORTS

module.exports = {
  // Ingredients CRUD
  getAllIngredients,
  addIngredient,
  updateIngredient,
  deleteIngredient,
  // Low Stock
  getLowStockItems,
  // Menu & Recipes
  createMenuItem,
  calculateProductionCost,
  // Wastage
  logWastage,
};