const mongoose = require('mongoose');
const { z } = require('zod');
const Admin = require('../models/Admin');

// Dynamic loader for better-auth/crypto to avoid ERR_REQUIRE_ESM on Linux/Vercel
let cryptoPromise = null;
const getCrypto = () => {
  if (!cryptoPromise) {
    cryptoPromise = import('better-auth/crypto');
  }
  return cryptoPromise;
};

const createAdminSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['super_admin', 'admin']).default('admin'),
});

const updateAdminSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').trim().optional(),
  role: z.enum(['super_admin', 'admin']).optional(),
  isActive: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

/**
 * Get profile of currently authenticated admin
 * GET /api/admins/me
 */
const getMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id).populate('createdBy', 'name email');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        photo: admin.photo || '',
        phone: admin.phone || '',
        officeId: admin.officeId || '',
        officeRole: admin.officeRole || '',
        bio: admin.bio || '',
        isActive: admin.isActive,
        mustChangePassword: admin.mustChangePassword,
        createdBy: admin.createdBy,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password for currently authenticated admin
 * POST /api/admins/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const adminIdStr = req.admin._id.toString();

    const db = mongoose.connection.db;
    const accountCollection = db.collection('account');

    // Find the credential account record in Better Auth collection
    const account = await accountCollection.findOne({
      $or: [
        { accountId: adminIdStr, providerId: 'credential' },
        { userId: req.admin._id, providerId: 'credential' },
        { userId: adminIdStr, providerId: 'credential' },
      ],
    });

    if (!account || !account.password) {
      return res.status(404).json({
        success: false,
        message: 'No credential account found for this admin',
      });
    }

    // Verify current password using Better Auth verifier
    const { hashPassword, verifyPassword } = await getCrypto();
    const isMatch = await verifyPassword({
      password: currentPassword,
      hash: account.password,
    });

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password using Better Auth hasher
    const newPasswordHash = await hashPassword(newPassword);

    // Update account record in Better Auth collection
    await accountCollection.updateOne(
      { _id: account._id },
      { $set: { password: newPasswordHash, updatedAt: new Date() } }
    );

    // Mark mustChangePassword as false on the Admin record
    await Admin.findByIdAndUpdate(req.admin._id, {
      $set: { mustChangePassword: false },
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all admin accounts (Super Admin only)
 * GET /api/admins
 */
const listAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new admin account (Super Admin only)
 * POST /api/admins
 */
const createAdmin = async (req, res, next) => {
  try {
    const validatedData = createAdminSchema.parse(req.body);
    const normalizedEmail = validatedData.email.toLowerCase();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'An administrator with this email already exists',
      });
    }

    // 1. Create Admin model document
    const admin = new Admin({
      name: validatedData.name,
      email: normalizedEmail,
      role: validatedData.role,
      isActive: true,
      mustChangePassword: true, // Force password change on first login per §3
      createdBy: req.admin._id,
    });
    await admin.save();

    // 2. Insert corresponding Better Auth user & credential account in MongoDB
    const db = mongoose.connection.db;
    const userCollection = db.collection('user');
    const accountCollection = db.collection('account');

    const { hashPassword } = await getCrypto();
    const passwordHash = await hashPassword(validatedData.password);
    const now = new Date();
    const userIdStr = admin._id.toString();

    await userCollection.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          _id: admin._id,
          id: userIdStr,
          name: validatedData.name,
          email: normalizedEmail,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    await accountCollection.updateOne(
      { accountId: userIdStr, providerId: 'credential' },
      {
        $set: {
          id: userIdStr,
          userId: admin._id,
          accountId: userIdStr,
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
    next(error);
  }
};

/**
 * Update an existing admin account (Super Admin only)
 * PATCH /api/admins/:id
 */
const updateAdmin = async (req, res, next) => {
  try {
    const validatedData = updateAdminSchema.parse(req.body);
    const targetAdminId = req.params.id;

    const targetAdmin = await Admin.findById(targetAdminId);
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const isSelf = req.admin._id.toString() === targetAdminId;

    // Protection 1: Prevent self-deactivation
    if (isSelf && validatedData.isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own Super Admin account',
      });
    }

    // Protection 2: Prevent self-demotion
    if (isSelf && validatedData.role && validatedData.role !== 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot demote your own Super Admin account',
      });
    }

    // Protection 3: Prevent demoting or deactivating the last remaining active Super Admin
    if (
      targetAdmin.role === 'super_admin' &&
      (validatedData.isActive === false || validatedData.role === 'admin')
    ) {
      const activeSuperAdminCount = await Admin.countDocuments({
        role: 'super_admin',
        isActive: true,
      });

      if (activeSuperAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate or demote the last remaining active Super Admin',
        });
      }
    }

    // Apply updates
    if (validatedData.name) targetAdmin.name = validatedData.name;
    if (validatedData.role) targetAdmin.role = validatedData.role;
    if (typeof validatedData.isActive === 'boolean') targetAdmin.isActive = validatedData.isActive;

    await targetAdmin.save();

    const db = mongoose.connection.db;

    // If name changed, update Better Auth user collection
    if (validatedData.name) {
      await db.collection('user').updateOne(
        { email: targetAdmin.email },
        { $set: { name: validatedData.name, updatedAt: new Date() } }
      );
    }

    // If deactivated, revoke all active Better Auth sessions for this user
    if (validatedData.isActive === false) {
      await db.collection('session').deleteMany({
        $or: [
          { userId: targetAdmin._id },
          { userId: targetAdminId },
        ],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Admin account updated successfully',
      data: targetAdmin,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an admin account (Super Admin only)
 * DELETE /api/admins/:id
 */
const deleteAdmin = async (req, res, next) => {
  try {
    const targetAdminId = req.params.id;

    if (req.admin._id.toString() === targetAdminId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    const targetAdmin = await Admin.findById(targetAdminId);
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Check if last remaining Super Admin
    if (targetAdmin.role === 'super_admin') {
      const activeSuperAdminCount = await Admin.countDocuments({
        role: 'super_admin',
        isActive: true,
      });
      if (activeSuperAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the only remaining Super Admin account',
        });
      }
    }

    // Remove Admin document
    await Admin.findByIdAndDelete(targetAdminId);

    // Remove Better Auth user, accounts, sessions
    const db = mongoose.connection.db;
    await db.collection('user').deleteOne({ email: targetAdmin.email });
    await db.collection('account').deleteMany({
      $or: [{ userId: targetAdmin._id }, { userId: targetAdminId }, { accountId: targetAdminId }],
    });
    await db.collection('session').deleteMany({
      $or: [{ userId: targetAdmin._id }, { userId: targetAdminId }],
    });

    res.status(200).json({
      success: true,
      message: 'Admin account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').trim().optional(),
  phone: z.string().trim().optional(),
  photo: z.string().trim().optional(),
  officeId: z.string().trim().optional(),
  officeRole: z.string().trim().optional(),
  bio: z.string().trim().optional(),
});

/**
 * Update profile of currently authenticated admin
 * PATCH /api/admins/me
 */
const updateMe = async (req, res, next) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    if (validatedData.name) admin.name = validatedData.name;
    if (typeof validatedData.phone !== 'undefined') admin.phone = validatedData.phone;
    if (typeof validatedData.photo !== 'undefined') admin.photo = validatedData.photo;
    if (typeof validatedData.officeId !== 'undefined') admin.officeId = validatedData.officeId;
    if (typeof validatedData.officeRole !== 'undefined') admin.officeRole = validatedData.officeRole;
    if (typeof validatedData.bio !== 'undefined') admin.bio = validatedData.bio;

    await admin.save();

    // Update Better Auth user record if name or photo changed
    const db = mongoose.connection.db;
    const userUpdate = {};
    if (validatedData.name) userUpdate.name = validatedData.name;
    if (validatedData.photo) userUpdate.image = validatedData.photo;
    if (Object.keys(userUpdate).length > 0) {
      userUpdate.updatedAt = new Date();
      await db.collection('user').updateOne(
        { email: admin.email },
        { $set: userUpdate }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: admin,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe,
  changePassword,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};
