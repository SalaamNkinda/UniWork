const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve CSS/JS files
app.use(express.static('views'));  // Serve HTML files

// --- CONTROLLERS ---
// Link to the separate controller files
const inventoryController = require('./controllers/inventoryController');
const posController = require('./controllers/posController');
const dashboardController = require('./controllers/dashboardController');
const authController = require('./controllers/authController');

// --- ROUTES ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});


// 2. API Routes (Fetch Data)
app.post('/api/login', authController.handleLogin);

app.get('/api/inventory/ingredients', inventoryController.listIngredients);
app.post('/api/inventory/ingredients', inventoryController.addNewIngredient);
app.put('/api/inventory/ingredients/:id', inventoryController.updateStock);
app.put('/api/inventory/ingredients/:id/restock', inventoryController.restockItem);
app.delete('/api/inventory/ingredients/:id', inventoryController.removeIngredient);

app.get('/api/inventory/alerts', inventoryController.checkAlerts);
app.post('/api/inventory/menu', inventoryController.createDish);
app.get('/api/inventory/menu/:id/cost', inventoryController.getDishCost);

app.post('/api/inventory/wastage', inventoryController.recordWastage);

app.get('/api/pos/floor', posController.getFloorData);
app.get('/api/pos/menu', posController.getMenu);
app.post('/api/pos/verify-pin', posController.verifyPin);
app.post('/api/pos/order', posController.placeOrder);
app.get('/api/pos/table/:id/order', posController.getTableOrder);
app.post('/api/pos/pay', posController.processPayment);

app.get('/api/pos/kitchen', posController.getKitchenData);
app.put('/api/pos/kitchen/:id/done', posController.completeOrder);
app.post('/api/pos/reservations', posController.createReservation);

app.get('/api/admin/staff', dashboardController.getStaff);
app.post('/api/admin/clock', dashboardController.handleClockAction);
app.get('/api/admin/stats/today', dashboardController.getBusinessStats);

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});