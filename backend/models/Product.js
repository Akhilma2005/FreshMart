const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id:       { type: Number, unique: true },
  name:     String,
  category: String,
  price:    Number,
  unit:     String,
  rating:   Number,
  reviews:  Number,
  badge:    String,
  emoji:    String,
  image:    String,
  desc:     String,
});

module.exports = mongoose.model('Product', productSchema);
