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
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("data",req.body);
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, "mysecret", { expiresIn: '1h' });
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
    const { income, savings, loan, insurance, subscription } = req.body;
    console.log("data",req.body,req.user);
    const updateData = {};
    
    if (income !== undefined) updateData.income = income;
    if (savings !== undefined) updateData.savings = savings;
    if (loan) updateData.$push = { ...updateData.$push, loan: { $each: loan } };
    if (insurance) updateData.$push = { ...updateData.$push, insurance: { $each: insurance } };
    if (subscription) updateData.$push = { ...updateData.$push, subscription: { $each: subscription } };

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, { new: true });
  
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user financials', error });
  }
});
module.exports = router;
