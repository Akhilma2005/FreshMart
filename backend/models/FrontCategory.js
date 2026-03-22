const mongoose = require('mongoose');

const frontCategorySchema = new mongoose.Schema({
  name:  { type: String, required: true, unique: true },
  icon:  { type: String, default: '🛒' },
  color: { type: String, default: '#51cf66' },
  bg:    { type: String, default: '#f4fce3' },
  image: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('FrontCategory', frontCategorySchema);
