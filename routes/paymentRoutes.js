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

module.exports = router;