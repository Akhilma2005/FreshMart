const router = require('express').Router();
const VendorProduct = require('../models/VendorProduct');

router.get('/', async (req, res) => {
  try {
    const { cat, search } = req.query;
    // Show catalog products (isCustom: false, no approvalStatus needed) + approved custom products
    const filter = {
      status: 'active',
      stock: { $gt: 0 },
      $or: [{ isCustom: false }, { isCustom: null }, { approvalStatus: 'approved' }],
    };

    if (cat) {
      const aliasGroups = [
        ['cooking oils', 'cooking items'],
        ['masalas', 'masalas & spices', 'masala & spices', 'masala & species', 'spices', 'masala'],
      ];
      const catLower = cat.toLowerCase();
      const group = aliasGroups.find(g => g.includes(catLower));
      filter.category = group
        ? { $regex: `^(${group.join('|')})$`, $options: 'i' }
        : { $regex: `^${cat}$`, $options: 'i' };
    }
    if (search) filter.name = { $regex: search, $options: 'i' };

    const vendorProducts = await VendorProduct.find(filter);
    const products = vendorProducts.map(p => ({
      ...p.toObject(),
      id: p._id.toString(),
      isVendorProduct: true,
    }));

    res.json(products);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Shop = require('../models/Shop');
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(404).json({ message: 'Product not found' });
    // Find by _id with NO visibility filter — show any product by direct link
    const p = await VendorProduct.findOne({ _id: req.params.id });
    console.log('[GET /products/:id]', req.params.id, '->', p ? p.name : 'NOT FOUND');
    if (!p) return res.status(404).json({ message: 'Product not found' });
    let img = p.image;
    if (img && img.startsWith('/uploads/')) img = `http://localhost:5000${img}`;

    // Fetch seller/shop details
    let seller = null;
    if (p.vendorId) {
      const shop = await Shop.findOne({ vendorId: p.vendorId });
      if (shop) {
        seller = {
          shopName:     shop.shopName,
          rating:       shop.rating || 0,
          totalRatings: shop.totalRatings || 0,
          isVerified:   shop.isVerified || false,
          phone:        shop.phone || null,
          deliveryInfo: shop.deliveryInfo || null,
          returnPolicy: shop.returnPolicy || null,
          avatar:       shop.avatar || null,
        };
      }
    }

    res.json({ ...p.toObject(), id: p._id.toString(), image: img, seller });
  } catch (e) {
    console.error('[GET /products/:id] error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
