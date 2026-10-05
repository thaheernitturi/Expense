const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

router.get('/showLeaderBoard', authenticateToken, async (req, res) => {
    try {
        // Read directly from User collection, select only name & totalExpenses, sort descending
        const leaderboard = await User.find()
            .select('name totalExpenses')
            .sort({ totalExpenses: -1 });

        res.status(200).json(leaderboard);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;