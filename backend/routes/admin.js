const router  = require('express').Router();
const path    = require('path');
const fs      = require('fs');
const { makeUpload } = require('../utils/cloudinary');
const User    = require('../models/User');
const VendorProduct = require('../models/VendorProduct');
const Shop    = require('../models/Shop');
const Order   = require('../models/Order');
const Catalog = require('../models/Catalog');
const VendorPayment = require('../models/VendorPayment');
const FrontCategory = require('../models/FrontCategory');
const NavbarConfig  = require('../models/NavbarConfig');
const Coupon        = require('../models/Coupon');
const authMiddleware = require('../middleware/auth');

const adminOnly = (req, res, next) => {
  if (req.user.roles && !req.user.roles.includes('admin')) return res.status(403).json({ message: 'Admin access only' });
  if (!req.user.roles && req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access only' });
  next();
};

const upload     = makeUpload('catalog');
const fcUpload   = makeUpload('categories');
const shopUpload = makeUpload('shops');

/* ══════════════════════════════════════════════════════
   NAVBAR CONFIG
══════════════════════════════════════════════════════ */
router.get('/navbar-config', async (req, res) => {
  try {
    const config = await NavbarConfig.findOne();
    res.json(config || {});
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/navbar-config', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { ticker, navCategories } = req.body;
    let config = await NavbarConfig.findOne();
    if (!config) config = new NavbarConfig();
    if (ticker)        config.ticker        = ticker;
    if (navCategories) config.navCategories = navCategories;
    await config.save();
    req.app.get('io')?.emit('navbar:updated');
    res.json(config);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ══════════════════════════════════════════════════════
   ADMIN ROLE SETUP
══════════════════════════════════════════════════════ */
// POST /api/admin/role — create admin if none exists
router.post('/role', async (req, res) => {
  try {
    const exists = await User.findOne({ role: 'admin' });
    if (exists) return res.status(409).json({ message: 'Admin role already exists', email: exists.email });
    const bcrypt = require('bcryptjs');
    const { name = 'Admin', email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password are required' });
    const hashed = await bcrypt.hash(password, 10);
    const admin = await User.create({ name, email, password: hashed, roles: ['admin'] });
    res.status(201).json({ message: 'Admin created', email: admin.email });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ══════════════════════════════════════════════════════
   PUBLIC — no auth
══════════════════════════════════════════════════════ */
// Public coupon validate (used by frontend checkout)
router.post('/coupons/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code required' });
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), active: true });
    if (!coupon)                          return res.status(404).json({ message: 'Invalid coupon code' });
    if (new Date() > coupon.expiresAt)    return res.status(400).json({ message: 'Coupon has expired' });
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses)
                                          return res.status(400).json({ message: 'Coupon usage limit reached' });
    if (subtotal < coupon.minOrder)       return res.status(400).json({ message: `Minimum order ₹${coupon.minOrder} required` });
    const discount = coupon.discountType === 'percent'
      ? Math.floor(subtotal * coupon.discountValue / 100)
      : Math.min(coupon.discountValue, subtotal);
    res.json({ valid: true, discount, discountType: coupon.discountType, discountValue: coupon.discountValue, code: coupon.code });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/catalog/public', async (req, res) => {
  try { res.json(await Catalog.find().sort({ createdAt: 1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/front-categories/public', async (req, res) => {
  try { res.json(await FrontCategory.find().sort({ order: 1, createdAt: 1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/search-suggestions', async (req, res) => {
  try {
    const [cats, vendorProducts] = await Promise.all([
      Catalog.find({}, 'name emoji items.name'),
      VendorProduct.find({ status: 'active' }, 'name category emoji'),
    ]);
    const map = new Map();
    cats.forEach(cat => {
      map.set(cat.name.toLowerCase(), { label: cat.name, emoji: cat.emoji || '🛒', type: 'category' });
      cat.items.forEach(item => {
        if (!map.has(item.name.toLowerCase()))
          map.set(item.name.toLowerCase(), { label: item.name, emoji: cat.emoji || '🛒', type: 'item', category: cat.name });
      });
    });
    vendorProducts.forEach(p => {
      if (!map.has(p.name.toLowerCase()))
        map.set(p.name.toLowerCase(), { label: p.name, emoji: p.emoji || '🛒', type: 'product', category: p.category });
    });
    res.json([...map.values()]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ══════════════════════════════════════════════════════
   ROUTES WITH MULTER — inline auth (multer must be first)
══════════════════════════════════════════════════════ */
router.post('/catalog', upload.single('image'), authMiddleware, adminOnly, async (req, res) => {
  try {
    const name  = req.body?.name;
    const emoji = req.body?.emoji || '🛒';
    if (!name?.trim()) return res.status(400).json({ message: 'Category name required' });
    const exists = await Catalog.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ message: 'Category already exists' });
    const imageUrl = req.file ? req.file.path : '';
    const cat = await Catalog.create({ name: name.trim(), emoji, image: imageUrl, items: [] });
    res.status(201).json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/catalog/:id/items', upload.single('image'), authMiddleware, adminOnly, async (req, res) => {
  try {
    const name = req.body?.name;
    const unit = req.body?.unit || 'kg';
    if (!name?.trim()) return res.status(400).json({ message: 'Item name required' });
    const cat = await Catalog.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    const imageUrl = req.file ? req.file.path : '';
    cat.items.push({ id: Date.now().toString(), name: name.trim(), unit, image: imageUrl });
    await cat.save();
    res.status(201).json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── FRONT CATEGORIES ── */
router.get('/front-categories', authMiddleware, adminOnly, async (req, res) => {
  try { res.json(await FrontCategory.find().sort({ order: 1, createdAt: 1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/front-categories/seed', authMiddleware, adminOnly, async (req, res) => {
  try {
    await FrontCategory.deleteMany({});
    await FrontCategory.insertMany([
      { name: 'Fruits',           icon: '🍎', color: '#ff6b6b', bg: '#fff5f5', order: 0 },
      { name: 'Vegetables',       icon: '🥦', color: '#51cf66', bg: '#f4fce3', order: 1 },
      { name: 'Masalas & Spices', icon: '🌶️', color: '#ff922b', bg: '#fff4e6', order: 2 },
      { name: 'Raw Meats',        icon: '🥩', color: '#e03131', bg: '#fff5f5', order: 3 },
      { name: 'Cooking Items',    icon: '🫙', color: '#7950f2', bg: '#f3f0ff', order: 4 },
      { name: 'Dairy',            icon: '🥛', color: '#339af0', bg: '#e7f5ff', order: 5 },
      { name: 'Dry Fruits',       icon: '🥜', color: '#a9770e', bg: '#fff8e1', order: 6 },
    ]);
    req.app.get('io')?.emit('categories:updated');
    res.json({ message: 'Seeded 7 categories' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/front-categories', fcUpload.single('image'), authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, icon, color, bg } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name required' });
    const image = req.file ? req.file.path : '';
    const count = await FrontCategory.countDocuments();
    const cat = await FrontCategory.create({ name: name.trim(), icon: icon || '🛒', color: color || '#51cf66', bg: bg || '#f4fce3', image, order: count });
    req.app.get('io')?.emit('categories:updated');
    res.status(201).json(cat);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'Category already exists' });
    res.status(500).json({ message: e.message });
  }
});

router.patch('/front-categories/:id', fcUpload.single('image'), authMiddleware, adminOnly, async (req, res) => {
  try {
    const updates = {};
    ['name', 'icon', 'color', 'bg', 'order'].forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (req.file) updates.image = req.file.path;
    const cat = await FrontCategory.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    req.app.get('io')?.emit('categories:updated');
    res.json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/front-categories/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const cat = await FrontCategory.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    req.app.get('io')?.emit('categories:updated');
    res.json({ message: 'Category deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── COUPONS (inline auth) ── */
router.get('/coupons', authMiddleware, adminOnly, async (req, res) => {
  try { res.json(await Coupon.find().sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/coupons', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrder, maxUses, expiresAt } = req.body;
    if (!code || !discountValue || !expiresAt) return res.status(400).json({ message: 'code, discountValue and expiresAt are required' });
    const coupon = await Coupon.create({ code: code.toUpperCase().trim(), discountType, discountValue, minOrder: minOrder || 0, maxUses: maxUses || null, expiresAt });
    res.status(201).json(coupon);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'Coupon code already exists' });
    res.status(500).json({ message: e.message });
  }
});

router.patch('/coupons/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const updates = {};
    ['discountType','discountValue','minOrder','maxUses','expiresAt','active'].forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/coupons/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ══════════════════════════════════════════════════════
   ALL OTHER ROUTES — auth applied globally below
══════════════════════════════════════════════════════ */
router.use(authMiddleware, adminOnly);

router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalVendors, totalAdmins, totalProducts, totalOrders, orders] = await Promise.all([
      User.countDocuments({ roles: 'buyer' }),
      User.countDocuments({ roles: 'vendor' }),
      User.countDocuments({ roles: 'admin' }),
      VendorProduct.countDocuments(),
      Order.countDocuments(),
      Order.find({}, 'total'),
    ]);
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    res.json({ totalUsers, totalVendors, totalAdmins, totalProducts, totalOrders, totalRevenue });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/vendors', async (req, res) => {
  try {
    const vendors = await User.find({ roles: 'vendor' }, '-password').sort({ createdAt: -1 });
    const ids = vendors.map(v => v._id);
    const objectIds = ids.map(id => new (require('mongoose').Types.ObjectId)(id.toString()));
    const [shops, payments, productCounts] = await Promise.all([
      Shop.find({ vendorId: { $in: ids } }),
      VendorPayment.find({ vendorId: { $in: ids } }),
      VendorProduct.aggregate([
        { $match: { vendorId: { $in: objectIds } } },
        { $group: { _id: '$vendorId', count: { $sum: 1 }, sales: { $sum: '$sales' } } },
      ]),
    ]);
    const shopMap = Object.fromEntries(shops.map(s => [s.vendorId.toString(), s]));
    const payMap  = Object.fromEntries(payments.map(p => [p.vendorId.toString(), p]));
    const prodMap = Object.fromEntries(productCounts.map(p => [p._id.toString(), p]));
    const result = vendors.map(v => {
      const id  = v._id.toString();
      const pay = payMap[id];
      return {
        _id: v._id, name: v.name, email: v.email, createdAt: v.createdAt, avatar: v.avatar || null,
        shop: shopMap[id] ? {
          shopName: shopMap[id].shopName, tagline: shopMap[id].tagline,
          phone: shopMap[id].phone, city: shopMap[id].city,
          state: shopMap[id].state, address: shopMap[id].address,
          avatar: shopMap[id].avatar || null,
        } : null,
        products: prodMap[id]?.count || 0,
        sales:    prodMap[id]?.sales || 0,
        payment: pay ? {
          upiId: pay.upiId, accountHolder: pay.accountHolder, bankName: pay.bankName,
          accountNumber: pay.accountNumber ? '****' + pay.accountNumber.slice(-4) : '',
          ifsc: pay.ifsc, accountType: pay.accountType,
        } : null,
      };
    });
    res.json(result);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, roles } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'name, email, and password required' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already in use' });
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      roles: roles || [role || 'buyer']
    });
    req.app.get('io')?.emit('users:updated');
    res.status(201).json({ message: 'User created', user });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/users', async (req, res) => {
  try { res.json(await User.find({}, '-password').sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const updates = {};
    ['name', 'role', 'roles'].forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, select: '-password' });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' });
    await User.findByIdAndDelete(req.params.id);
    req.app.get('io')?.emit('users:updated');
    res.json({ message: 'User deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/products', async (req, res) => {
  try { res.json(await VendorProduct.find({ isCustom: true }).sort({ createdAt: -1 }).populate('vendorId', 'name email')); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/admin/pending-products — only custom products need approval
router.get('/pending-products', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { isCustom: true, approvalStatus: 'pending' };
    if (status) filter.approvalStatus = status;
    const products = await VendorProduct.find(filter)
      .sort({ createdAt: -1 })
      .populate('vendorId', 'name email');
    res.json(products);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/admin/pending-products/:id — approve or reject
router.patch('/pending-products/:id', async (req, res) => {
  try {
    const { action, rejectionNote } = req.body;
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ message: 'action must be approve or reject' });
    const updates = {
      approvalStatus: action === 'approve' ? 'approved' : 'rejected',
      status: action === 'approve' ? 'active' : 'out',
      rejectionNote: action === 'reject' ? (rejectionNote || 'Rejected by admin') : '',
    };
    const product = await VendorProduct.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('vendorId', 'name email');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    req.app.get('io')?.emit('products:updated');
    res.json({ message: `Product ${action}d`, product });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/products/:id', async (req, res) => {
  try {
    const updates = {};
    ['name', 'category', 'price', 'discountPrice', 'discountPct', 'stock', 'unit', 'description', 'status', 'emoji']
      .forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const p = await VendorProduct.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!p) return res.status(404).json({ message: 'Product not found' });
    req.app.get('io')?.emit('products:updated');
    res.json({ message: 'Product updated', product: p });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await VendorProduct.findByIdAndDelete(req.params.id);
    req.app.get('io')?.emit('products:updated');
    res.json({ message: 'Product deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/products/vendor', async (req, res) => {
  try {
    const { vendorId, name, price, stock } = req.body;
    if (!vendorId || !name || price == null || stock == null)
      return res.status(400).json({ message: 'vendorId, name, price and stock are required.' });
    const product = await VendorProduct.create({ ...req.body });
    res.status(201).json({ message: 'Product added', product });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/shops', async (req, res) => {
  try { res.json(await Shop.find().sort({ createdAt: -1 }).populate('vendorId', 'name email')); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/shops/:id', async (req, res) => {
  try {
    const updates = {};
    ['shopName','tagline','phone','email','website','description','address','city','state','pincode']
      .forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const shop = await Shop.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('vendorId','name email');
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    res.json({ message: 'Shop updated', shop });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/shops/:id/avatar', shopUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
    const avatarUrl = req.file.path;
    const shop = await Shop.findByIdAndUpdate(req.params.id, { avatar: avatarUrl }, { new: true }).populate('vendorId','name email');
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    res.json({ avatarUrl, shop });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/shops/:id', async (req, res) => {
  try {
    await Shop.findByIdAndDelete(req.params.id);
    req.app.get('io')?.emit('shops:updated');
    res.json({ message: 'Shop deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/admin/migrate/fix-catalog-products — one-time cleanup
router.post('/migrate/fix-catalog-products', async (req, res) => {
  try {
    // Clear approvalStatus from all catalog products (isCustom: false or null)
    const result = await VendorProduct.updateMany(
      { $or: [{ isCustom: false }, { isCustom: null }, { isCustom: { $exists: false } }] },
      { $unset: { approvalStatus: '' }, $set: { isCustom: false } }
    );
    res.json({ message: `Fixed ${result.modifiedCount} catalog products` });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/orders/all', async (req, res) => {
  try {
    const [{ deletedCount }] = await Promise.all([
      Order.deleteMany({}),
      VendorProduct.updateMany({}, { $set: { sales: 0 } }),
      Coupon.updateMany({}, { $set: { usedCount: 0 } }),
    ]);
    req.app.get('io')?.emit('products:updated');
    res.json({ message: `Deleted ${deletedCount} orders. Sales and coupon usage reset to 0.` });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('userId', 'name email');
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
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/catalog', async (req, res) => {
  try { res.json(await Catalog.find().sort({ createdAt: 1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/catalog/:id', async (req, res) => {
  try {
    const updates = {};
    ['name', 'emoji', 'color', 'bg', 'image'].forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const cat = await Catalog.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    req.app.get('io')?.emit('catalog:updated');
    res.json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/catalog/:id', async (req, res) => {
  try {
    await Catalog.findByIdAndDelete(req.params.id);
    req.app.get('io')?.emit('catalog:updated');
    res.json({ message: 'Category deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/catalog/:id/items/:itemId', async (req, res) => {
  try {
    const cat = await Catalog.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    const item = cat.items.find(i => i.id === req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (req.body.name !== undefined) item.name = req.body.name;
    if (req.body.unit !== undefined) item.unit = req.body.unit;
    cat.markModified('items');
    await cat.save();
    req.app.get('io')?.emit('catalog:updated');
    res.json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/catalog/:id/items/:itemId', async (req, res) => {
  try {
    const cat = await Catalog.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    cat.items = cat.items.filter(i => i.id !== req.params.itemId);
    await cat.save();
    req.app.get('io')?.emit('catalog:updated');
    res.json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
