require('dotenv').config();
const express = require("express");
const moment = require("moment");
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const authMiddleware = require("../middlewares/authMiddleware");
const Razorpay = require('razorpay');
const crypto = require('crypto');

const router = express.Router();

// Initialize Razorpay with environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay order
router.post("/create-order", authMiddleware, async (req, res) => {
  try {
    const { amount, currency = 'INR', notes } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // Convert amount to paisa (Razorpay expects amount in smallest currency unit)
    const amountInPaisa = Math.round(amount * 100);

    const options = {
      amount: amountInPaisa,
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: notes || {} // Optional notes you want to pass
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order: {
        ...order,
        displayAmount: amount // Send back the original amount for display purposes
      }
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ success: false, message: "Error creating payment order" });
  }
});

// Verify payment and save to database
router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, category, notes } = req.body;

    // Verify payment signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid Signature" });
    }

    // Capture Payment - amount should be in paisa
    const amountInPaisa = Math.round(amount * 100);
    const captureResponse = await razorpay.payments.capture(
      razorpay_payment_id,
      amountInPaisa,
      "INR"
    );

    if (captureResponse.status !== "captured") {
      return res.status(400).json({ success: false, message: "Payment could not be captured" });
    }

    // Save payment details to the database
    const newPayment = new Payment({
      user_id: req.user.id,
      amount: amount, // Store the original amount (in rupees)
      amount_in_paisa: amountInPaisa, // Store the amount in paisa for reference
      category,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      payment_status: 'completed',
      notes: notes || {},
      payment_method: captureResponse.method,
      bank: captureResponse.bank,
      wallet: captureResponse.wallet,
      vpa: captureResponse.vpa,
      timestamp: new Date()
    });

    await newPayment.save();

    res.json({
      success: true,
      message: "Payment verified and captured successfully",
      payment: {
        id: newPayment._id,
        amount: newPayment.amount,
        status: newPayment.payment_status,
        timestamp: newPayment.timestamp
      }
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.get('/payments-by-category', authMiddleware, async (req, res) => {
  try {
    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();

    const payments = await Payment.aggregate([
      {
        $match: {
          user_id: mongoose.Types.ObjectId(req.user.id), 
          date: { $gte: startOfMonth, $lte: endOfMonth } 
        }
      },
      {
        $group: {
          _id: "$category", 
          totalAmount: { $sum: "$amount" }, 
          payments: { $push: "$$ROOT" } 
        }
      },
      {
        $project: {
          category: "$_id", 
          totalAmount: 1,
          payments: 1,
          _id: 0 
        }
      }
    ]);

    // Fetch user details
    const user = await user.findById(req.user.id).select('-password'); 

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: "Payments grouped by category for the current month",
      user, 
      data: payments
    });
  } catch (error) {
    console.error("Error fetching payments grouped by category:", error);
    res.status(500).json({ success: false, message: "Error fetching payments", error });
  }
});
router.get("/total-expenses", authMiddleware,  async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from request
    const date = new Date(); // Get current date

    const startOfDay = moment(date).startOf("day").toDate();
    const endOfDay = moment(date).endOf("day").toDate();

    const totalExpenses = await Payment.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(userId),
          date: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    console.log("totalExpenses", totalExpenses);
    res.json({
      date: moment(date).format("YYYY-MM-DD"),
      totalExpenses: totalExpenses.length > 0 ? totalExpenses[0].totalAmount : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { amount, category } = req.body;

    if (!amount || !category) {
      return res.status(400).json({ message: "All fields are required" });
    }
    console.log("data", req.body, req.user);
    const newPayment = new Payment({user_id : req.user.id , amount, category });
    await newPayment.save();

    res.status(201).json({ message: "Payment saved successfully" });
  } catch (error) {
    console.error("Error saving payment:", error);
    res.status(500).json({ message: "Error saving payment" });
  }
});

// Get all payments (optional)
router.get("/", async (req, res) => {
  try {
    const payments = await Payment.find();
    res.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ message: "Error fetching payments" });
  }
});
module.exports = router;