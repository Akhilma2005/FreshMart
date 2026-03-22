const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  vendorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  shopName:    { type: String, required: true },
  tagline:     { type: String, default: null },
  phone:       { type: String, default: null },
  email:       { type: String, default: null },
  website:     { type: String, default: null },
  description: { type: String, default: null },
  address:     { type: String, default: null },
  city:        { type: String, default: null },
  state:       { type: String, default: null },
  pincode:     { type: String, default: null },
  avatar:      { type: String, default: null },

  // Seller stats
  totalRevenue:        { type: Number, default: 0 },
  totalOrdersFulfilled:{ type: Number, default: 0 },
  rating:              { type: Number, default: 0 },
  totalRatings:        { type: Number, default: 0 },
  isVerified:          { type: Boolean, default: false },
  isActive:            { type: Boolean, default: true },
  gstNumber:           { type: String, default: null },
  returnPolicy:        { type: String, default: null },
  deliveryInfo:        { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);
