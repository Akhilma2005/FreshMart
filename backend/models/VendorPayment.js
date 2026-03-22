const mongoose = require('mongoose');

const vendorPaymentSchema = new mongoose.Schema({
  vendorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  upiId:           { type: String, default: '' },
  accountHolder:   { type: String, default: '' },
  bankName:        { type: String, default: '' },
  accountNumber:   { type: String, default: '' },
  ifsc:            { type: String, default: '' },
  accountType:     { type: String, enum: ['savings', 'current'], default: 'savings' },
}, { timestamps: true });

module.exports = mongoose.model('VendorPayment', vendorPaymentSchema);
