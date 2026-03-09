/**
 * inventoryController.js
 * HTTP request handlers for Atif's "Inventory & Menu Manager"
 *
 * Responsibilities:
 *   - Parse incoming req.body / req.params
 *   - Call the appropriate model function
 *   - Format and send the JSON response with the correct HTTP status
 *   - Never contain raw SQL — all data logic lives in inventoryModel.js
 *
 * Route map (wire up in server.js):
 *   GET    /api/inventory/ingredients          → listIngredients
 *   POST   /api/inventory/ingredients          → addNewIngredient
 *   PUT    /api/inventory/ingredients/:id      → updateStock
 *   DELETE /api/inventory/ingredients/:id      → removeIngredient
 *
 *   GET    /api/inventory/alerts               → checkAlerts
 *
 *   POST   /api/inventory/menu                 → createDish
 *   GET    /api/inventory/menu/:id/cost        → getDishCost
 *
 *   POST   /api/inventory/wastage              → recordWastage
 */

const {
  getAllIngredients,
  addIngredient,
  updateIngredient,
  deleteIngredient,
  getLowStockItems,
  createMenuItem,
  calculateProductionCost,
  logWastage,
} = require('../models/inventoryModel');

// SECTION 1: INGREDIENT MANAGEMENT

/**
 * GET /api/inventory/ingredients
 * Returns the full ingredient list for the Ingredients Page.
 *
 * Response 200: { success: true, count: N, data: [...] }
 * Response 500: { success: false, message: "..." }
 */
const listIngredients = async (req, res) => {
  try {
    const ingredients = await getAllIngredients();
    return res.status(200).json({
      success: true,
      count: ingredients.length,
      data: ingredients,
    });
  } catch (error) {
    console.error('[listIngredients]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ingredients.',
      error: error.message,
    });
  }
};

/**
 * POST /api/inventory/ingredients
 * Adds a brand-new raw ingredient to the kitchen stock.
 *
 * req.body: {
 *   ingredient_name    : string   (required)
 *   stock_level        : number   (required)
 *   unit               : string   (required) — e.g. "grams", "litres"
 *   cost_per_unit      : number   (required)
 *   low_stock_threshold: number   (required)
 *   supplier           : string   (optional)
 * }
 *
 * Response 201: { success: true, message: "...", data: { ingredient_id } }
 * Response 400: { success: false, message: "Missing required fields." }
 * Response 500: { success: false, message: "..." }
 */
const addNewIngredient = async (req, res) => {
  const {
    ingredient_name,
    stock_level,
    unit,
    cost_per_unit,
    low_stock_threshold,
    supplier,
  } = req.body;

  // --- Validation ---
  if (!ingredient_name || stock_level === undefined || !unit || cost_per_unit === undefined || low_stock_threshold === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: ingredient_name, stock_level, unit, cost_per_unit, low_stock_threshold.',
    });
  }

  try {
    const result = await addIngredient({
      ingredient_name,
      stock_level: parseFloat(stock_level),
      unit,
      cost_per_unit: parseFloat(cost_per_unit),
      low_stock_threshold: parseFloat(low_stock_threshold),
      supplier: supplier || null,
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      data: { ingredient_id: result.ingredient_id },
    });
  } catch (error) {
    console.error('[addNewIngredient]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to add ingredient.',
      error: error.message,
    });
  }
};

/**
 * PUT /api/inventory/ingredients/:id
 * Updates an existing ingredient's details — price, supplier, stock level, etc.
 * Also used when a delivery arrives and stock needs topping up.
 *
 * req.params: { id: number }
 * req.body:   Same shape as addNewIngredient
 *
 * Response 200: { success: true, message: "...", data: { changes } }
 * Response 400: { success: false, message: "Missing required fields." }
 * Response 404: { success: false, message: "Ingredient not found." }
 * Response 500: { success: false, message: "..." }
 */
const updateStock = async (req, res) => {
  const ingredientId = parseInt(req.params.id, 10);

  const {
    ingredient_name,
    stock_level,
    unit,
    cost_per_unit,
    low_stock_threshold,
    supplier,
  } = req.body;

  // --- Validation ---
  if (isNaN(ingredientId)) {
    return res.status(400).json({ success: false, message: 'Invalid ingredient ID.' });
  }

  if (!ingredient_name || stock_level === undefined || !unit || cost_per_unit === undefined || low_stock_threshold === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: ingredient_name, stock_level, unit, cost_per_unit, low_stock_threshold.',
    });
  }

  try {
    const result = await updateIngredient(ingredientId, {
      ingredient_name,
      stock_level: parseFloat(stock_level),
      unit,
      cost_per_unit: parseFloat(cost_per_unit),
      low_stock_threshold: parseFloat(low_stock_threshold),
      supplier: supplier || null,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: { changes: result.changes },
    });
  } catch (error) {
    // Model rejects with "not found" message when changes === 0
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('[updateStock]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update ingredient.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/inventory/ingredients/:id
 * Removes an obsolete ingredient from the system.
 * Note: The DB schema uses ON DELETE CASCADE, so linked recipe rows are
 * automatically cleaned up.
 *
 * req.params: { id: number }
 *
 * Response 200: { success: true, message: "..." }
 * Response 404: { success: false, message: "Ingredient not found." }
 * Response 500: { success: false, message: "..." }
 */
const removeIngredient = async (req, res) => {
  const ingredientId = parseInt(req.params.id, 10);

  if (isNaN(ingredientId)) {
    return res.status(400).json({ success: false, message: 'Invalid ingredient ID.' });
  }

  try {
    const result = await deleteIngredient(ingredientId);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('[removeIngredient]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete ingredient.',
      error: error.message,
    });
  }
};

// SECTION 2: LOW STOCK ALERTS

/**
 * GET /api/inventory/alerts
 * Returns every ingredient whose stock_level has dropped at or below its
 * low_stock_threshold. The frontend uses this list to turn rows red.
 *
 * Response 200: { success: true, count: N, data: [...] }
 * Response 500: { success: false, message: "..." }
 */
const checkAlerts = async (req, res) => {
  try {
    const lowStockItems = await getLowStockItems();
    return res.status(200).json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems,
    });
  } catch (error) {
    console.error('[checkAlerts]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve low-stock alerts.',
      error: error.message,
    });
  }
};

// SECTION 3: RECIPE & MENU MANAGEMENT

/**
 * POST /api/inventory/menu
 * Handles the Recipe Builder form submission. Creates the menu item and
 * links all of its ingredients in a single atomic DB transaction.
 *
 * req.body: {
 *   dish_name        : string              (required)
 *   category         : string              (required) — e.g. "Pizza", "Drinks"
 *   selling_price    : number              (required)
 *   estimated_time   : number              (required) — minutes
 *   ingredients      : Array<{             (required, min 1 item)
 *     ingredient_id  : number
 *     quantity       : number              — in the ingredient's own unit
 *   }>
 * }
 *
 * Response 201: { success: true, message: "...", data: { item_id, production_cost } }
 * Response 400: { success: false, message: "..." }
 * Response 500: { success: false, message: "..." }
 */
const createDish = async (req, res) => {
  const { dish_name, category, selling_price, estimated_time, ingredients } = req.body;

  // --- Validation ---
  if (!dish_name || !category || selling_price === undefined || estimated_time === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: dish_name, category, selling_price, estimated_time.',
    });
  }

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'A dish must have at least one linked ingredient in the "ingredients" array.',
    });
  }

  // Validate each ingredient entry in the array
  for (const [index, item] of ingredients.entries()) {
    if (!item.ingredient_id || item.quantity === undefined || item.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid ingredient entry at index ${index}: each entry needs a valid ingredient_id and a quantity > 0.`,
      });
    }
  }

  try {
    const itemData = {
      dish_name,
      category,
      selling_price: parseFloat(selling_price),
      estimated_time: parseInt(estimated_time, 10),
    };

    // Normalise the ingredient array before passing to the model
    const recipeIngredients = ingredients.map((item) => ({
      ingredient_id: parseInt(item.ingredient_id, 10),
      quantity: parseFloat(item.quantity),
    }));

    const result = await createMenuItem(itemData, recipeIngredients);

    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        item_id: result.item_id,
        production_cost: result.production_cost,
      },
    });
  } catch (error) {
    console.error('[createDish]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create menu item.',
      error: error.message,
    });
  }
};

/**
 * GET /api/inventory/menu/:id/cost
 * Returns the auto-calculated production cost for a specific dish.
 * Useful for previewing cost on the Recipe Builder page without saving.
 *
 * req.params: { id: number }  — item_id from menu_items
 *
 * Response 200: { success: true, data: { item_id, production_cost } }
 * Response 400: { success: false, message: "Invalid menu item ID." }
 * Response 500: { success: false, message: "..." }
 */
const getDishCost = async (req, res) => {
  const menuItemId = parseInt(req.params.id, 10);

  if (isNaN(menuItemId)) {
    return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
  }

  try {
    const cost = await calculateProductionCost(menuItemId);
    return res.status(200).json({
      success: true,
      data: {
        item_id: menuItemId,
        production_cost: cost,
      },
    });
  } catch (error) {
    console.error('[getDishCost]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate production cost.',
      error: error.message,
    });
  }
};

// SECTION 4: WASTAGE LOGGING

/**
 * POST /api/inventory/wastage
 * Logs a wastage event (dropped / spoiled food) and automatically
 * decrements the ingredient's stock — WITHOUT creating a sale record.
 *
 * req.body: {
 *   ingredient_id : number   (required)
 *   quantity      : number   (required) — amount wasted in the ingredient's unit
 *   reason        : string   (required) — e.g. "Dropped", "Spoiled", "Expired"
 * }
 *
 * Response 201: {
 *   success: true,
 *   message: "...",
 *   data: { log_id, ingredient_id, new_stock_level, stock_level_status }
 * }
 * Response 400: { success: false, message: "..." }
 * Response 404: { success: false, message: "Ingredient not found." }
 * Response 500: { success: false, message: "..." }
 */
const recordWastage = async (req, res) => {
  const { ingredient_id, quantity, reason } = req.body;

  // --- Validation ---
  if (!ingredient_id || quantity === undefined || !reason) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: ingredient_id, quantity, reason.',
    });
  }

  if (parseFloat(quantity) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Quantity wasted must be greater than 0.',
    });
  }

  try {
    const result = await logWastage(
      parseInt(ingredient_id, 10),
      parseFloat(quantity),
      reason.trim()
    );

    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        log_id: result.log_id,
        ingredient_id: result.ingredient_id,
        new_stock_level: result.new_stock_level,
        stock_level_status: result.stock_level_status,
      },
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('[recordWastage]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to log wastage.',
      error: error.message,
    });
  }
};

// EXPORTS

module.exports = {
  // Ingredients
  listIngredients,
  addNewIngredient,
  updateStock,
  removeIngredient,
  // Alerts
  checkAlerts,
  // Menu & Recipes
  createDish,
  getDishCost,
  // Wastage
  recordWastage,
};