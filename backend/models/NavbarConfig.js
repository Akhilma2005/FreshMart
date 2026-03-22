const mongoose = require('mongoose');

const navbarConfigSchema = new mongoose.Schema({
  ticker:        [{ type: String }],
  navCategories: [{ label: String, path: String }],
}, { timestamps: true });

module.exports = mongoose.model('NavbarConfig', navbarConfigSchema);
