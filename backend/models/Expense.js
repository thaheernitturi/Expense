const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, default: 'Anonymous User' }, // Fallback if missing
    userEmail: { type: String, default: 'unknown@example.com' } // Fallback if missing
});

module.exports = mongoose.model('Expense', expenseSchema);