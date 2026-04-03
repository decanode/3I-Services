const nodemailer = require('nodemailer');
require('dotenv').config();

const createTransporter = () => {
  const config = {
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  };

  if (process.env.EMAIL_HOST) {
    config.host = process.env.EMAIL_HOST;
    config.port = parseInt(process.env.EMAIL_PORT || '465');
    config.secure = process.env.EMAIL_SECURE === 'true';
    config.tls = { ciphers: 'SSLv3', rejectUnauthorized: false };
    config.connectionTimeout = 10000;
    config.greetingTimeout = 5000;
    config.socketTimeout = 10000;
  } else {
    config.service = process.env.EMAIL_SERVICE || 'gmail';
  }

  return nodemailer.createTransport(config);
};

const sendEmailToAdmin = async ({ requestId, firstName, lastName, email, phone, city }) => {
  console.log('[INFO] Starting email send to admin...');
  console.log(`[DEBUG] EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`[DEBUG] ADMIN_EMAIL: ${process.env.ADMIN_EMAIL}`);
  console.log(`[DEBUG] EMAIL_PASSWORD exists: ${!!process.env.EMAIL_PASSWORD}`);
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('[ERROR] Email USER or PASSWORD not configured');
    return;
  }
  
  if (!process.env.ADMIN_EMAIL) {
    console.error('[ERROR] ADMIN_EMAIL not configured in environment variables');
    return;
  }

  try {
    console.log('[INFO] Creating email transporter...');
    const transporter = createTransporter();
    
    const now = new Date();
    const requestDate = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
    const requestTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">3i Services - 7FS</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Regulatory & Technology Solutions</p>
        </div>

        <!-- Main Content -->
        <div style="background-color: #ffffff; padding: 40px 30px;">
          <div style="border-left: 5px solid #3b82f6; padding-left: 20px; margin-bottom: 30px;">
            <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 22px;">New Registration Request</h2>
            <p style="color: #666; margin: 0; font-size: 14px;">A new user has submitted a registration request</p>
          </div>

          <!-- User Details Card -->
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%); padding: 25px; border-radius: 10px; margin-bottom: 25px; border: 1px solid #bfdbfe;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #dbeafe;">
                  <span style="color: #475569; font-weight: 600; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Full Name</span>
                  <span style="color: #1e40af; font-size: 16px; font-weight: 600; display: block; margin-top: 4px;">${firstName} ${lastName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #dbeafe;">
                  <span style="color: #475569; font-weight: 600; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email Address</span>
                  <span style="color: #1e40af; font-size: 14px; display: block; margin-top: 4px; word-break: break-all;">${email}</span>
                </td>
              </tr>
              ${phone ? `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #dbeafe;">
                  <span style="color: #475569; font-weight: 600; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Phone Number</span>
                  <span style="color: #1e40af; font-size: 14px; display: block; margin-top: 4px;">${phone}</span>
                </td>
              </tr>
              ` : ''}
              ${city ? `
              <tr>
                <td style="padding: 12px 0;">
                  <span style="color: #475569; font-weight: 600; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">City</span>
                  <span style="color: #1e40af; font-size: 14px; display: block; margin-top: 4px;">${city}</span>
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; border-top: 1px solid #e5e7eb;">
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: 'New User Registration Request - 3i Services - 7FS',
      html: htmlContent
    };

    console.log(`[INFO] Sending email FROM: ${mailOptions.from} TO: ${mailOptions.to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('[SUCCESS] Admin notification email sent. Message ID:', info.messageId);
  } catch (error) {
    console.error('[ERROR] Failed to send admin notification email');
    console.error('[ERROR] Error message:', error.message);
    console.error('[ERROR] Full error:', JSON.stringify(error, null, 2));
  }
};

const sendCredentialsEmail = async ({ email, firstName, userId, password }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('[WARNING] Email configuration missing. Skipping credentials email.');
    return;
  }

  try {
    const transporter = createTransporter();

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">3i Services - 7FS</h1>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px;">
          <p style="color: #1f2937; font-size: 16px; margin: 0 0 35px 0; font-weight: 500;">
            Welcome, <strong style="color: #10b981;">${firstName}</strong>
          </p>

          <!-- Credential Cards Container -->
          <div style="margin-bottom: 30px;">
            <!-- User ID Card -->
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0; margin-bottom: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 12px 16px;">
                <p style="color: #6b7280; font-size: 11px; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">User ID</p>
              </div>
              <div style="padding: 16px;">
                <p style="color: #10b981; font-size: 18px; margin: 0; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px;">${userId}</p>
              </div>
            </div>

            <!-- Password Card -->
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); padding: 12px 16px;">
                <p style="color: #92400e; font-size: 11px; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">Password</p>
              </div>
              <div style="padding: 16px;">
                <p style="color: #f59e0b; font-size: 18px; margin: 0; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px;">${password}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <!-- Footer content can be added here -->
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Login Credentials - 3i Services - 7FS',
      html: htmlContent
    });
    console.log('[SUCCESS] Credentials email sent successfully to:', email);
  } catch (error) {
    console.error('[ERROR] Failed to send credentials email:', error.message);
    throw error;
  }
};

const sendOtpEmail = async ({ email, firstName, otp }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('[WARNING] Email configuration missing. Skipping OTP email.');
    return;
  }

  try {
    const transporter = createTransporter();
    const otpValiditySeconds = parseInt(process.env.OTP_VALID_TIME) || 120;
    const otpValidityMinutes = Math.floor(otpValiditySeconds / 60);
    const validityText = otpValidityMinutes >= 1 ? `${otpValidityMinutes} minute${otpValidityMinutes > 1 ? 's' : ''}` : `${otpValiditySeconds} seconds`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - 3i Services - 7FS',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">3i Services - 7FS</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Regulatory & Technology Solutions</p>
          </div>

          <!-- Main Content -->
          <div style="background-color: #ffffff; padding: 40px 30px;">
            <h2 style="color: #1e40af; margin: 0 0 20px 0; font-size: 22px;">Hello${firstName ? ` ${firstName}` : ''}</h2>

            <!-- OTP Box -->
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; border-radius: 10px; text-align: center; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(30,64,175,0.2);">
              <p style="color: rgba(255,255,255,0.9); margin: 0 0 15px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
              <div style="background: rgba(255,255,255,0.1); border: 2px dashed rgba(255,255,255,0.4); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <span style="color: #ffffff; font-size: 42px; font-weight: 700; letter-spacing: 10px; font-family: 'Courier New', monospace;">${otp}</span>
              </div>
              <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 12px;">
                 This code expires in <strong>${validityText}</strong>
              </p>
            </div>
          </div>
        </div>
      `
    });
    console.log('[SUCCESS] OTP email sent successfully to:', email);
  } catch (error) {
    console.error('[ERROR] Failed to send OTP email:', error.message);
    throw error;
  }
};

module.exports = { sendEmailToAdmin, sendCredentialsEmail, sendOtpEmail };
