require('dotenv').config();
const { auth } = require('../config/firebase');
const { generateAdminCredentials } = require('../utils/generator');
const { sendCredentialsEmail } = require('../utils/mailer');
const userService = require('../services/user');

async function seedAdmin() {
  try {
    console.log('Starting admin user seed...\n');

    const firstName = process.env.ADMIN_FIRSTNAME || 'Admin';
    const lastName = process.env.ADMIN_LASTNAME || 'User';
    const fatherName = process.env.ADMIN_FATHERNAME || 'N/A';
    const dob = process.env.ADMIN_DOB || '1990-01-01';
    const email = process.env.EMAIL_USER || 'admin@example.com';
    const admin_number = process.env.ADMIN_NUMBER || '';
    const countryCode = process.env.ADMIN_COUNTRY_CODE || '+91';

    // Validation
    if (!firstName || !lastName || !email) {
      console.error('[ERROR] Missing required fields: firstName, lastName, email');
      process.exit(1);
    }

    if (!admin_number) {
      console.error('[ERROR] ADMIN_NUMBER env variable is required');
      process.exit(1);
    }

    console.log('[INFO] Admin Details:');
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Email: ${email}`);
    console.log(`   Phone: ${countryCode}${admin_number}`);
    console.log(`   DOB: ${dob}\n`);

    // Check if admin already exists by email
    console.log('[INFO] Checking if admin already exists...');
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      console.log(`[WARNING] Admin user already exists with ID: ${existingUser.userId}`);
      process.exit(0);
    }

    // Check if admin_number (phone) is already in use
    console.log('[INFO] Checking if phone number is already in use...');
    const existingAdminNumber = await userService.findByAdminNumber(admin_number);
    if (existingAdminNumber) {
      console.error('[ERROR] Admin phone number already in use');
      process.exit(1);
    }

    // Check Firebase Auth
    try {
      await auth.getUserByEmail(email);
      console.error('[ERROR] Email already exists in Firebase Authentication');
      process.exit(1);
    } catch (e) {
      // Expected for new users
    }

    // Generate credentials
    console.log('[INFO] Generating credentials...');
    const { generatedUserId, generatedPassword } = generateAdminCredentials(firstName);

    // Create Firebase Auth user
    console.log('[INFO] Creating Firebase Auth user...');
    await auth.createUser({
      email,
      password: generatedPassword
    });

    // Create admin user in Firestore
    console.log('[INFO] Creating admin user in Firestore...');
    const newAdmin = await userService.createUser({
      firstName,
      lastName,
      fatherName,
      dob,
      email,
      phone: admin_number.trim(),
      countryCode,
      city: 'All',
      admin_number: admin_number.trim(),
      userId: generatedUserId,
      role: 'admin',
      isActive: true,
      approvedAt: new Date().toISOString()
    });

    console.log('\n[SUCCESS] Admin user created successfully!\n');
    console.log('[INFO] Admin Credentials:');
    console.log(`   User ID: ${generatedUserId}`);
    console.log(`   Password: ${generatedPassword}`);
    console.log(`   Email: ${email}\n`);
    console.log('[INFO] Sending credentials email...');
    
    // Send credentials email to admin
    await sendCredentialsEmail({
      email,
      firstName,
      userId: generatedUserId,
      password: generatedPassword
    }).catch(err => {
      console.error('[WARNING] Failed to send credentials email:', err.message);
    });
    
    console.log('[SUCCESS] Credentials email sent successfully!\n');
    console.log('[WARNING] Please save these credentials securely!\n');

    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Error seeding admin:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedAdmin();
