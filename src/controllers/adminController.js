const mongoose = require('mongoose');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const createAdminSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['super_admin', 'admin']).optional().default('admin'),
});

const updateAdminSchema = z.object({
  role: z.enum(['super_admin', 'admin']).optional(),
  isActive: z.boolean().optional(),
});

const listAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const validatedData = createAdminSchema.parse(req.body);
    const existingAdmin = await Admin.findOne({ email: validatedData.email });

    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'An admin with this email already exists' });
    }

    // 1. Create Admin record
    const admin = new Admin({
      name: validatedData.name,
      email: validatedData.email,
      role: validatedData.role,
      isActive: true,
      mustChangePassword: true,
      createdBy: req.admin._id,
    });

    await admin.save();

    // 2. Create corresponding Better Auth user & account records directly in MongoDB collections
    const db = mongoose.connection.db;
    const userCollection = db.collection('user');
    const accountCollection = db.collection('account');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);

    const now = new Date();
    const userId = admin._id.toString();

    await userCollection.updateOne(
      { email: validatedData.email },
      {
        $set: {
          _id: admin._id,
          id: userId,
          name: validatedData.name,
          email: validatedData.email,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    await accountCollection.updateOne(
      { accountId: userId, providerId: 'credential' },
      {
        $set: {
          id: userId,
          userId: admin._id, // ObjectId reference required by Better Auth mongo adapter
          accountId: userId,
          providerId: 'credential',
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: admin,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
    }
    next(error);
  }
};

const updateAdmin = async (req, res, next) => {
  try {
    const validatedData = updateAdminSchema.parse(req.body);

    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { $set: validatedData },
      { new: true, runValidators: true }
    );

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      data: admin,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
    }
    next(error);
  }
};

module.exports = {
  listAdmins,
  createAdmin,
  updateAdmin,
};
