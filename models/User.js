const mongoose = require('mongoose');
const ExpenseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true }
});

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  income: { type: Number, required: true, default: 0 },
  savings: { type: Number, required: true, default: 0 },
  loan: [ExpenseSchema],
  insurance: [ExpenseSchema],
  subscription: [ExpenseSchema],
  transportation: [ExpenseSchema]
});
module.exports = mongoose.model('User', UserSchema);