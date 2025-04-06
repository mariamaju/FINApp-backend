const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenAI } = require("@google/genai");
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();
const Payment = require('../models/Payment');
const ai = new GoogleGenAI({ apiKey: 'AIzaSyDxFu6RkezZKNj0viAqsF7XSYMsw1Qf_A8' });
const trainingData = require('./trainingData');
const passwordController = require('../Controllers/PasswordController');

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
router.get('/daily-spend-limit', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const userPayments = await Payment.find({
      user_id: req.user.id,
      date: { $gte: startOfMonth }
    });

    const totalLoan = user.loan.reduce((sum, item) => sum + item.amount, 0);
    const totalInsurance = user.insurance.reduce((sum, item) => sum + item.amount, 0);
    const totalSubscription = user.subscription.reduce((sum, item) => sum + item.amount, 0);
    const totalTransportation = user.transportation.reduce((sum, item) => sum + item.amount, 0);
    const totalPreviousPayments = userPayments.reduce((sum, item) => sum + item.amount, 0);

    const totalExpenses = totalLoan + totalInsurance + totalSubscription + totalTransportation + totalPreviousPayments;
    const remainingBudget = user.income - (totalExpenses + user.savings);

    const today = new Date();
    const daysRemaining = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const dailySpendLimit = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

    res.json({
      dailySpendLimit: dailySpendLimit.toFixed(2),
      totalPreviousPayments: totalPreviousPayments.toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating daily spend limit', error });
  }
});

router.get('/budget-suggestion', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    console.log("data", user);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch only the logged-in user's payments
    const userPayments = await Payment.find({ user_id: req.user.id });

    // Sum up payments for each category
    const recordedSpending = userPayments.reduce((acc, payment) => {
      acc[payment.category] = (acc[payment.category] || 0) + payment.amount;
      return acc;
    }, {});

    // Fixed expense calculations
    const totalLoan = user.loan.reduce((sum, item) => sum + item.amount, 0);
    const totalInsurance = user.insurance.reduce((sum, item) => sum + item.amount, 0);
    const totalSubscription = user.subscription.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = totalLoan + totalInsurance + totalSubscription;

    const availableIncome = user.income - (totalExpenses + user.savings);

    if (availableIncome <= 0) {
      return res.status(400).json({ message: 'No available income for budgeting' });
    }

    // Budget allocation
    const budgetAllocation = {
      groceries: 0.35,
      dining: 0.2,
      shopping: 0.2,
      entertainment: 0.25
    };
    console.log('recordedSpending', recordedSpending);

    // Adjusted budget after recorded spending
    const budget = {
      groceries: Math.max(0, (budgetAllocation.groceries * availableIncome) - (recordedSpending.Groceries || 0)).toFixed(2),
      dining: Math.max(0, (budgetAllocation.dining * availableIncome) - (recordedSpending.Dining || 0)).toFixed(2),
      shopping: Math.max(0, (budgetAllocation.shopping * availableIncome) - (recordedSpending.shopping || 0)).toFixed(2),
      entertainment: Math.max(0, (budgetAllocation.entertainment * availableIncome) - (recordedSpending.Entertainment || 0)).toFixed(2)
    };

    res.json({ monthlyBudget: budget });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating budget suggestion', error });
  }
});
// router.get('/budget-suggestion', authMiddleware, async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const { familyMembers } = req.query; 
//     const familySize = parseInt(familyMembers, 10) || 4; 

//     const totalLoan = user.loan.reduce((sum, item) => sum + item.amount, 0);
//     const totalInsurance = user.insurance.reduce((sum, item) => sum + item.amount, 0);
//     const totalSubscription = user.subscription.reduce((sum, item) => sum + item.amount, 0);
//     const totalExpenses = totalLoan + totalInsurance + totalSubscription;

//     const availableIncome = user.income - (totalExpenses + user.savings);
    
//     if (availableIncome <= 0) {
//       return res.status(400).json({ message: 'No available income for budgeting' });
//     }

//     const budgetAllocation = {
//       food: 0.4, 
//       transport: 0.2, 
//       entertainment: 0.15, 
//       savings: 0.25 
//     };

//     const adjustedBudget = {
//       food: (budgetAllocation.food * availableIncome) * (1 + (familySize - 1) * 0.2),
//       transport: (budgetAllocation.transport * availableIncome) * (1 + (familySize - 1) * 0.1),
//       entertainment: (budgetAllocation.entertainment * availableIncome),
//       savings: (budgetAllocation.savings * availableIncome)
//     };

//     res.json({
//       monthlyBudget: {
//         food: adjustedBudget.food.toFixed(2),
//         transport: adjustedBudget.transport.toFixed(2),
//         entertainment: adjustedBudget.entertainment.toFixed(2),
//         savings: adjustedBudget.savings.toFixed(2)
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Error calculating budget suggestion', error });
//   }
// });
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

router.get('/budget-details', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    console.log("data", user);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userPayments = await Payment.find({ user_id: req.user.id });

    const userSpending = {
      groceries: 0,
      dining: 0,
      shopping: 0,
      entertainment: 0,
    };
    
    // Normalize category names and sum up expenses
    userPayments.forEach((payment) => {
      const category = payment.category.toLowerCase();
      if (userSpending.hasOwnProperty(category)) {
        userSpending[category] += payment.amount;
      }
    });

    // Fixed expense calculations
    const totalLoan = user.loan.reduce((sum, item) => sum + item.amount, 0);
    const totalInsurance = user.insurance.reduce((sum, item) => sum + item.amount, 0);
    const totalSubscription = user.subscription.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = totalLoan + totalInsurance + totalSubscription;

    const availableIncome = user.income - (totalExpenses + user.savings);

    if (availableIncome <= 0) {
      return res.status(400).json({ message: 'No available income for budgeting' });
    }

    // Budget allocation
    const budgetAllocation = {
      groceries: 0.35,
      dining: 0.2,
      shopping: 0.2,
      entertainment: 0.25
    };

    // Adjusted budget after recorded spending
    const budget = {
      groceries: Math.max(0, (budgetAllocation.groceries * availableIncome)).toFixed(2),
      dining: Math.max(0, (budgetAllocation.dining * availableIncome)).toFixed(2),
      shopping: Math.max(0, (budgetAllocation.shopping * availableIncome)).toFixed(2),
      entertainment: Math.max(0, (budgetAllocation.entertainment * availableIncome)).toFixed(2)
    };

    res.json({ monthlyBudget: budget, userSpending : userSpending });
  } catch (error) {
    console.error("Error calculating budget suggestion:", error);
    res.status(500).json({ message: 'Error calculating budget suggestion', error });
  }
});

router.post("/generate", authMiddleware,  async (req, res) => {
  try {
    const prompt = req.body.prompt;

    let modifiedPrompt = prompt;

     const matchedTraining = trainingData.find(data => data.prompt.toLowerCase() === prompt.toLowerCase());

      if (matchedTraining) {
         return res.json({ response: matchedTraining.response });
      }


      const spendingQuestionKeywords = ["how much can we spend", "budget for", "spending limit", "groceries", "dining", "shopping", "entertainment"];
      const isSpendingQuestion = spendingQuestionKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
      console.log('isSpendingQuestion', isSpendingQuestion);
      if (isSpendingQuestion) {
        const user = await User.findById(req.user.id);
          console.log("data", user);

          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }

          const userPayments = await Payment.find({ user_id: req.user.id });

          const userSpending = {
            groceries: 0,
            dining: 0,
            shopping: 0,
            entertainment: 0,
          };

          // Normalize category names and sum up expenses
          userPayments.forEach((payment) => {
            const category = payment.category.toLowerCase();
            if (userSpending.hasOwnProperty(category)) {
              userSpending[category] += payment.amount;
            }
          });

          // Fixed expense calculations
          const totalLoan = user.loan.reduce((sum, item) => sum + item.amount, 0);
          const totalInsurance = user.insurance.reduce(
            (sum, item) => sum + item.amount,
            0
          );
          const totalSubscription = user.subscription.reduce(
            (sum, item) => sum + item.amount,
            0
          );
          const totalExpenses = totalLoan + totalInsurance + totalSubscription;

          const availableIncome = user.income - (totalExpenses + user.savings);

          if (availableIncome <= 0) {
            return res
              .status(400)
              .json({ message: "No available income for budgeting" });
          }

          // Budget allocation
          const budgetAllocation = {
            groceries: 0.35,
            dining: 0.2,
            shopping: 0.2,
            entertainment: 0.25,
          };

          // Adjusted budget after recorded spending
          const budget = {
            groceries: Math.max(
              0,
              budgetAllocation.groceries * availableIncome
            ).toFixed(2),
            dining: Math.max(0, budgetAllocation.dining * availableIncome).toFixed(2),
            shopping: Math.max(
              0,
              budgetAllocation.shopping * availableIncome
            ).toFixed(2),
            entertainment: Math.max(
              0,
              budgetAllocation.entertainment * availableIncome
            ).toFixed(2),
          };
        console.log('budget', budget, userPayments);
        const context = trainingData.map(item => `Prompt: "${item.prompt}", Answer: "${item.response}"`).join("\n");
        modifiedPrompt += `\n\nThis is the budget user can spend for a month in indian rupee Budget: ${JSON.stringify(budget)}\n This is the amount already spend by the user - Spent: ${JSON.stringify(userSpending)}\nAnswer with less than 100 characters and in indian rupees and also Here are some examples of user prompts and their corresponding answers:\n${context}\n\n `; //add prompt to answer with less than 30 characters
      }else{
        modifiedPrompt += `\nAnswer with less than 100 characters.`; 
      }
    
    console.log('modified prompt', modifiedPrompt);
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: modifiedPrompt,
    });

    console.log(response.text);
    res.json({ response: response.text });

  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add this new route to authRoutes.js
router.get('/razorpay-key', authMiddleware, (req, res) => {
  try {
    res.json({
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user-details', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Error fetching user details', error });
  }
});

// API to update user details
router.put('/update-user', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phone, bankName, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, // Use req.user.id to get the user ID
      { firstName, lastName, phone, bankName, email },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).json({ message: 'Error updating user details', error });
  }
});
// All other existing routes remain unchanged

// New password reset route
router.post('/reset-password', passwordController.resetPassword);
module.exports = router;