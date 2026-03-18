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

// Existing Staff Logic
exports.getStaff = async (req, res) => {
    try {
        const staff = await dashboardModel.getStaffStatus();
        res.json({ success: true, data: staff });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// NEW: Business Analytics Logic
exports.getBusinessStats = async (req, res) => {
    try {
        const revenue = await dashboardModel.getDailyRevenue();
        const costs = await dashboardModel.getDailyCosts();
        const busiestHour = await dashboardModel.getBusiestHour();
        const activeStaff = await dashboardModel.getClockedInCount();
        const chartData = await dashboardModel.getHourlySalesDistribution();

        const profit = revenue - costs;
        // Profit margin: (Sales - Costs) / Sales * 100
        const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

        res.json({
            success: true,
            data: {
                revenue: revenue.toFixed(2),
                profit: profit.toFixed(2),
                margin: margin + '%',
                busiestTime: busiestHour ? busiestHour + ':00' : 'N/A',
                staffActive: activeStaff,
                chart: {
                    labels: chartData.map(item => item.hour + ':00'),
                    revenueData: chartData.map(item => item.revenue)
                }
            }
        });
    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        res.status(500).json({ success: false, error: 'Failed to calculate business metrics.' });
    }
};