const mongoose = require('mongoose');

const forgotPasswordRequestSchema = new mongoose.Schema({
    _id: {
        type: String, // UUID string
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('ForgotPasswordRequest', forgotPasswordRequestSchema);