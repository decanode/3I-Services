const { auth } = require('../config/firebase');
const { generateAdminCredentials } = require('../utils/generator');
const userService = require('../services/user');

// Seed admin user
exports.seedAdmin = async (req, res) => {
  try {
    const admin_number = process.env.ADMIN_NUMBER || req.body.admin_number;
    const firstName = process.env.ADMIN_FIRSTNAME || req.body.firstName || 'Admin';
    const lastName = process.env.ADMIN_LASTNAME || req.body.lastName || 'User';
    const fatherName = process.env.ADMIN_FATHERNAME || req.body.fatherName || 'N/A';
    const dob = process.env.ADMIN_DOB || req.body.dob || '1990-01-01';
    const email = process.env.EMAIL_USER || req.body.email || 'admin@example.com';
    const countryCode = process.env.ADMIN_COUNTRY_CODE || req.body.countryCode || '+91';

    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        message: 'Missing required fields: firstName, lastName, email' 
      });
    }

    if (!admin_number) {
      return res.status(400).json({ 
        message: 'ADMIN_NUMBER env variable or admin_number in request body is required' 
      });
    }

    // Check if admin already exists by email
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Admin user already exists with this email', 
        userId: existingUser.userId 
      });
    }

    // Check if admin_number (phone) is already in use
    const existingAdminNumber = await userService.findByAdminNumber(admin_number);
    if (existingAdminNumber) {
      return res.status(409).json({ 
        status: 'admin_number_in_use',
        message: 'Admin phone number already in use' 
      });
    }

    // Check Firebase Auth
    try {
      await auth.getUserByEmail(email);
      return res.status(409).json({ 
        message: 'Email already exists in Firebase Authentication' 
      });
    } catch (e) {
      // Expected for new users
    }

    // Generate credentials
    const { generatedUserId, generatedPassword } = generateAdminCredentials(firstName);

    // Create Firebase Auth user
    await auth.createUser({ 
      email, 
      password: generatedPassword 
    });

    // Create admin user in Firestore
    const newAdmin = await userService.createUser({
      firstName,
      lastName,
      fatherName,
      dob,
      email,
      phone: '',
      countryCode,
      admin_number: admin_number.trim(),
      userId: generatedUserId,
      role: 'admin',
      isActive: true,
      approvedAt: new Date().toISOString()
    });

    res.status(201).json({ 
      message: 'Admin user created successfully', 
      admin: {
        userId: generatedUserId,
        email: email,
        firstName,
        lastName,
        admin_number,
        countryCode,
        role: 'admin'
      },
      credentials: {
        userId: generatedUserId,
        password: generatedPassword,
        note: 'Please save these credentials securely'
      }
    });
  } catch (error) {
    console.error('[SEED_ADMIN] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all admins
exports.getAdmins = async (req, res) => {
  try {
    const allUsers = await userService.getAllUsers();
    const admins = allUsers.filter(user => user.role === 'admin');
    res.status(200).json({ admins, count: admins.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
