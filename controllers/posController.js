const posModel = require('../models/posModel');

exports.getFloorData = async (req, res) => {
    try {
        const todayLocal = new Date();
        const offset = todayLocal.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(todayLocal - offset)).toISOString().split('T')[0];
        
        const selectedDate = req.query.date || localISOTime;
        
        const tables = await posModel.getTables();
        const reservations = await posModel.getReservations(selectedDate);
        
        const tablesMap = {};
        tables.forEach(t => tablesMap[t.table_id] = t);

        if (selectedDate === localISOTime) {
            const now = new Date();
            reservations.forEach(r => {
                // Safely interpret stored time back to local
                const resTime = new Date(r.reservation_time);
                const diffMins = (resTime.getTime() - now.getTime()) / 60000;
                
                // If reservation is happening in next 15 mins, or up to 2 hours into the reservation
                if (diffMins <= 15 && diffMins >= -120) {
                    // Only override if no one has physically placed an order ('Occupied') yet
                    if (tablesMap[r.table_id] && tablesMap[r.table_id].table_status === 'Empty') {
                        tablesMap[r.table_id].table_status = 'Reserved'; 
                    }
                }
            });
        }

        res.json({ success: true, tables: Object.values(tablesMap), reservations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createReservation = async (req, res) => {
    try {
        const { table_id, reservation_time } = req.body;
        
        const isAvailable = await posModel.checkTableAvailability(table_id, reservation_time);
        if (!isAvailable) {
            return res.status(400).json({ success: false, message: "Table is already booked within 2 hours of this time." });
        }

        await posModel.createReservation(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMenu = async (req, res) => {
    try {
        const menu = await posModel.getMenuItems();
        res.json({ success: true, menu });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.verifyPin = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ success: false, message: "Password is required" });
 
        const isValid = await posModel.verifyAdminPassword(password);
        res.json({ success: true, isValid });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.placeOrder = async (req, res) => {
    try {
        const { tableId, staffId, cart, currentOrderId } = req.body;
        
        if (!tableId || cart.length === 0) return res.status(400).json({ success: false, message: "Invalid order data" });
        
        const orderId = await posModel.createOrUpdateOrderTransaction(tableId, staffId || 2, cart, currentOrderId); 
        res.json({ success: true, orderId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getKitchenData = async (req, res) => {
    try {
        const orders = await posModel.getKitchenOrders();
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.completeOrder = async (req, res) => {
    try {
        await posModel.markOrderCompleted(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getTableOrder = async (req, res) => {
    try {
        const order = await posModel.getActiveTableOrder(req.params.id);
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.processPayment = async (req, res) => {
    try {
        const { tableId, orderId } = req.body;
        if (!tableId || !orderId) return res.status(400).json({ success: false, message: "Missing table or order ID" });

        await posModel.processPaymentTransaction(tableId, orderId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};