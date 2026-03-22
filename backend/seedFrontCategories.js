require('dotenv').config();
const mongoose = require('mongoose');
const FrontCategory = require('./models/FrontCategory');

const categories = [
  { name: 'Fruits',           icon: '🍎', color: '#ff6b6b', bg: '#fff5f5', order: 1 },
  { name: 'Vegetables',       icon: '🥦', color: '#51cf66', bg: '#f4fce3', order: 2 },
  { name: 'Masalas & Spices', icon: '🌶️', color: '#ff922b', bg: '#fff4e6', order: 3 },
  { name: 'Raw Meats',        icon: '🥩', color: '#e03131', bg: '#fff5f5', order: 4 },
  { name: 'Cooking Items',    icon: '🫙', color: '#7950f2', bg: '#f3f0ff', order: 5 },
  { name: 'Dairy',            icon: '🥛', color: '#339af0', bg: '#e7f5ff', order: 6 },
  { name: 'Dry Fruits',       icon: '🥜', color: '#a9770e', bg: '#fff8e1', order: 7 },
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await FrontCategory.deleteMany({});
  await FrontCategory.insertMany(categories);
  console.log('✅ Seeded', categories.length, 'front categories');
  mongoose.disconnect();
}).catch(e => { console.error(e); process.exit(1); });
