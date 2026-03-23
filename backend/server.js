require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        origin.includes('localhost') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.netlify.app') ||
        origin === process.env.FRONTEND_URL ||
        origin === process.env.ADMIN_URL
      ) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});

// make io accessible in routes
app.set('io', io);

const port = process.env.PORT || 5000;

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
    // Allow if explicitly listed
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    // Allow any Vercel, Render, or Netlify preview/production URL
    if (
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.netlify.app')
    ) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin', 'build')));
app.get('/admin/*path', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'build', 'index.html'));
});

// Keep-alive ping for Render free tier
app.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/vendor', require('./routes/vendor'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/search', require('./routes/search'));
app.use('/api/reviews', require('./routes/reviews'));

// vendor joins their own room by vendorId
io.on('connection', (socket) => {
  socket.on('join:vendor', (vendorId) => {
    socket.join(`vendor:${vendorId}`);
  });
});

// Self-ping every 14 minutes to prevent Render free tier from sleeping
const BACKEND_URL = process.env.BACKEND_URL || 'https://freshmart-1-z1ib.onrender.com';
setInterval(() => {
  fetch(`${BACKEND_URL}/ping`).catch(() => {});
}, 14 * 60 * 1000);

connectDB().then(async () => {
  // One-time migration: unset approvalStatus from catalog products (isCustom: false/null)
  const VendorProduct = require('./models/VendorProduct');
  await VendorProduct.updateMany(
    { $or: [{ isCustom: false }, { isCustom: null }, { isCustom: { $exists: false } }] },
    { $unset: { approvalStatus: '' }, $set: { isCustom: false } }
  ).catch(() => {});

  server.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Kill the process and restart.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
});
