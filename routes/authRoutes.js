const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, phone,bankName, email, password } = req.body;
    console.log("data",req.body);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ firstName,lastName, phone,bankName, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.log("data",error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("data",req.body);
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, "mysecret", { expiresIn: '12h' });
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  
});

router.get("/",(req,res)=>{
 console.log("data"); 
 res.send("data");
})
router.post('/addExpense',authMiddleware, async (req, res) => {
  try {
    const { income, savings, loan, insurance, subscription , transportation } = req.body;
    console.log("data",req.body,req.user);
    const updateData = {};
    
    if (income !== undefined) updateData.income = income;
    if (savings !== undefined) updateData.savings = savings[0].amount;
    if (loan) updateData.$push = { ...updateData.$push, loan: { $each: loan } };
    if (insurance) updateData.$push = { ...updateData.$push, insurance: { $each: insurance } };
    if (subscription) updateData.$push = { ...updateData.$push, subscription: { $each: subscription } };
    if (transportation) updateData.$push = { ...updateData.$push, transportation: { $each: transportation } };
    console.log("data3",updateData);

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, { new: true });
  
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user financials', error });
  }
});
router.get('/daily-spend-limit',authMiddleware , async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalLoan = user.loan.reduce((sum, item) => sum + item.amount, 0);
    const totalInsurance = user.insurance.reduce((sum, item) => sum + item.amount, 0);
    const totalSubscription = user.subscription.reduce((sum, item) => sum + item.amount, 0);
    
    const totalExpenses = totalLoan + totalInsurance + totalSubscription;
    
    const dailySpendLimit = (user.income - (totalExpenses + user.savings)) / 30;

    res.json({ dailySpendLimit: dailySpendLimit.toFixed(2) });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating daily spend limit', error });
  }
});
module.exports = router;