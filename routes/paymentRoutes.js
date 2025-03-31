const express = require("express");
const Payment = require("../models/Payment");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Store a payment
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