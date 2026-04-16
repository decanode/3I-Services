const crypto = require('crypto');

const generateCredentials = (firstName, lastName, fatherName, dob) => {
  const fName = firstName ? firstName.toString().trim().toLowerCase() : '';
  const dadName = fatherName ? fatherName.toString() : '';

  // User ID: firstName (lowercase) + DDMM of dob
  const dobDate = dob ? dob.split('-') : [];
  const day = dobDate[2] || '';
  const month = dobDate[1] || '';
  const generatedUserId = `${fName}${day}${month}`;

  // Password: First 4 chars of fatherName + # + DOB day
  const generatedPassword = `${dadName.trim().substring(0, 4).toLowerCase()}#${day}`;

  return { generatedUserId, generatedPassword };
};

// Generate a random, secure password
// Requirements: Uppercase, Lowercase, Numbers, Special (@#$!) - No spaces
const generateRandomPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '@#$!'; // Only these special characters
  
  // Ensure minimum length to include at least one of each category
  const minLength = Math.max(length, 8);
  const allChars = uppercase + lowercase + numbers + specialChars;
  
  // Build password ensuring at least one from each category
  let password = [];
  password.push(uppercase[crypto.randomInt(0, uppercase.length)]);
  password.push(lowercase[crypto.randomInt(0, lowercase.length)]);
  password.push(numbers[crypto.randomInt(0, numbers.length)]);
  password.push(specialChars[crypto.randomInt(0, specialChars.length)]);
  
  // Fill remaining length with random characters
  for (let i = password.length; i < minLength; i++) {
    password.push(allChars[crypto.randomInt(0, allChars.length)]);
  }
  
  // Shuffle using Fisher-Yates algorithm for better randomization
  for (let i = password.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }
  
  // Join and ensure no spaces
  return password.join('').replace(/\s/g, '');
};

// Generate credentials with random password
const generateRandomCredentials = (firstName, fatherName, dob) => {
  const fName = firstName ? firstName.toString().trim().toLowerCase() : '';
  
  // User ID: firstName (lowercase) + DDMM of dob
  const dobDate = dob ? dob.split('-') : [];
  const day = dobDate[2] || '';
  const month = dobDate[1] || '';
  const generatedUserId = `${fName}${day}${month}`;
  
  // Generate random password
  const generatedPassword = generateRandomPassword();
  
  return { generatedUserId, generatedPassword };
};

// Generate credentials for admin users: userId = firstName (lowercase) only
const generateAdminCredentials = (firstName) => {
  const generatedUserId = firstName ? firstName.toString().trim().toLowerCase() : 'admin';
  const generatedPassword = generateRandomPassword();
  return { generatedUserId, generatedPassword };
};

module.exports = { generateCredentials, generateRandomPassword, generateRandomCredentials, generateAdminCredentials };
