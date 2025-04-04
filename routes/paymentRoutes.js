require('dotenv').config();
const express = require("express");
const moment = require("moment");
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const authMiddleware = require("../middlewares/authMiddleware");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { log } = require('console');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: "rzp_test_vHgDR6SwBuo9ig",  // Replace with your key
  key_secret: "PCzJdCCZmCYAeFUf79kNYjOE" // Replace with your secret
});
console.log("RAZORPAY INSTANCE CREATED WITH:", {
  key_id: razorpay.key_id ? "PRESENT" : "MISSING"
});
// Create Razorpay order
router.post("/create-order", authMiddleware, async (req, res) => {
  // const razorpay = new Razorpay({
  //   key_id: "rzp_test_DanB6YGMLAzbdv",  // Replace with your key
  //   key_secret: "lP6f8Eyk9BqCDxrDkYIZI9nx" // Replace with your secret
  // });
  try {
    const { amount, currency = 'INR' } = req.body;
    
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };
    console.log("Options");
    
    console.log(options);
    

    const order = await razorpay.orders.create(options);
    console.log(order);
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ 
      success: false,
      message: "Error creating payment order"
    });
  }
});




// Verify payment and save to database
router.post("/verify", authMiddleware, async (req, res) => {
  //try {
     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, category } = req.body;
  //   console.log(req.body);
    
  // Verify payment signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(body.toString())
  .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature;
    
  //   if (!isAuthentic) {
  //     return res.status(400).json({ 
  //       success: false,
  //       message: "Payment verification failed"
  //     });
  //   }

  //   // Save payment to database
  //   const newPayment = new Payment({
  //     user_id: req.user.id,
  //     amount,
  //     category,
  //     payment_id: razorpay_payment_id,
  //     order_id: razorpay_order_id,
  //     payment_status: 'completed'
  //   });

  //   await newPayment.save();

  //   res.json({
  //     success: true,
  //     message: "Payment verified and saved successfully"
  //   });
  // } catch (error) {
  //   console.error("Error verifying payment:", error);
  //   res.status(500).json({ 
  //     success: false,
  //     message: "Error verifying payment"
  //   });
  // }
  const { razorpay_payment_id } = req.body;

  try {
    if (!razorpay_payment_id) {
      return res.status(400).json({ success: false, message: "Payment ID is required" });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status === 'captured') {
      // Save to DB or update payment status
      return res.json({
        success: true,
        message: "Payment verified successfully",
        payment
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Payment status is ${payment.status}`
      });
    }
  } catch (error) {
    console.error("Error verifying payment by ID:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Existing routes remain unchanged
router.post("/", authMiddleware, async (req, res) => {
  // ... existing code ...
});

router.get("/", async (req, res) => {
  // ... existing code ...
});

router.get("/total-expenses", authMiddleware, async (req, res) => {
  // ... existing code ...
});

module.exports = router;