const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const purchaseRoutes = require('./routes/purchase');
const userRoutes = require('./routes/user');
const expenseRoutes = require('./routes/expense');
const premiumRoutes = require('./routes/premium');
require('dotenv').config();
const passwordRoutes = require('./routes/password');

const app = express();

app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'https://expense-lime-ten.vercel.app' // Your Vercel frontend URL
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/password', passwordRoutes);
// ROUTE MOUNTING
app.use('/user', userRoutes);       // Mounts user routes to /user/...
app.use('/expense', expenseRoutes); // Mounts expense routes to /expense/...
app.use('/purchase', purchaseRoutes);
app.use('/premium', premiumRoutes);
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch(err => console.error(err));