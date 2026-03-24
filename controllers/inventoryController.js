const {
  getAllIngredients,
  addIngredient,
  updateIngredient,
  deleteIngredient,
  getLowStockItems,
  createMenuItem,
  calculateProductionCost,
  logWastage,
  addStock
} = require('../models/inventoryModel');


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

const restockItem = async (req, res) => {
    const ingredientId = parseInt(req.params.id, 10);
    const { quantity } = req.body;

    if (isNaN(ingredientId) || quantity === undefined || parseFloat(quantity) <= 0) {
        return res.status(400).json({ success: false, message: 'Valid ID and quantity > 0 are required.' });
    }

    try {
        const result = await addStock(ingredientId, parseFloat(quantity));
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: 'Failed to add stock.', error: error.message });
    }
};

module.exports = {
  listIngredients,
  addNewIngredient,
  updateStock,
  removeIngredient,
  checkAlerts,
  createDish,
  getDishCost,
  recordWastage,
  restockItem,
};