const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const Shop = require('../models/Shop');
const VendorProduct = require('../models/VendorProduct');
const VendorPayment = require('../models/VendorPayment');
const authMiddleware = require('../middleware/auth');
const { makeUpload } = require('../utils/cloudinary');

const catalogUploadMiddleware = makeUpload('catalog');
const shopUploadMiddleware    = makeUpload('shops');

const UPI_HANDLES = [
  'okaxis','oksbi','okicici','okhdfcbank','ybl','ibl','axl','paytm','apl',
  'gpay','upi','fbl','kotak','indus','pnb','boi','bob','cnrb','ucobank',
  'unionbank','idbi','federal','kvb','jkb','rbl','sib','tmb','dbs','hsbc',
  'citi','sc','icici','sbi','hdfc','axis','airtel','jio','icicipay','hdfcbank',
];

const validateUpi = (upiId) => {
  if (!upiId || typeof upiId !== 'string') return 'UPI ID is required.';
  const trimmed = upiId.trim().toLowerCase();
  if (!/^[a-zA-Z0-9._\-+]+@[a-zA-Z0-9]+$/.test(trimmed))
    return 'Invalid UPI ID format. Must be like name@bankhandle';
  const handle = trimmed.split('@')[1];
  if (!UPI_HANDLES.includes(handle))
    return `Unknown UPI handle "@${handle}". Please check your UPI ID.`;
  return null;
};

const BANK_MAP = {
  okaxis: 'Axis Bank', oksbi: 'State Bank of India', okicici: 'ICICI Bank',
  okhdfcbank: 'HDFC Bank', ybl: 'PhonePe (Yes Bank)', ibl: 'PhonePe (IndusInd)',
  axl: 'PhonePe (Axis)', paytm: 'Paytm Payments Bank', apl: 'Amazon Pay',
  gpay: 'Google Pay', upi: 'Generic UPI', fbl: 'Federal Bank',
  kotak: 'Kotak Mahindra Bank', indus: 'IndusInd Bank', pnb: 'Punjab National Bank',
  boi: 'Bank of India', bob: 'Bank of Baroda', airtel: 'Airtel Payments Bank',
  jio: 'Jio Payments Bank', icici: 'ICICI Bank', sbi: 'State Bank of India',
  hdfc: 'HDFC Bank', axis: 'Axis Bank', hdfcbank: 'HDFC Bank',
};

// POST /api/vendor/verify-upi — public, no auth needed
router.post('/verify-upi', (req, res) => {
  const upiId = req.body?.upiId;
  const error = validateUpi(upiId);
  if (error) return res.status(400).json({ valid: false, message: error });
  const handle = upiId.trim().toLowerCase().split('@')[1];
  const bank = BANK_MAP[handle] || 'Valid UPI Handle';
  res.json({ valid: true, bank, handle, message: `Valid UPI ID — ${bank}` });
});

const PAYMENT_FIELDS = ['upiId', 'accountHolder', 'bankName', 'accountNumber', 'ifsc', 'accountType'];

const vendorOnly = (req, res, next) => {
  const isVendor = req.user?.roles?.includes('vendor') || req.user?.role === 'vendor';
  const isAdmin  = req.user?.roles?.includes('admin')  || req.user?.role === 'admin';
  if (!isVendor && !isAdmin) return res.status(403).json({ message: 'Vendor access only' });
  next();
};

// All routes below require auth + vendor role
router.use(authMiddleware, vendorOnly);

const catalogUpload = catalogUploadMiddleware;

// POST /api/vendor/catalog/category — vendor adds a new catalog category (pending admin review)
router.post('/catalog/category', catalogUpload.single('image'), async (req, res) => {
  try {
    const Catalog = require('../models/Catalog');
    const { name, emoji } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Category name required' });
    const exists = await Catalog.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ message: 'Category already exists' });
    const imageUrl = req.file ? req.file.path : '';
    const cat = await Catalog.create({ name: name.trim(), emoji: emoji || '🛒', image: imageUrl, items: [] });
    res.status(201).json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/vendor/catalog/:catId/item — vendor adds item to existing category
router.post('/catalog/:catId/item', catalogUpload.single('image'), async (req, res) => {
  try {
    const Catalog = require('../models/Catalog');
    const { name, unit } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Item name required' });
    const cat = await Catalog.findById(req.params.catId);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    const imageUrl = req.file ? req.file.path : '';
    cat.items.push({ id: Date.now().toString(), name: name.trim(), unit: unit || 'kg', image: imageUrl });
    await cat.save();
    res.status(201).json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

const shopUpload = shopUploadMiddleware;

// PATCH /api/vendor/shop/:vendorId/avatar
router.patch('/shop/:vendorId/avatar', shopUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
    const avatarUrl = req.file.path;
    const shop = await Shop.findOneAndUpdate(
      { vendorId: req.params.vendorId },
      { avatar: avatarUrl },
      { new: true, upsert: false }
    );
    if (!shop) return res.status(404).json({ message: 'Shop not found. Save shop profile first.' });
    res.json({ avatarUrl });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

const SHOP_FIELDS = ['shopName', 'tagline', 'phone', 'email', 'website', 'description', 'address', 'city', 'state', 'pincode'];
const PRODUCT_FIELDS = ['name', 'category', 'price', 'discountPrice', 'discountPct', 'stock', 'unit', 'description', 'image', 'emoji', 'status'];

const toShopJson = (shop) => ({
  id: shop._id, vendorId: shop.vendorId,
  shopName: shop.shopName,       tagline:     shop.tagline     || '',
  phone:    shop.phone     || '', email:       shop.email       || '',
  website:  shop.website   || '', description: shop.description || '',
  address:  shop.address   || '', city:        shop.city        || '',
  state:    shop.state     || '', pincode:     shop.pincode     || '',
  avatar:   shop.avatar    || null,
  createdAt: shop.createdAt,
});

// GET /api/vendor/shop/:vendorId
router.get('/shop/:vendorId', async (req, res) => {
  try {
    const shop = await Shop.findOne({ vendorId: req.params.vendorId });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    res.json(toShopJson(shop));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/vendor/shop
router.post('/shop', async (req, res) => {
  try {
    if (!req.body.shopName?.trim()) return res.status(400).json({ message: 'Shop name is required' });
    const exists = await Shop.findOne({ vendorId: req.body.vendorId });
    if (exists) return res.status(409).json({ message: 'Shop already exists for this vendor' });
    const shop = await Shop.create({ ...req.body, vendorId: req.body.vendorId });
    res.status(201).json({ message: 'Shop created successfully', shopId: shop._id });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/vendor/shop/:vendorId
router.patch('/shop/:vendorId', async (req, res) => {
  try {
    const shop = await Shop.findOne({ vendorId: req.params.vendorId });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    const updates = {};
    SHOP_FIELDS.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const updated = await Shop.findOneAndUpdate(
      { vendorId: req.params.vendorId }, updates, { new: true }
    );
    res.json({ message: 'Shop updated successfully', shop: toShopJson(updated) });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/vendor/products/:vendorId
router.get('/products/:vendorId', async (req, res) => {
  const products = await VendorProduct.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 });
  res.json(products);
});

// POST /api/vendor/products
router.post('/products', async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    if (!name || price == null || stock == null)
      return res.status(400).json({ message: 'Name, price and stock are required.' });
    const isCustom = req.body.isCustom === true || req.body.isCustom === 'true';
    const productData = {
      ...req.body,
      vendorId: req.body.vendorId || req.user.id,
      isCustom,
    };
    if (isCustom) {
      productData.approvalStatus = 'pending';
      productData.status = 'out';
    } else {
      delete productData.approvalStatus; // not needed — catalog products are always live
      productData.status = req.body.status || 'active';
    }
    const product = await VendorProduct.create(productData);
    req.app.get('io')?.emit('products:updated');
    res.status(201).json({ message: isCustom ? 'Product submitted for admin approval' : 'Product added successfully', product });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/vendor/products/:productId
router.patch('/products/:productId', async (req, res) => {
  const product = await VendorProduct.findById(req.params.productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  if (product.vendorId.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  const updates = {};
  PRODUCT_FIELDS.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  await VendorProduct.findByIdAndUpdate(req.params.productId, updates);
  req.app.get('io')?.emit('products:updated');
  res.json({ message: 'Product updated successfully' });
});

// DELETE /api/vendor/products/:productId
router.delete('/products/:productId', async (req, res) => {
  const product = await VendorProduct.findById(req.params.productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  if (product.vendorId.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  await VendorProduct.findByIdAndDelete(req.params.productId);
  res.json({ message: 'Product deleted successfully' });
});

// GET /api/vendor/stats/:vendorId
router.get('/stats/:vendorId', async (req, res) => {
  const products = await VendorProduct.find({ vendorId: req.params.vendorId });
  res.json({
    totalProducts:  products.length,
    totalSales:     products.reduce((s, p) => s + p.sales, 0),
    totalRevenue:   products.reduce((s, p) => s + (p.discountPrice || p.price) * p.sales, 0),
    activeListings: products.filter(p => p.status === 'active').length,
    outOfStock:     products.filter(p => p.stock === 0).length,
  });
});

// GET /api/vendor/product-stats/:vendorId — per-product sales breakdown from Orders
router.get('/product-stats/:vendorId', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const products = await VendorProduct.find({ vendorId: req.params.vendorId });
    const productIds = products.map(p => p._id.toString());

    // aggregate orders to get qty sold + revenue per product
    const orders = await Order.find({ 'items.productId': { $in: productIds } });
    const statsMap = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const pid = item.productId?.toString();
        if (!productIds.includes(pid)) return;
        if (!statsMap[pid]) statsMap[pid] = { qtySold: 0, revenue: 0, orderCount: 0 };
        statsMap[pid].qtySold    += item.qty || 0;
        statsMap[pid].revenue    += (item.price || 0) * (item.qty || 0);
        statsMap[pid].orderCount += 1;
      });
    });

    const result = products.map(p => ({
      _id:          p._id,
      name:         p.name,
      emoji:        p.emoji,
      image:        p.image,
      category:     p.category,
      price:        p.price,
      discountPrice: p.discountPrice,
      discountPct:  p.discountPct,
      unit:         p.unit,
      stock:        p.stock,
      status:       p.status,
      approvalStatus: p.approvalStatus,
      isCustom:     p.isCustom,
      rejectionNote: p.rejectionNote,
      sales:        p.sales,
      description:  p.description,
      qtySold:      statsMap[p._id.toString()]?.qtySold    || p.sales || 0,
      revenue:      statsMap[p._id.toString()]?.revenue    || (p.discountPrice || p.price) * p.sales,
      orderCount:   statsMap[p._id.toString()]?.orderCount || 0,
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ message: e.message }); }
});


router.get('/payment/:vendorId', async (req, res) => {
  try {
    const payment = await VendorPayment.findOne({ vendorId: req.params.vendorId });
    if (!payment) return res.status(404).json({ message: 'No payment details found' });
    // Mask account number — only return last 4 digits
    const data = payment.toObject();
    if (data.accountNumber) data.accountNumber = '****' + data.accountNumber.slice(-4);
    res.json(data);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/vendor/payment
router.post('/payment', async (req, res) => {
  try {
    const upiError = validateUpi(req.body.upiId);
    if (upiError) return res.status(400).json({ message: upiError });
    const vendorId = req.body.vendorId || req.user.id;
    const exists = await VendorPayment.findOne({ vendorId });
    if (exists) return res.status(409).json({ message: 'Payment details already exist. Use PATCH to update.' });
    const updates = {};
    PAYMENT_FIELDS.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const payment = await VendorPayment.create({ vendorId, ...updates });
    res.status(201).json({ message: 'Payment details saved', payment });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/vendor/payment/:vendorId
router.patch('/payment/:vendorId', async (req, res) => {
  try {
    if (req.body.upiId) {
      const upiError = validateUpi(req.body.upiId);
      if (upiError) return res.status(400).json({ message: upiError });
    }
    const updates = {};
    PAYMENT_FIELDS.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const payment = await VendorPayment.findOneAndUpdate(
      { vendorId: req.params.vendorId }, updates, { new: true, upsert: true }
    );
    res.json({ message: 'Payment details updated', payment });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
