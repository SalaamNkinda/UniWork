const posModel = require('../models/posModel');

exports.getFloorData = async (req, res) => {
    try {
        const tables = await posModel.getTables();
        const reservations = await posModel.getReservations();
        res.json({ success: true, tables, reservations });
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
        
        const orderId = await posModel.createOrderTransaction(tableId, staffId || 2, cart); // Default staffId 2 (waiter) for demo
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