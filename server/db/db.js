const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

const mongoURI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    if (!mongoURI) {
      throw new Error('MongoDB URI is undefined. Please set MONGO_URI in your environment variables.');
    }
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
