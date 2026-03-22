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
  cors: { origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }
});

// make io accessible in routes
app.set('io', io);

const port = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin', 'build')));
app.get('/admin/*path', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'build', 'index.html'));
});

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
