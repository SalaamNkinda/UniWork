const dashboardModel = require('../models/dashboardModel');

exports.getStaff = async (req, res) => {
    try {
        const staff = await dashboardModel.getStaffStatus();
        res.json({ success: true, staff });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.handleClockAction = async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin) return res.status(400).json({ success: false, message: "PIN is required." });

        const result = await dashboardModel.processClockAction(pin);
        res.json({ success: true, action: result.action, user: result.user });
    } catch (err) {
        // If it's our custom "Invalid PIN" error, send a 401 Unauthorized
        if (err.message === "Invalid PIN") {
            return res.status(401).json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};