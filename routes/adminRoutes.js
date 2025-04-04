const express = require('express');
const User = require('../models/User');
const Payment = require('../models/Payment');
const router = express.Router();


router.get('/counters', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({}); // Modify if you have an "active" field
        const totalTransactions = await Payment.countDocuments();
        const totalExpenses = await Payment.aggregate([
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        res.json({
            totalUsers,
            activeUsers,
            totalTransactions,
            totalExpenses: totalExpenses.length ? totalExpenses[0].total : 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


router.get('/recent-transactions', async (req, res) => {
    try {
        const transactions = await Payment.find()
            .sort({ date: -1 })
            .limit(4)
            .populate("user_id", "firstName lastName");

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

router.post('/users', async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.body; 
        page = parseInt(page);
        limit = parseInt(limit);

        const totalUsers = await User.countDocuments(); 
        const users = await User.find()
            .select("firstName lastName email joinedDate status")
            .sort({ createdAt: -1 }) 
            .skip((page - 1) * limit) 
            .limit(limit); 
        console.log('joinedDate', users[0].joinedDate);
        const formattedUsers = users.map(user => ({
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            joinDate: user.joinedDate.toISOString().split('T')[0], 
            status: user.status
        }));

        res.json({
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page,
            users: formattedUsers
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error });
    }
});


router.get('/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


router.put('/user/:id', async (req, res) => {
    try {
        const { firstName, lastName, status } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { firstName, lastName, status },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

router.post('/users/status', async (req, res) => {
    try {
        const { userId, status } = req.body;

        if (!["active", "inactive"].includes(status.toLowerCase())) {
            return res.status(400).json({ message: "Invalid status. Allowed values: active, inactive" });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { status: status.toLowerCase() },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: `User status updated to ${status}`, user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

router.get('/transactions', async (req, res) => {
    try {
        let { page = 1, limit = 10, category, search } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        let filter = {};

        
        if (category) {
            filter.category = category;
        }

        if (search) {
            const searchNumber = parseFloat(search); 
            if (!isNaN(searchNumber)) {
                filter.amount = searchNumber; 
            } else {
                filter.category = { $regex: search, $options: 'i' }; 
            }
        }

        const total = await Payment.countDocuments(filter);
        const transactions = await Payment.find(filter)
            .populate('user_id', 'firstName lastName email')
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({ total, page, limit, transactions });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
});

router.get('/transactions/:id', async (req, res) => {
    try {
        const transaction = await Payment.findById(req.params.id).populate('user_id', 'firstName lastName email');
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.status(200).json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transaction details', error });
    }
});

module.exports = router;
