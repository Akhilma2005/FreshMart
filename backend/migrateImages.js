require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { cloudinary } = require('./utils/cloudinary');

const VendorProduct  = require('./models/VendorProduct');
const Shop           = require('./models/Shop');
const Catalog        = require('./models/Catalog');
const FrontCategory  = require('./models/FrontCategory');
const User           = require('./models/User');

const uploadToCloudinary = async (localPath, folder) => {
  const absPath = path.join(__dirname, localPath);
  if (!fs.existsSync(absPath)) return null;
  const result = await cloudinary.uploader.upload(absPath, { folder: `freshmart/${folder}` });
  return result.secure_url;
};

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. VendorProduct images
  const products = await VendorProduct.find({ image: /^\/uploads\// });
  console.log(`Migrating ${products.length} product images...`);
  for (const p of products) {
    const url = await uploadToCloudinary(p.image, 'products');
    if (url) { p.image = url; await p.save(); console.log(`✓ Product: ${p.name}`); }
    else console.log(`✗ Missing: ${p.image}`);
  }

  // 2. Shop avatars
  const shops = await Shop.find({ avatar: /^\/uploads\// });
  console.log(`Migrating ${shops.length} shop avatars...`);
  for (const s of shops) {
    const url = await uploadToCloudinary(s.avatar, 'shops');
    if (url) { s.avatar = url; await s.save(); console.log(`✓ Shop: ${s.shopName}`); }
    else console.log(`✗ Missing: ${s.avatar}`);
  }

  // 3. Catalog category images
  const catalogs = await Catalog.find({ image: /^\/uploads\// });
  console.log(`Migrating ${catalogs.length} catalog images...`);
  for (const c of catalogs) {
    const url = await uploadToCloudinary(c.image, 'catalog');
    if (url) { c.image = url; await c.save(); console.log(`✓ Catalog: ${c.name}`); }
    else console.log(`✗ Missing: ${c.image}`);
    // migrate catalog items too
    let changed = false;
    for (const item of c.items) {
      if (item.image?.startsWith('/uploads/')) {
        const iurl = await uploadToCloudinary(item.image, 'catalog');
        if (iurl) { item.image = iurl; changed = true; console.log(`  ✓ Item: ${item.name}`); }
      }
    }
    if (changed) { c.markModified('items'); await c.save(); }
  }

  // 4. FrontCategory images
  const frontCats = await FrontCategory.find({ image: /^\/uploads\// });
  console.log(`Migrating ${frontCats.length} front category images...`);
  for (const fc of frontCats) {
    const url = await uploadToCloudinary(fc.image, 'categories');
    if (url) { fc.image = url; await fc.save(); console.log(`✓ FrontCategory: ${fc.name}`); }
    else console.log(`✗ Missing: ${fc.image}`);
  }

  // 5. User avatars
  const users = await User.find({ avatar: /^\/uploads\// });
  console.log(`Migrating ${users.length} user avatars...`);
  for (const u of users) {
    const url = await uploadToCloudinary(u.avatar, 'avatars');
    if (url) { u.avatar = url; await u.save(); console.log(`✓ User: ${u.name}`); }
    else console.log(`✗ Missing: ${u.avatar}`);
  }

  console.log('\n✅ Migration complete!');
  process.exit(0);
};

migrate().catch(e => { console.error(e); process.exit(1); });
