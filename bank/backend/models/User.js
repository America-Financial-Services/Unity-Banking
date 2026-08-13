const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 40 },
  passwordHash: { type: String, required: true },
  pinHash: { type: String, required: true },
  fullName: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  notifications: { type: String, enum: ['email', 'sms', 'none'], default: 'email' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
