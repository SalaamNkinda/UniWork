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
const adminController = require('./controllers/adminController');

// --- ROUTES ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

// 2. API Routes (Fetch Data)
//app.get('/api/ingredients', inventoryController.getAllIngredients);

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});