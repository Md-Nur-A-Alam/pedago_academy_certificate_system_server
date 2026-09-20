const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { hashPassword } = require('better-auth/crypto');
const connectDB = require('../src/config/db');
const Admin = require('../src/models/Admin');

async function seedSuperAdmin() {
  try {
    await connectDB();

    const email = (process.env.SEED_SUPER_ADMIN_EMAIL || 'mdnuralam2812@gmail.com').toLowerCase().trim();
    const password = process.env.SEED_SUPER_ADMIN_PASSWORD || '01725.Nur';

    let superAdmin = await Admin.findOne({ email });

    if (!superAdmin) {
      superAdmin = new Admin({
        name: 'Super Admin',
        email,
        role: 'super_admin',
        isActive: true,
        mustChangePassword: true, // Required by context.md §3: force password change on first login
      });
      await superAdmin.save();
      console.log(`[Admin Model] Created Super Admin doc for "${email}".`);
    } else {
      superAdmin.role = 'super_admin';
      superAdmin.isActive = true;
      superAdmin.mustChangePassword = true;
      await superAdmin.save();
      console.log(`[Admin Model] Updated Super Admin doc for "${email}" (role: super_admin, mustChangePassword: true).`);
    }

    const db = mongoose.connection.db;
    const userCollection = db.collection('user');
    const accountCollection = db.collection('account');

    const adminObjectId = superAdmin._id;
    const userIdStr = adminObjectId.toString();

    // Clean up existing user/account records for this email or ID
    await userCollection.deleteMany({
      $or: [{ _id: adminObjectId }, { id: userIdStr }, { email }],
    });

    const passwordHash = await hashPassword(password);
    const now = new Date();

    // 1. Better Auth user document
    await userCollection.insertOne({
      _id: adminObjectId,
      id: userIdStr,
      name: superAdmin.name,
      email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Better Auth account document
    await accountCollection.deleteMany({
      $or: [{ accountId: userIdStr }, { userId: adminObjectId }, { userId: userIdStr }],
    });

    await accountCollection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      id: userIdStr,
      userId: adminObjectId,
      accountId: userIdStr,
      providerId: 'credential',
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`[Better Auth] Seeded user and account records for "${email}".`);
    console.log(`Super Admin seeding completed successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed Super Admin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
