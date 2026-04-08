const userService = require('../services/user');
const { admin } = require('../config/firebase');
const https = require('https');

// Get all users (admin)
exports.getAll = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user by ID (admin)
exports.getById = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const user = await userService.findByUserId(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    delete user.password;
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete user (admin)
exports.delete = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    await userService.deleteUser(userId);
    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await userService.findByUserId(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    delete user.password;
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update current user profile
exports.updateProfile = async (req, res) => {
  try {
    const ALLOWED_FIELDS = [
      'firstName', 'lastName', 'fatherName', 'dob', 'email', 'phone', 'countryCode',
      'acity', 'street', 'doorNo', 'state', 'pincode', 'aadhar', 'pan'
    ];

    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided' });
    }

    const updated = await userService.updateUser(req.user.userId, updateData);
    delete updated.password;
    res.status(200).json({ message: 'Profile updated', user: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Change password (authenticated)
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirmation do not match' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({ message: 'New password must differ from the current password' });
    }

    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const verified = await verifyPassword(req.user.email, oldPassword, apiKey);
    if (!verified.success) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const firebaseUser = await admin.auth().getUserByEmail(req.user.email);
    await admin.auth().updateUser(firebaseUser.uid, { password: newPassword });

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

// Helper: Verify password with Firebase REST API
function verifyPassword(email, password, apiKey) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ email, password, returnSecureToken: true });

    const req = https.request({
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:signInWithPassword?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ success: res.statusCode === 200, data: JSON.parse(data) });
        } catch { resolve({ success: false }); }
      });
    });

    req.on('error', () => resolve({ success: false }));
    req.write(postData);
    req.end();
  });
}
