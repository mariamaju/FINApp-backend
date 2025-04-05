// controllers/passwordController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.resetPassword = async (req, res) => {
  try {
    console.log('Reset password request received:', req.body); // Add logging
    
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required'
      });
    }

    const user = await User.findOne({ email });
    console.log('User found:', user); // Add logging
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found. Please check your email address.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    
    await user.save();
    console.log('Password updated successfully for user:', email); // Add logging

    res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while resetting password',
      error: error.message
    });
  }
};