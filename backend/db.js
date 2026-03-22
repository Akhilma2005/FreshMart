const mongoose = require('mongoose');
const Product = require('./models/Product');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  // Remove all default seeded products from DB
  await Product.deleteMany({});
};

module.exports = connectDB;
