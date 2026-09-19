const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/db');
const Admin = require('../src/models/Admin');

async function seedSuperAdmin() {
  try {
    await connectDB();

    const email = (process.env.SEED_SUPER_ADMIN_EMAIL || 'mdnuralam2812@gmail.com').toLowerCase();
    const password = process.env.SEED_SUPER_ADMIN_PASSWORD || '01725.Nur';

    let superAdmin = await Admin.findOne({ email });

    if (!superAdmin) {
      superAdmin = new Admin({
        name: 'Super Admin',
        email,
        role: 'super_admin',
        isActive: true,
        mustChangePassword: false,
      });
      await superAdmin.save();
      console.log(`[Admin Model] Created Super Admin doc for "${email}".`);
    } else {
      console.log(`[Admin Model] Super Admin doc for "${email}" already exists.`);
    }

    const db = mongoose.connection.db;
    const userCollection = db.collection('user');
    const accountCollection = db.collection('account');

    // Clean up existing user/account records for this email
    await userCollection.deleteMany({ email });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const now = new Date();
    const adminObjectId = superAdmin._id;
    const userIdStr = adminObjectId.toString();

    // 1. Better Auth user document (_id as ObjectId)
    await userCollection.insertOne({
      _id: adminObjectId,
      id: userIdStr,
      name: 'Super Admin',
      email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Better Auth account document (userId MUST be ObjectId for better-auth mongo adapter)
    await accountCollection.deleteMany({ accountId: userIdStr });
    await accountCollection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      id: userIdStr,
      userId: adminObjectId, // ObjectId reference for Better Auth mongo adapter
      accountId: userIdStr,
      providerId: 'credential',
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`[Better Auth] Seeded user and account records (with ObjectId userId) for "${email}".`);
    console.log(`Super Admin seeding completed successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed Super Admin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
