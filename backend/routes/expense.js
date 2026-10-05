const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');
const { categorizeExpense, generateSpendingInsights } = require('../services/aiService');

// ==================== 1. ADD EXPENSE (POST) ====================
// Expense creation endpoint
router.post('/add-expense', authenticateToken, async (req, res) => {
    try {
        const { amount, description, category } = req.body;
        
        // Fetch full user details using authenticated ID
        const user = await User.findById(req.userId);

        const newExpense = new Expense({
            amount,
            description,
            category,
            userId: user._id,
            userName: user.name,
            userEmail: user.email
        });

        await newExpense.save();
        res.status(201).json(newExpense);
    } catch (error) {
        res.status(500).json({ message: 'Error adding expense' });
    }
});

// ==================== 2. DELETE EXPENSE (DELETE) ====================
router.delete('/delete-expense/:id', authenticateToken, async (req, res) => {
    try {
        const expense = await Expense.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        const expenseAmount = Number(expense.amount);

        await Expense.findByIdAndDelete(req.params.id);

        // Deduct expense from total
        await User.findByIdAndUpdate(
            req.userId,
            { $inc: { totalExpenses: -expenseAmount } }
        );

        res.status(200).json({ message: 'Expense deleted successfully' });
    } catch (err) {
        console.error('Delete Expense Error:', err);
        res.status(500).json({ message: 'Failed to delete expense' });
    }
});

// ==================== 3. GET EXPENSES (WITH PAGINATION) ====================
router.get('/get-expense', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalExpenses = await Expense.countDocuments({ userId: req.userId });

        const expenses = await Expense.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const lastPage = Math.ceil(totalExpenses / limit) || 1;

        res.status(200).json({
            expenses,
            pagination: {
                currentPage: page,
                hasNextPage: page < lastPage,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: lastPage,
                totalExpenses: totalExpenses
            }
        });
    } catch (err) {
        console.error('Get Expenses Error:', err);
        res.status(500).json({ message: 'Failed to fetch expenses' });
    }
});

// ==================== 4. AI SPENDING INSIGHTS ====================
router.get('/spending-insights', authenticateToken, async (req, res) => {
    try {
        const expenses = await Expense.find({ userId: req.userId });
        if (!expenses.length) {
            return res.status(200).json({ insights: ['No expenses found to analyze.'] });
        }

        const insights = await generateSpendingInsights(expenses);
        res.status(200).json({ insights });
    } catch (err) {
        console.error('Spending Insights Error:', err);
        res.status(500).json({ message: 'Failed to fetch spending insights' });
    }
});

module.exports = router;