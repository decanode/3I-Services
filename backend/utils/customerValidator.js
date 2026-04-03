/**
 * Validate and sanitize customer data
 */

const isValidEmail = (email) => {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).trim());
};

const isValidPhone = (phone) => {
  if (!phone) return true; // Phone is optional
  // Basic phone validation - at least 5 digits (allow more flexible formats)
  const phoneDigits = String(phone).replace(/\D/g, '');
  return phoneDigits.length >= 5;
};

const sanitizeCustomerData = (name, mobile, email) => {
  return {
    name: name ? String(name).trim() : null,
    mobile: mobile ? String(mobile).trim() : null,
    email: email ? String(email).trim() : null,
  };
};

const validateCustomer = (name, mobile, email) => {
  const errors = [];

  // At least name or mobile is required
  if (!name && !mobile) {
    errors.push('Customer name or mobile is required');
  }

  // Validate email format if provided
  if (email && !isValidEmail(email)) {
    errors.push(`Invalid email format: ${email}`);
  }

  // Validate phone format if provided
  if (mobile && !isValidPhone(mobile)) {
    errors.push(`Invalid phone format: ${mobile}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const processCustomerData = (index, customerData) => {
  const cnameKey = `cname${index}`;
  const cmobKey = `cmob${index}`;
  const cemailKey = `cemail${index}`;

  const cname = customerData[cnameKey];
  const cmob = customerData[cmobKey];
  const cemail = customerData[cemailKey];

  const sanitized = sanitizeCustomerData(cname, cmob, cemail);
  const validation = validateCustomer(sanitized.name, sanitized.mobile, sanitized.email);

  return {
    index,
    sanitized,
    validation,
    keys: { cnameKey, cmobKey, cemailKey },
    isEmpty: !sanitized.name && !sanitized.mobile && !sanitized.email,
  };
};

module.exports = {
  isValidEmail,
  isValidPhone,
  sanitizeCustomerData,
  validateCustomer,
  processCustomerData,
};
