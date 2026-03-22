const express = require('express');
const router = express.Router();
const VendorProduct = require('../models/VendorProduct');

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

router.get('/', async (req, res) => {
  try {
    const q = req.query.q?.trim().toLowerCase() || '';
    if (!q) return res.json([]);

    const escapedQ = escapeRegex(q);
    // fuzzy regex: allows wildcard matching between characters
    const fuzzyRegex = new RegExp(escapedQ.split('').join('.*?'), 'i');

    const products = await VendorProduct.find({
      status: 'active',
      stock: { $gt: 0 },
      $or: [{ isCustom: false }, { isCustom: null }, { approvalStatus: 'approved' }],
      $and: [
        {
          $or: [
            { name: { $regex: fuzzyRegex } },
            { category: { $regex: fuzzyRegex } }
          ]
        }
      ]
    }).limit(100);

    let results = [];

    // Add Products
    products.forEach(p => {
      results.push({
        type: 'product',
        label: p.name,
        image: p.image || '',
        emoji: p.emoji || '📦',
        category: p.category || '',
        id: p.id
      });
    });

    // Ranking algorithm based on priority
    const rank = (label) => {
      const l = label.toLowerCase();
      if (l.startsWith(q)) return 0;
      if (l.includes(` ${q}`)) return 1;
      if (l.includes(q)) return 2;
      return 3; // Fuzzy
    };

    // Remove duplicates based on label (prefer items with images)
    const uniqueMap = new Map();
    results.forEach(r => {
      const key = r.label.toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, r);
      } else {
        const existing = uniqueMap.get(key);
        if (!existing.image && r.image) {
          uniqueMap.set(key, r);
        }
      }
    });

    const uniqueResults = Array.from(uniqueMap.values());

    uniqueResults.sort((a, b) => {
      const ra = rank(a.label);
      const rb = rank(b.label);
      if (ra !== rb) return ra - rb;
      return a.label.localeCompare(b.label);
    });

    // Return top 8
    res.json(uniqueResults.slice(0, 8));
  } catch (err) {
    console.error('Search API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
