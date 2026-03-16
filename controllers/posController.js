const posModel = require('../models/posModel');

exports.getFloorData = async (req, res) => {
    try {
        const tables = await posModel.getTables();
        const reservations = await posModel.getReservations();
        
        // 15-Minute Rule Logic Override
        const now = new Date();
        const tablesMap = {};
        tables.forEach(t => tablesMap[t.table_id] = t);

        reservations.forEach(r => {
            const resTime = new Date(r.reservation_time);
            const diffMins = (resTime - now) / 60000;
            
            // If the reservation is happening within the next 15 minutes or overdue
            if (diffMins <= 15 && diffMins >= -60) {
                if (tablesMap[r.table_id] && tablesMap[r.table_id].table_status === 'Empty') {
                    tablesMap[r.table_id].table_status = 'Reserved'; 
                }
            }
        });

        res.json({ success: true, tables: Object.values(tablesMap), reservations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createReservation = async (req, res) => {
    try {
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
        const isValid = await posModel.verifyAdminPin(req.body.pin);
        res.json({ success: true, isValid });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.placeOrder = async (req, res) => {
    try {
        const { tableId, staffId, cart } = req.body;
        if (!tableId || cart.length === 0) return res.status(400).json({ success: false, message: "Invalid order data" });
        
        const orderId = await posModel.createOrderTransaction(tableId, staffId || 2, cart); 
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