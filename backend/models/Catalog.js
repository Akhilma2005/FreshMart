const mongoose = require('mongoose');

const catalogItemSchema = new mongoose.Schema({
  id:   { type: String, required: true },
  name: { type: String, required: true },
  unit: { type: String, default: 'kg' },
  image: { type: String, default: '' },
});

const catalogSchema = new mongoose.Schema({
  name:  { type: String, required: true, unique: true },
  emoji: { type: String, default: '🛒' },
  color: { type: String, default: '#16a34a' },
  bg:    { type: String, default: '#f0fdf4' },
  image: { type: String, default: '' },
  items: [catalogItemSchema],
}, { timestamps: true });

module.exports = mongoose.model('Catalog', catalogSchema);
