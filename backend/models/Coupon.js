const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType:{ type: String, enum: ['percent', 'flat'], default: 'percent' },
  discountValue:{ type: Number, required: true },
  minOrder:    { type: Number, default: 0 },
  maxUses:     { type: Number, default: null },   // null = unlimited
  usedCount:   { type: Number, default: 0 },
  expiresAt:   { type: Date, required: true },
  active:      { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
