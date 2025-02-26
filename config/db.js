const mongoose = require('mongoose');
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://mariamaju3003:m%4061%40mp04@cluster0.e0pah.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log('MongoDB connected');
  } catch (err) {
    console.error("error",err.message);
  }
};
module.exports = connectDB;