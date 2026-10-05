const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const axios = require('axios');

const User = require('../models/User');
const ForgotPasswordRequest = require('../models/ForgotPasswordRequest');

// Read configurations from environment variables
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ==================== 1. FORGOT PASSWORD ====================
router.post('/forgotpassword', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User with this email does not exist.' });
        }

        // Generate unique UUID natively
        const requestId = crypto.randomUUID();

        // Save reset request record
        await ForgotPasswordRequest.create({
            _id: requestId,
            userId: user._id,
            isActive: true
        });

        // Backend URL that renders the HTML reset form
        const resetUrl = `${BACKEND_URL}/password/resetpassword/${requestId}`;

        // Attempt to send email via Brevo API
        try {
            await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: { name: 'Expense Tracker Support', email: SENDER_EMAIL },
                    to: [{ email: email, name: user.name || 'User' }],
                    subject: 'Reset Your Expense Tracker Password',
                    htmlContent: `
                        <h3>Expense Tracker Password Reset</h3>
                        <p>Hello,</p>
                        <p>Click the link below to reset your password:</p>
                        <a href="${resetUrl}">${resetUrl}</a>
                        <p>If you did not request this, please ignore this email.</p>
                    `
                },
                {
                    headers: {
                        'api-key': BREVO_API_KEY,
                        'Content-Type': 'application/json'
                    }
                }
            );
        } catch (emailErr) {
            console.log('Brevo Email sending skipped/failed. Manual Reset URL:', resetUrl);
        }

        res.status(200).json({
            message: 'Password reset link generated successfully.',
            resetUrl
        });
    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ==================== 2. VERIFY & RENDER RESET FORM ====================
router.get('/resetpassword/:id', async (req, res) => {
    const requestId = req.params.id;

    try {
        const resetRequest = await ForgotPasswordRequest.findById(requestId);

        if (!resetRequest || !resetRequest.isActive) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Invalid Link</title></head>
                <body style="font-family: Arial; text-align: center; margin-top: 50px;">
                    <h3 style="color: red;">Invalid or Expired Link</h3>
                    <p>This password reset link has already been used or is invalid.</p>
                    <a href="${FRONTEND_URL}/login.html">Back to Login</a>
                </body>
                </html>
            `);
        }

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reset Password</title>
                <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f4f4f9; margin: 0; }
                    .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 320px; }
                    h3 { margin-top: 0; color: #333; }
                    input { width: 100%; padding: 10px; margin-top: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
                    button { width: 100%; padding: 10px; margin-top: 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
                    button:hover { background-color: #0056b3; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h3>Enter New Password</h3>
                    <form id="reset-form">
                        <input type="password" id="new-password" placeholder="New Password" required minlength="6" />
                        <button type="submit">Update Password</button>
                    </form>
                </div>

                <script>
                    document.getElementById('reset-form').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const newPassword = document.getElementById('new-password').value;

                        try {
                            const res = await axios.post('${BACKEND_URL}/password/updatepassword', {
                                requestId: '${requestId}',
                                newPassword: newPassword
                            });
                            alert(res.data.message);
                            window.location.href = '${FRONTEND_URL}/login.html';
                        } catch (err) {
                            alert(err.response?.data?.message || 'Failed to update password.');
                        }
                    });
                </script>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('Reset Verification Error:', err);
        res.status(500).send('Internal Server Error');
    }
});

// ==================== 3. CATCH-ALL ROUTE (NO UUID) ====================
router.get('/resetpassword', (req, res) => {
    res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Missing Request ID</title></head>
        <body style="font-family: Arial; text-align: center; margin-top: 50px;">
            <h3 style="color: #d9534f;">Missing Reset Request ID</h3>
            <p>Please check your email and click the complete link containing your unique request ID.</p>
            <a href="${FRONTEND_URL}/login.html">Back to Login</a>
        </body>
        </html>
    `);
});

// ==================== 4. UPDATE PASSWORD (TRANSACTION) ====================
router.post('/updatepassword', async (req, res) => {
    const { requestId, newPassword } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const resetRequest = await ForgotPasswordRequest.findById(requestId).session(session);

        if (!resetRequest || !resetRequest.isActive) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Link is invalid or has already been used.' });
        }

        // Hash new password using bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password in User collection
        await User.findByIdAndUpdate(
            resetRequest.userId,
            { password: hashedPassword },
            { session }
        );

        // Deactivate request so link cannot be reused
        resetRequest.isActive = false;
        await resetRequest.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Password updated successfully! You can now log in.' });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('Update Password Error:', err);
        res.status(500).json({ message: 'Failed to update password.' });
    }
});

module.exports = router;