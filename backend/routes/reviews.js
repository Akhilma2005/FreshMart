const router = require('express').Router();
const Review = require('../models/Review');
const VendorProduct = require('../models/VendorProduct');

// POST /api/reviews - Submit a review
router.post('/', async (req, res) => {
  try {
    const { productId, rating, comment, userName, userAvatar, userId } = req.body;
    
    // Find product to get vendorId
    const product = await VendorProduct.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const review = new Review({
      productId,
      vendorId: product.vendorId,
      userId,
      userName,
      userAvatar,
      rating,
      comment
    });
    
    await review.save();
    
    // Update product stats
    const allReviews = await Review.find({ productId });
    const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    
    await VendorProduct.findByIdAndUpdate(productId, {
      averageRating: avgRating,
      totalReviews: allReviews.length
    });
    
    res.status(201).json(review);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/reviews/product/:productId - Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).sort({ date: -1 });
    res.json(reviews);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/reviews/vendor/:vendorId - Get all reviews for a vendor's products
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const reviews = await Review.find({ vendorId: req.params.vendorId })
      .populate('productId', 'name image emoji')
      .sort({ date: -1 });
    res.json(reviews);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
