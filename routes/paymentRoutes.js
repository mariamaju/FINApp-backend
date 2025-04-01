const express = require("express");
const moment = require("moment");
const mongoose = require("mongoose");
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
    console.log("data", req.body);
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
  

module.exports = router;