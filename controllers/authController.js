const authModel = require('../models/authModel');

exports.handleLogin = async (req, res) => {
    try {
        // Extract the hashedPin sent from main.js
        const { username, hashedPin } = req.body;
        
        if (!username || !hashedPin) {
            return res.status(400).json({ success: false, message: "Username and PIN are required" });
        }

        // Verify using the securely hashed PIN
        const user = await authModel.verifyLogin(username, hashedPin);

        if (user) {
            res.json({ 
                success: true, 
                role: user.role, 
                message: "Login successful" 
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: "Invalid username or PIN." 
            });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};