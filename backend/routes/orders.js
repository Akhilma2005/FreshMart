const router = require('express').Router();
const Order = require('../models/Order');
const VendorProduct = require('../models/VendorProduct');
const Coupon = require('../models/Coupon');
const authMiddleware = require('../middleware/auth');


// DELETE /api/orders/clear?userId=:id
router.delete('/clear', authMiddleware, async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: 'userId is required' });
  const { deletedCount } = await Order.deleteMany({ userId });
  res.json({ message: `Deleted ${deletedCount} orders` });
});

// GET /api/orders?userId=:id
router.get('/', authMiddleware, async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: 'userId is required' });
  const orders = await Order.find({ userId }).sort({ createdAt: -1 });
  const fixImg = (img) => img?.startsWith('/uploads/') ? `http://localhost:5000${img}` : (img || '');

  const resolved = await Promise.all(orders.map(async (order) => {
    const items = await Promise.all(order.items.map(async (item) => {
      const base = item.toObject ? item.toObject() : { ...item };
      try {
        const vp = await VendorProduct.findById(item.productId, 'name image emoji unit').lean();
        if (vp) return { ...base, name: base.name || vp.name, image: fixImg(base.image || vp.image), emoji: base.emoji || vp.emoji || '🛒', unit: base.unit || vp.unit || '' };
      } catch {}
      return { ...base, image: fixImg(base.image) };
    }));
    return { ...order.toObject(), items };
  }));

  res.json(resolved);
});

// POST /api/orders
router.post('/', async (req, res) => {
  const { userId, items, subtotal, discount, delivery, total, coupon, address, payMode } = req.body;
  if (!items?.length) return res.status(400).json({ message: 'No items in order' });

  // Resolve image from DB for each item if not provided
  const resolvedItems = await Promise.all(items.map(async (item) => {
    if (item.image) return item;
    try {
      const vp = await VendorProduct.findById(item.productId, 'image emoji').lean();
      if (vp) return { ...item, image: vp.image || '', emoji: item.emoji || vp.emoji || '🛒' };
    } catch {}
    return item;
  }));

  // Generate orderId
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const now = new Date();
  const prefix = `10${now.getFullYear()}${MONTHS[now.getMonth()]}`;
  const last = await Order.findOne({ orderId: new RegExp(`^${prefix}`) }).sort({ orderId: -1 });
  const seq = last ? parseInt(last.orderId.slice(-4)) + 1 : 1;
  const orderId = `${prefix}${String(seq).padStart(4, '0')}`;

  const order = await Order.create({ orderId, userId, items: resolvedItems, subtotal, discount, delivery, total, coupon, address, payMode });

  // increment coupon usage
  if (coupon) await Coupon.findOneAndUpdate({ code: coupon.toUpperCase() }, { $inc: { usedCount: 1 } });

  // update stock + sales per product, then emit real-time update to each vendor
  const io = req.app.get('io');
  const vendorUpdates = {}; // vendorId -> [updated product stats]

  await Promise.all(items.map(async (item) => {
    try {
      const product = await VendorProduct.findByIdAndUpdate(
        item.productId,
        {
          $inc: { sales: item.qty, stock: -item.qty },
        },
        { new: true }
      );
      if (!product) return;
      // mark out of stock if stock hits 0
      if (product.stock <= 0) {
        product.stock = 0;
        product.status = 'out';
        await product.save();
      }
      const vid = product.vendorId.toString();
      if (!vendorUpdates[vid]) vendorUpdates[vid] = [];
      vendorUpdates[vid].push({
        _id:          product._id,
        stock:        product.stock,
        status:       product.status,
        sales:        product.sales,
        qtySold:      product.sales,
        revenue:      (product.discountPrice || product.price) * product.sales,
        orderCount:   1, // incremental
      });
    } catch (e) { /* product may not be a VendorProduct */ }
  }));

  // emit to each affected vendor's room
  if (io) {
    Object.entries(vendorUpdates).forEach(([vendorId, updates]) => {
      io.to(`vendor:${vendorId}`).emit('vendor:product-update', updates);
    });
  }

  res.status(201).json({ message: 'Order placed successfully', orderId: order.orderId });
});

module.exports = router;
