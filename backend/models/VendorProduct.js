const mongoose = require('mongoose');

const vendorProductSchema = new mongoose.Schema({
  vendorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:          { type: String, required: true },
  category:      { type: String },
  price:         { type: Number, required: true },
  discountPrice: { type: Number, default: null },
  discountPct:   { type: Number, default: 0 },
  stock:         { type: Number, required: true },
  unit:          { type: String },
  description:   { type: String },
  image:         { type: String },
  emoji:         { type: String, default: '🛒' },
  status:        { type: String, enum: ['active', 'out'], default: 'active' },
  approvalStatus: { type: String, enum: ['approved', 'pending', 'rejected'], default: null },
  isCustom:      { type: Boolean, default: false },
  rejectionNote: { type: String, default: '' },
  sales:         { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  totalReviews:  { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('VendorProduct', vendorProductSchema);
