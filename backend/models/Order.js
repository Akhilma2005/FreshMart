const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId:  { type: String, unique: true },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items:    [{ productId: mongoose.Schema.Types.Mixed, vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, name: String, image: String, emoji: String, unit: String, qty: Number, price: Number }],
  subtotal: Number,
  discount: Number,
  delivery: Number,
  total:    Number,
  coupon:   String,
  address:  { name: String, phone: String, line1: String, city: String, pincode: String },
  payMode:  String,
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
