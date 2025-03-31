const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

module.exports = mongoose.model("Payment", PaymentSchema);