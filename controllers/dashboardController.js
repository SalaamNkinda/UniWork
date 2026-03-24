const dashboardModel = require('../models/dashboardModel');

exports.getStaff = async (req, res) => {
    try {
        const staff = await dashboardModel.getStaffStatus();
        res.json({ success: true, staff });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.handleClockAction = async (req, res) => {
    try {
        const { username } = req.body;
        const result = await dashboardModel.processClockAction(username);
        res.json({ success: true, action: result.action, user: result.user });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getBusinessStats = async (req, res) => {
    try {
        const revenue = await dashboardModel.getDailyRevenue();
        const costs = await dashboardModel.getDailyCosts();
        const busiestHour = await dashboardModel.getBusiestHour();
        const activeStaff = await dashboardModel.getClockedInCount();
        const chartData = await dashboardModel.getHourlySalesDistribution();

        const profit = revenue - costs;
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
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getOrderHistory = async (req, res) => {
    try {
        const now = new Date();
        const dubaiTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
        
        const date = req.query.date || dubaiTime.toISOString().split('T')[0];
        const orders = await dashboardModel.getOrdersByDate(date);
        res.json({ success: true, orders });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getProfitAnalytics = async (req, res) => {
    try {
        const comparisons = await dashboardModel.getComparisonStats();
        const wastage = await dashboardModel.getDetailedWastage();
        res.json({ success: true, data: { comparisons, wastage } });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};