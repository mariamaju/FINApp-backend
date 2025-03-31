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
    const token = jwt.sign({ id: user._id }, "mysecret", { expiresIn: '12h' });
    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        bankName: user.bankName,
        email: user.email
      }
    });
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

router.get('/budget-suggestion', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { familyMembers } = req.query; 
    const familySize = parseInt(familyMembers, 10) || 4; 

    const totalLoan = user.loan.reduce((sum, item) => sum + item.amount, 0);
    const totalInsurance = user.insurance.reduce((sum, item) => sum + item.amount, 0);
    const totalSubscription = user.subscription.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = totalLoan + totalInsurance + totalSubscription;

    const availableIncome = user.income - (totalExpenses + user.savings);
    
    if (availableIncome <= 0) {
      return res.status(400).json({ message: 'No available income for budgeting' });
    }

    const budgetAllocation = {
      food: 0.4, 
      transport: 0.2, 
      entertainment: 0.15, 
      savings: 0.25 
    };

    const adjustedBudget = {
      food: (budgetAllocation.food * availableIncome) * (1 + (familySize - 1) * 0.2),
      transport: (budgetAllocation.transport * availableIncome) * (1 + (familySize - 1) * 0.1),
      entertainment: (budgetAllocation.entertainment * availableIncome),
      savings: (budgetAllocation.savings * availableIncome)
    };

    res.json({
      monthlyBudget: {
        food: adjustedBudget.food.toFixed(2),
        transport: adjustedBudget.transport.toFixed(2),
        entertainment: adjustedBudget.entertainment.toFixed(2),
        savings: adjustedBudget.savings.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating budget suggestion', error });
  }
});
//payment
// API endpoint to get user data
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.json(user);
  } catch (err) {
    res.status(500).send('Server error');
  }
});
// API endpoint to update income and expenses after payment
router.post('/payment/:id', async (req, res) => {
  const { amount, category } = req.body;
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Update annual income
    user.annualIncome -= amount;

    // Update the expense tracker
    const expense = user.expenses.find((exp) => exp.category === category);
    if (expense) {
      if (expense.amountSpent + amount > expense.categoryLimit) {
        return res.status(400).send('Category limit exceeded');
      }
      expense.amountSpent += amount;
    } else {
      user.expenses.push({
        category: category,
        amountSpent: amount,
        categoryLimit: 500, // Example category limit
      });
    }

    await user.save();
    res.status(200).send('Payment successful and data updated');
  } catch (err) {
    res.status(500).send('Server error');
  }
});


module.exports = router;