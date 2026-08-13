require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100kb' }));

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}

async function connectDatabase() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

async function ensureDefaultUser() {
  const username = process.env.DEFAULT_USER_USERNAME || '2025';
  const password = process.env.DEFAULT_USER_PASSWORD || '2026';
  const pin = process.env.DEFAULT_USER_PIN || '2025';
  const exists = await User.findOne({ username });
  if (!exists) {
    await User.create({
      username,
      passwordHash: await bcrypt.hash(password, 12),
      pinHash: await bcrypt.hash(pin, 12),
      fullName: process.env.DEFAULT_USER_FULL_NAME || 'Unity Banking Customer'
    });
  }
}

app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  try {
    await connectDatabase();
    await ensureDefaultUser();
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database connection failed.' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'Unity Banking API' }));

app.post('/api/auth/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }
  const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, username: user.username });
});

app.post('/api/auth/verify-pin', auth, async (req, res) => {
  const pin = String(req.body.pin || '');
  const user = await User.findById(req.auth.userId);
  if (!user || !(await bcrypt.compare(pin, user.pinHash))) {
    return res.status(401).json({ message: 'Invalid PIN.' });
  }
  res.json({ verified: true });
});

app.get('/api/account', auth, async (req, res) => {
  const user = await User.findById(req.auth.userId).select('username fullName email phone notifications');
  if (!user) return res.status(404).json({ message: 'Account not found.' });
  res.json(user);
});

app.put('/api/account', auth, async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user) return res.status(404).json({ message: 'Account not found.' });

  const currentPassword = String(req.body.currentPassword || '');
  if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }

  const username = String(req.body.username || user.username).trim();
  if (username.length < 3 || username.length > 40) {
    return res.status(400).json({ message: 'Username must be between 3 and 40 characters.' });
  }
  const duplicate = await User.findOne({ username, _id: { $ne: user._id } });
  if (duplicate) return res.status(409).json({ message: 'That username is already in use.' });

  user.username = username;
  user.fullName = String(req.body.fullName ?? user.fullName).trim();
  user.email = String(req.body.email ?? user.email).trim();
  user.phone = String(req.body.phone ?? user.phone).trim();
  if (['email', 'sms', 'none'].includes(req.body.notifications)) user.notifications = req.body.notifications;

  const newPassword = String(req.body.newPassword || '');
  if (newPassword) {
    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  const newPin = String(req.body.newPin || '');
  if (newPin) {
    const currentPin = String(req.body.currentPin || '');
    if (!(await bcrypt.compare(currentPin, user.pinHash))) {
      return res.status(401).json({ message: 'Current PIN is incorrect.' });
    }
    if (!/^\d{4,6}$/.test(newPin)) return res.status(400).json({ message: 'PIN must contain 4 to 6 digits.' });
    user.pinHash = await bcrypt.hash(newPin, 12);
  }

  await user.save();
  res.json({ message: 'Account settings updated successfully.', username: user.username });
});

app.use(express.static(path.resolve(__dirname, '..')));
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, '..', 'index.html')));

if (require.main === module) {
  connectDatabase()
    .then(ensureDefaultUser)
    .then(() => app.listen(PORT, () => console.log(`Unity Banking running on port ${PORT}`)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = app;
