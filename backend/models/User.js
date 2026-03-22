const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, default: null },
  googleId: { type: String, default: null },
  roles:         { type: [String], enum: ['buyer', 'vendor', 'admin', 'pending'], default: ['buyer'] },
  avatar:   { type: String, default: null },
  phone:    { type: String, default: null },
  gender:   { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'], default: null },
  dob:      { type: String, default: null },
  bio:      { type: String, default: null },
  address:       { type: String, default: null },
  city:          { type: String, default: null },
  state:         { type: String, default: null },
  pincode:       { type: String, default: null },
  country:       { type: String, default: 'India' },
  locationLabel: { type: String, default: null },
  lat:           { type: Number, default: null },
  lng:           { type: Number, default: null },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// Virtual for backward compatibility
userSchema.virtual('role').get(function() {
  return this.roles && this.roles.length > 0 ? this.roles[0] : 'buyer';
}).set(function(v) {
  if (!this.roles) this.roles = [];
  if (!this.roles.includes(v)) this.roles = [v]; // For now, setting role replaces the list or just sets first
});

module.exports = mongoose.model('User', userSchema);
