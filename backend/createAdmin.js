require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = 'admin@freshmart.com';
  const password = 'Admin@1234';

  const exists = await User.findOne({ email });
  if (exists) {
    console.log('Admin already exists:', email);
    return process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name: 'Admin', email, password: hashed, role: 'admin' });

  console.log('✅ Admin created!');
  console.log('   Email   :', email);
  console.log('   Password:', password);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
