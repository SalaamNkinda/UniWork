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
        // Look for username instead of pin
        const { username } = req.body;
        if (!username) return res.status(400).json({ success: false, message: "Username is required." });

        const result = await dashboardModel.processClockAction(username);
        res.json({ success: true, action: result.action, user: result.user });
    } catch (err) {
        // Match the error message we threw in the updated model
        if (err.message === "User not found") {
            return res.status(401).json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};