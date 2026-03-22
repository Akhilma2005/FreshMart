const router = require('express').Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { makeUpload } = require('../utils/cloudinary');

const upload = makeUpload('avatars');

const PROFILE_FIELDS = ['name', 'phone', 'gender', 'dob', 'bio', 'address', 'city', 'state', 'pincode', 'country', 'locationLabel', 'lat', 'lng'];

// GET /api/users/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const user = await User.findById(req.params.id, '-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({
    id: user._id, name: user.name, email: user.email, role: user.role,
    avatar: user.avatar, createdAt: user.createdAt,
    phone: user.phone, gender: user.gender, dob: user.dob, bio: user.bio,
    address: user.address, city: user.city, state: user.state,
    pincode: user.pincode, country: user.country,
    locationLabel: user.locationLabel, lat: user.lat, lng: user.lng,
  });
});

// PATCH /api/users/:id
router.patch('/:id', authMiddleware, async (req, res) => {
  if (req.body.name !== undefined && !req.body.name?.trim())
    return res.status(400).json({ message: 'Name cannot be empty' });
  const updates = {};
  PROFILE_FIELDS.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'No fields to update' });
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, select: '-password' });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({
    message: 'Profile updated successfully',
    user: {
      id: user._id, name: user.name, email: user.email, role: user.role,
      phone: user.phone, gender: user.gender, dob: user.dob, bio: user.bio,
      address: user.address, city: user.city, state: user.state,
      pincode: user.pincode, country: user.country,
    },
  });
});

// PATCH /api/users/:id/avatar
router.patch('/:id/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const avatarUrl = req.file.path;
  await User.findByIdAndUpdate(req.params.id, { avatar: avatarUrl });
  res.json({ avatarUrl });
});

// DELETE /api/users/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    // 1. Security check: user can only delete themselves (or admin can delete anyone)
    const isAdmin = req.user.roles?.includes('admin') || req.user.role === 'admin';
    if (req.user.id !== userId && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: You can only delete your own account' });
    }

    const User    = require('../models/User');
    const Shop    = require('../models/Shop');
    const VendorProduct = require('../models/VendorProduct');
    const Review  = require('../models/Review');

    // 2. Perform cleanup
    await Promise.all([
      User.findByIdAndDelete(userId),
      Shop.findOneAndDelete({ vendorId: userId }),
      VendorProduct.deleteMany({ vendorId: userId }),
      Review.deleteMany({ userId: userId }),
    ]);

    // 3. Notify Admin Panel via Socket
    req.app.get('io')?.emit('users:updated');
    req.app.get('io')?.emit('products:updated');

    res.json({ message: 'Account and all associated data deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
