const db = require('../models/db');

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
      ORDER BY 
        CASE WHEN stock_level <= low_stock_threshold THEN 0 ELSE 1 END ASC,
        ingredient_name ASC
    `;
    db.all(sql, [], (err, rows) => {
      if (err) return reject(new Error(`getAllIngredients failed: ${err.message}`));
      resolve(rows);
    });
  });
}

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

function addStock(ingredientId, addedQuantity) {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE ingredients
            SET
                stock_level = stock_level + ?,
                stock_level_status = CASE 
                                       WHEN (stock_level + ?) <= low_stock_threshold THEN 'LOW' 
                                       ELSE 'OK' 
                                     END
            WHERE ingredient_id = ?
        `;
        db.run(sql, [addedQuantity, addedQuantity, ingredientId], function (err) {
            if (err) return reject(new Error(`addStock failed: ${err.message}`));
            if (this.changes === 0) return reject(new Error(`Ingredient with ID ${ingredientId} not found.`));
            resolve({ changes: this.changes, message: 'Stock added successfully.' });
        });
    });
}

module.exports = {
  getAllIngredients,
  addIngredient,
  updateIngredient,
  deleteIngredient,
  getLowStockItems,
  createMenuItem,
  calculateProductionCost,
  logWastage,
  addStock,
};