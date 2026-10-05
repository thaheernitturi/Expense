const express = require('express');
const router = express.Router();
const axios = require('axios');
const Order = require('../models/Order');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

// Cashfree Credentia
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_BASE_URL = "https://sandbox.cashfree.com/pg";

// Common Headers required by Cashfree REST API
const cashfreeHeaders = {
    'x-client-id': CASHFREE_APP_ID,
    'x-client-secret': CASHFREE_SECRET_KEY,
    'x-api-version': '2023-08-01',
    'Content-Type': 'application/json'
};

// 1. Create Payment Order
router.post('/buy-premium', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const orderId = `ORDER_${Date.now()}`;

        const payload = {
            order_amount: 1,
            order_currency: "INR",
            order_id: orderId,
            customer_details: {
                customer_id: user._id.toString(),
                customer_email: user.email,
                customer_phone: "9999999999"
            }
        };

        // Call Cashfree REST API directly
        const response = await axios.post(`${CASHFREE_BASE_URL}/orders`, payload, {
            headers: cashfreeHeaders
        });

        const paymentSessionId = response.data.payment_session_id;

        // Save Order in Database
        const newOrder = new Order({
            orderId: orderId,
            userId: req.userId,
            amount: 1,
            status: 'PENDING',
            paymentSessionId: paymentSessionId
        });
        await newOrder.save();

        res.status(201).json({
            paymentSessionId: paymentSessionId,
            orderId: orderId
        });
    } catch (error) {
        console.error('Cashfree Order Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Could not create order' });
    }
});

// 2. Verify Payment
router.post('/verify-payment', authenticateToken, async (req, res) => {
    const { orderId } = req.body;

    try {
        const response = await axios.get(`${CASHFREE_BASE_URL}/orders/${orderId}/payments`, {
            headers: cashfreeHeaders
        });

        const payments = response.data;
        const isSuccess = payments.some(p => p.payment_status === 'SUCCESS');

        if (isSuccess) {
            await Order.findOneAndUpdate({ orderId }, { status: 'SUCCESSFUL' });
            await User.findByIdAndUpdate(req.userId, { isPremiumUser: true });
            return res.status(200).json({ status: 'SUCCESS', message: 'Payment verified' });
        } else {
            await Order.findOneAndUpdate({ orderId }, { status: 'FAILED' });
            return res.status(400).json({ status: 'FAILED', message: 'Payment failed' });
        }
    } catch (error) {
        console.error('Verify Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ status: 'FAILED', message: 'Verification error' });
    }
});

module.exports = router;