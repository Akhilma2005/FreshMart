const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const mailer = require('../utils/mailer');
const otpStore = require('../utils/otpStore');

const JWT_SECRET = process.env.JWT_SECRET || 'freshmart_secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const ALLOWED_EMAIL = /^[a-zA-Z0-9._%+\-]+@(gmail|hotmail)\.com$/;

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, roles: user.roles, role: user.role } });
  } catch (e) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !ALLOWED_EMAIL.test(email))
    return res.status(400).json({ message: 'Only @gmail.com or @hotmail.com addresses are allowed.' });

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: 'An account with this email already exists. Please log in.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, otp);

  try {
    console.log('Sending OTP to:', email, '| MAIL_USER:', process.env.MAIL_USER);
    await mailer.sendMail({
      from: `"FreshMart" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Your FreshMart OTP Code',
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb">
          <h2 style="color:#0e9f6e;margin-bottom:4px">FreshMart</h2>
          <p style="color:#374151">Your one-time verification code is:</p>
          <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#065f46;margin:24px 0;text-align:center">${otp}</div>
          <p style="color:#6b7280;font-size:13px">This OTP expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
          <p style="color:#9ca3af;font-size:12px">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
    res.json({ message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('Mailer error:', err.message);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' });
  const error = otpStore.verify(email, otp);
  if (error) return res.status(400).json({ message: error });
  res.json({ message: 'Email verified successfully.' });
});

router.post('/register', async (req, res) => {
  const { name, email, password, role = 'buyer' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
  if (!['buyer', 'vendor'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  if (!ALLOWED_EMAIL.test(email))
    return res.status(400).json({ message: 'Only @gmail.com or @hotmail.com addresses are allowed.' });

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: 'Email already exists' });

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashed, role, roles: [role || 'buyer'] });
  res.json({ message: 'Registered successfully' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !user.password || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, roles: user.roles, role: user.role } });
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential required' });

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID, clockSkewInSeconds: 300 });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // New user — create with pending role, let frontend ask for role
      user = await User.create({ name, email, googleId, avatar: picture, role: 'pending' });
      const tempToken = jwt.sign({ id: user._id, role: 'pending' }, JWT_SECRET, { expiresIn: '1h' });
      return res.json({ needsRole: true, tempToken, user: { id: user._id, name: user.name, email: user.email } });
    }

    // Existing user — link googleId if missing
    if (!user.googleId) { user.googleId = googleId; await user.save(); }

    if (user.roles.includes('pending')) {
      const tempToken = jwt.sign({ id: user._id, roles: ['pending'] }, JWT_SECRET, { expiresIn: '1h' });
      return res.json({ needsRole: true, tempToken, user: { id: user._id, name: user.name, email: user.email } });
    }

    const token = jwt.sign({ id: user._id, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, roles: user.roles, role: user.role } });
  } catch (e) {
    res.status(401).json({ message: 'Google sign-in failed: ' + e.message });
  }
});

// PATCH /api/auth/set-role
router.patch('/set-role', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    if (decoded.roles && !decoded.roles.includes('pending')) return res.status(400).json({ message: 'Role already set' });
    if (decoded.role && decoded.role !== 'pending') return res.status(400).json({ message: 'Role already set' });

    const { role } = req.body;
    if (!['buyer', 'vendor'].includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const user = await User.findByIdAndUpdate(decoded.id, { roles: [role] }, { new: true });
    const token = jwt.sign({ id: user._id, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, roles: user.roles, role: user.role } });
  } catch (e) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

router.get('/users', async (req, res) => {
  const users = await User.find({}, '-password');
  res.json(users);
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'No account found with this email.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(`reset_${email}`, otp);

  try {
    await mailer.sendMail({
      from: `"FreshMart" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'FreshMart — Password Reset Code',
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;
                    padding:32px;border-radius:12px;border:1px solid #e5e7eb">
          <h2 style="color:#0e9f6e;margin-bottom:4px">🔐 FreshMart</h2>
          <p style="color:#374151">Your password reset verification code is:</p>
          <div style="font-size:40px;font-weight:800;letter-spacing:12px;
                      color:#065f46;margin:24px 0;text-align:center;
                      background:#f0fdf4;padding:16px;border-radius:10px">${otp}</div>
          <p style="color:#6b7280;font-size:13px">
            Expires in <strong>5 minutes</strong>. Do not share with anyone.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
          <p style="color:#9ca3af;font-size:12px">
            If you did not request this, please ignore this email.
          </p>
        </div>
      `,
    });
    res.json({ message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('Mailer error:', err.message);
    res.status(500).json({ message: 'Failed to send email. Please try again.' });
  }
});

// POST /api/auth/verify-reset-otp
router.post('/verify-reset-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and code are required.' });
  const error = otpStore.verify(`reset_${email}`, otp);
  if (error) return res.status(400).json({ message: error });
  otpStore.set(`reset_verified_${email}`, otp);
  res.json({ message: 'Code verified.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({ message: 'All fields are required.' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });

  const error = otpStore.verify(`reset_verified_${email}`, otp);
  if (error) return res.status(400).json({ message: 'Session expired. Please start over.' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found.' });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Password reset successfully.' });
});

// POST /api/auth/setup-admin (one-time use)
router.post('/setup-admin', async (req, res) => {
  try {
    const exists = await User.findOne({ role: 'admin' });
    if (exists) return res.status(409).json({ message: 'Admin already exists', email: exists.email });
    const hashed = await bcrypt.hash('admin123', 10);
    const admin = await User.create({ name: 'Admin', email: 'admin@freshmart.com', password: hashed, role: 'admin' });
    res.json({ message: 'Admin created', email: admin.email, password: 'admin123' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/auth/create-admin-now (temporary)
router.post('/create-admin-now', async (req, res) => {
  try {
    const email = 'maakhil432005@gmail.com';
    const exists = await User.findOne({ email });
    if (exists) {
      exists.password = await bcrypt.hash('1', 10);
      exists.role = 'admin';
      exists.roles = ['admin'];
      await exists.save();
      return res.json({ message: 'Updated user to Admin', email: exists.email });
    }
    const hashed = await bcrypt.hash('1', 10);
    const u = await User.create({ name: 'Admin', email, password: hashed, role: 'admin', roles: ['admin'] });
    res.json({ message: 'Created Admin user', email: u.email });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
