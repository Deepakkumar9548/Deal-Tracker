const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dealtracker');
    console.log(`MongoDB Connected: ${conn.connection.host} ✅`);
  } catch (err) {
    console.error(`DB Connection Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;