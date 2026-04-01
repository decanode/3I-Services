import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn, UserPlus, MapPin, Mail, Eye, EyeOff, Scale, FileText, Network, Smartphone, Code, Settings, PieChart, Cpu, RadioTower, Phone, ArrowLeft, Clock } from 'lucide-react';
import { Dropdown, cityOptions, GradientSubmitButton } from '../components/Button';
import DatePicker from '../components/datepicker';
import Alert from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import '../styles/pagestyles/login.css';

const cardData = [
  {
    id: "C1",
    title: "Regulatory",
    icon: <Scale size={80} color="#1d4ed8" />,
    features: [
      "Licence Compliance Management - SARAS",
      "Periodic Audit Compliance",
      "Licence Fee, PBG / FBG & Optimisation Management"
    ],
    height: 300
  },
  {
    id: "C2",
    title: "Licence Management",
    icon: <FileText size={80} color="#1d4ed8" />,
    features: [
      "New Licence Application on SARAL Sanchar",
      "Licence Renewal",
      "Periodic Compliance"
    ],
    height: 300
  },
  {
    id: "C3",
    title: "Network Audit",
    icon: <Network size={80} color="#06b6d4" />,
    features: [
      "Network Optimisation",
      "Network Security"
    ],
    height: 300
  },
  {
    id: "C4",
    title: "Mobile App Development",
    icon: <Smartphone size={80} color="#3b82f6" />,
    description: "High-performance apps tailored to your business needs (Android & iOS).",
    features: [
      "Cross-platform Solutions",
      "UI/UX-focused Design",
      "Secure & Scalable"
    ],
    height: 350
  },
  {
    id: "C5",
    title: "Web Development",
    icon: <Code size={80} color="#10b981" />,
    description: "Modern, responsive, and performance-driven websites.",
    features: [
      "Corporate & Business Sites",
      "CMS-based Solutions",
      "SEO-friendly"
    ],
    height: 350
  },
  {
    id: "C6",
    title: "Custom Software",
    icon: <Settings size={80} color="#ef4444" />,
    description: "Customized software solutions aligned with unique workflows.",
    features: [
      "Enterprise Development",
      "Process Automation",
      "System Integration"
    ],
    height: 350
  },
  {
    id: "C7",
    title: "ERP Software",
    icon: <PieChart size={80} color="#3b82f6" />,
    description: "Comprehensive resource planning for various sectors.",
    tags: ["Hospitality", "Manufacturing", "Schools / Universities", "Attendance & Security"],
    features: [
      "Process Optimization",
      "Real-time Reporting"
    ],
    height: 350
  },  
  {
    id: "C8",
    title: "IoT Based Solutions",
    icon: <Cpu size={80} color="#0ea5e9" />,
    description: "Smart connectivity for modern infrastructure.",
    tags: ["Smart Metering", "Garbage Clearance", "Visitor Management"],
    features: [
      "Remote Monitoring",
      "Data Analytics"
    ],
    height: 350
  },
  {
    id: "C9",
    title: "RFID Solutions",
    icon: <RadioTower size={80} color="#10b981" />,
    description: "Advanced tracking and management systems.",
    tags: ["File Tracking", "Asset Tracking", "Inventory"],
    features: [
      "Precision Tracking",
      "Automated Logging"
    ],
    height: 350
  }
];

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: '',
    otp: '',
    password: '',
    confirmPassword: ''
  });
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    firstName: '',
    lastName: '',
    fatherName: '',
    dob: null,
    city: '',
    countryCode: '+91',
    phone: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [alertState, setAlertState] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const OTP_VALID_TIME = 120;
  const OTP_RESEND_TIME = 60;

  useEffect(() => {
    if (timer > 0) {
      const interval = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [timer]);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [resendTimer]);

  const countryCodes = [
    { code: '+91', country: 'India', countryCode: 'in' },
    { code: '+65', country: 'Singapore', countryCode: 'sg' },
    { code: '+1', country: 'USA', countryCode: 'us' },
    { code: '+44', country: 'UK', countryCode: 'gb' },
    { code: '+61', country: 'Australia', countryCode: 'au' },
    { code: '+86', country: 'China', countryCode: 'cn' },
    { code: '+81', country: 'Japan', countryCode: 'jp' },
    { code: '+33', country: 'France', countryCode: 'fr' },
    { code: '+49', country: 'Germany', countryCode: 'de' },
    { code: '+39', country: 'Italy', countryCode: 'it' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setAlertState({ type: 'loading', title: 'Please wait...' });
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: formData.userId, password: formData.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      login(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setAlertState(null);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setAlertState({ type: 'loading', title: 'Sending Request...' });

    const startTime = Date.now();

    try {
      const res = await fetch(apiUrl('/api/signup/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          fatherName: formData.fatherName,
          dob: formData.dob,
          city: formData.city,
          countryCode: formData.countryCode,
          phone: formData.phone,
          email: formData.email
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');

      const elapsedTime = Date.now() - startTime;
      const remainingTime = 2000 - elapsedTime;

      setTimeout(() => {
        setAlertState({
          type: 'success',
          title: 'Request Sent',
          message: 'Request sent for admin. Wait for confirmation mail.'
        });

        setTimeout(() => {
          setIsLogin(true);
          setFormData({
            userId: '',
            password: '',
            firstName: '',
            lastName: '',
            fatherName: '',
            dob: null,
            city: '',
            countryCode: '+91',
            phone: '',
            email: ''
          });
          setAlertState(null);
        }, 3000);
      }, Math.max(0, remainingTime));

    } catch (err) {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = 2000 - elapsedTime;

      setTimeout(() => {
        setAlertState({ type: 'error', title: 'Signup Failed', message: err.message });
      }, Math.max(0, remainingTime));
    }
  };

  const handleAlertConfirm = () => {
    setAlertState(null);
  };

  const handleForgotPasswordChange = (e) => {
    const { name, value } = e.target;
    setForgotPasswordData(prev => ({
      ...prev,
      [name]: name === 'otp' ? value.replace(/\D/g, '').slice(0, 6) : value
    }));
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');

    if (!forgotPasswordData.email.trim()) {
      setForgotPasswordError('Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordData.email)) {
      setForgotPasswordError('Please enter a valid email');
      return;
    }

    setForgotPasswordLoading(true);
    setAlertState({ type: 'loading', title: 'Sending OTP...' });

    try {
      const res = await fetch(apiUrl('/api/password/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordData.email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');

      setAlertState({
        type: 'success',
        title: 'OTP Sent',
        message: `OTP has been sent to ${forgotPasswordData.email}`
      });

      setForgotPasswordStep(2);
      setTimer(OTP_VALID_TIME);
      setResendTimer(OTP_RESEND_TIME);
      setForgotPasswordData(prev => ({ ...prev, otp: '' }));
      setForgotPasswordError('');

      setTimeout(() => setAlertState(null), 3000);
    } catch (err) {
      setForgotPasswordError(err.message);
      setAlertState(null);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResendOtp = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');

    if (resendTimer > 0) return;

    setForgotPasswordLoading(true);
    setAlertState({ type: 'loading', title: 'Resending OTP...' });

    try {
      const res = await fetch(apiUrl('/api/password/resend-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordData.email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resend OTP');

      setAlertState({
        type: 'success',
        title: 'OTP Resent',
        message: 'OTP has been resent to your email'
      });

      setTimer(OTP_VALID_TIME);
      setResendTimer(OTP_RESEND_TIME);
      setForgotPasswordData(prev => ({ ...prev, otp: '' }));
      setForgotPasswordError('');

      setTimeout(() => setAlertState(null), 3000);
    } catch (err) {
      setForgotPasswordError(err.message);
      setAlertState(null);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');

    if (!forgotPasswordData.otp.trim()) {
      setForgotPasswordError('Please enter the OTP');
      return;
    }

    if (forgotPasswordData.otp.length !== 6) {
      setForgotPasswordError('OTP must be 6 digits');
      return;
    }

    setForgotPasswordLoading(true);
    setAlertState({ type: 'loading', title: 'Verifying OTP...' });

    try {
      const res = await fetch(apiUrl('/api/password/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordData.email, otp: forgotPasswordData.otp })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid OTP');

      setAlertState({
        type: 'success',
        title: 'OTP Verified',
        message: 'Proceeding to password reset...'
      });

      setForgotPasswordStep(3);
      setForgotPasswordData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      setForgotPasswordError('');

      setTimeout(() => setAlertState(null), 2000);
    } catch (err) {
      setForgotPasswordError(err.message);
      setAlertState(null);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');

    if (!forgotPasswordData.password.trim() || !forgotPasswordData.confirmPassword.trim()) {
      setForgotPasswordError('Please fill in all password fields');
      return;
    }

    if (forgotPasswordData.password.length < 6) {
      setForgotPasswordError('Password must be at least 6 characters');
      return;
    }

    if (forgotPasswordData.password !== forgotPasswordData.confirmPassword) {
      setForgotPasswordError('Passwords do not match');
      return;
    }

    setForgotPasswordLoading(true);
    setAlertState({ type: 'loading', title: 'Resetting Password...' });

    try {
      const res = await fetch(apiUrl('/api/password/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotPasswordData.email,
          otp: forgotPasswordData.otp,
          newPassword: forgotPasswordData.password
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');

      setAlertState({
        type: 'success',
        title: 'Password Reset Successfully',
        message: 'You can now login with your new password'
      });

      setTimeout(() => {
        setIsForgotPassword(false);
        setForgotPasswordStep(1);
        setForgotPasswordData({ email: '', otp: '', password: '', confirmPassword: '' });
        setForgotPasswordError('');
        setAlertState(null);
      }, 3000);
    } catch (err) {
      setForgotPasswordError(err.message);
      setAlertState(null);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleBackFromForgotPassword = () => {
    setIsForgotPassword(false);
    setForgotPasswordStep(1);
    setForgotPasswordData({ email: '', otp: '', password: '', confirmPassword: '' });
    setForgotPasswordError('');
    setTimer(0);
    setResendTimer(0);
  };

  return (
    <div className={`login-main-container ${!isLogin ? 'signup-active' : ''}`}>
      {alertState && (
        <Alert
          type={alertState.type}
          title={alertState.title}
          message={alertState.message}
          onConfirm={handleAlertConfirm}
        />
      )}
      {/* Left White Background - Form Container */}
      <div className="whole-form-container">
        <div className={`form-container ${isLogin ? 'login-mode' : 'signup-mode'}`}>
          {!isForgotPassword ? (
            <>
              <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
              {isLogin && (
                <p className="form-subtitle">
                  Please sign in to your account
                </p>
              )}

              <form onSubmit={isLogin ? handleLogin : handleSignup}>
                {!isLogin && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="firstName">First Name</label>
                        <div className="input-wrapper">
                          <User className="form-input-icon" size={20} />
                          <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="Enter first name"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="lastName">Last Name</label>
                        <div className="input-wrapper">
                          <User className="form-input-icon" size={20} />
                          <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="Enter last name"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="fatherName">Father&apos;s name</label>
                      <div className="input-wrapper">
                        <User className="form-input-icon" size={20} />
                        <input
                          type="text"
                          id="fatherName"
                          name="fatherName"
                          value={formData.fatherName}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter father&apos;s full name"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Date of Birth</label>
                      <DatePicker
                        name="dob"
                        value={formData.dob}
                        onChange={(value) => handleInputChange({ target: { name: 'dob', value } })}
                        required={true}
                      />
                    </div>

                    <div className="form-group">
                      <Dropdown
                        label="City"
                        name="city"
                        options={cityOptions}
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Select your city"
                        icon={MapPin}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <div className="phone-input-wrapper">
                        <select
                          name="countryCode"
                          value={formData.countryCode}
                          onChange={handleInputChange}
                          className="country-code-select"
                        >
                          {countryCodes.map((item) => (
                            <option key={item.code} value={item.code}>
                              {item.code} {item.country}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="form-input phone-input"
                          placeholder="Enter your phone number"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <div className="input-wrapper">
                        <Mail className="form-input-icon" size={20} />
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {isLogin && (
                  <>
                    <div className="form-group">
                      <label htmlFor="userId">User ID</label>
                      <div className="input-wrapper">
                        <User className="form-input-icon" size={20} />
                        <input
                          type="text"
                          id="userId"
                          name="userId"
                          value={formData.userId}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter your user ID"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="password-header">
                        <label htmlFor="password">Password</label>
                        <button
                          type="button"
                          className="forgot-password-link"
                          onClick={() => setIsForgotPassword(true)}
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="input-wrapper">
                        <Lock className="form-input-icon" size={20} />
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter your password"
                          required
                        />
                        <button
                          type="button"
                          className="eye-icon-button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {error && <p className="error-message" style={{color: 'red', marginBottom: '1rem'}}>{error}</p>}

                <GradientSubmitButton
                  icon={LogIn}
                  loading={!!alertState}
                  loadingText={isLogin ? 'Logging in...' : 'Creating Account...'}
                >
                  {isLogin ? 'Login' : 'Create Account'}
                </GradientSubmitButton>
              </form>

              <p className="toggle-text">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  className="signup-link"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  <UserPlus size={16} />
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                className="back-button"
                onClick={handleBackFromForgotPassword}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '0',
                  marginBottom: '20px',
                  transition: 'color 0.3s ease'
                }}
              >
                <ArrowLeft size={18} />
                Back to Login
              </button>

              <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '24px', color: '#333', margin: '0 0 8px 0', fontWeight: '600' }}>
                  Forgot Password?
                </h1>
                <p style={{ fontSize: '12px', color: '#999', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Step {forgotPasswordStep} of 3
                </p>
              </div>

              {forgotPasswordStep === 1 && (
                <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <div className="input-wrapper">
                      <Mail className="form-input-icon" size={20} />
                      <input
                        type="email"
                        name="email"
                        placeholder="Enter your registered email"
                        value={forgotPasswordData.email}
                        onChange={handleForgotPasswordChange}
                        disabled={forgotPasswordLoading}
                        className="form-input"
                        required
                      />
                    </div>
                    <p style={{ fontSize: '12px', color: '#999', margin: '8px 0 0 0', padding: '0' }}>
                      We'll send you an OTP to verify your email
                    </p>
                  </div>

                  {forgotPasswordError && (
                    <div style={{ padding: '10px 12px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', color: '#c33', fontSize: '13px', fontWeight: '500' }}>
                      {forgotPasswordError}
                    </div>
                  )}

                  <GradientSubmitButton
                    icon={Mail}
                    loading={forgotPasswordLoading}
                    loadingText="Sending..."
                  >
                    Send OTP
                  </GradientSubmitButton>
                </form>
              )}

              {forgotPasswordStep === 2 && (
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label>Enter OTP</label>
                    <p style={{ fontSize: '13px', color: '#666', background: '#f5f5f5', padding: '8px 12px', borderRadius: '6px', margin: '0' }}>
                      Sent to: <strong style={{ color: '#667eea', fontWeight: '600' }}>{forgotPasswordData.email}</strong>
                    </p>
                    <div className="input-wrapper" style={{ marginTop: '8px' }}>
                      <Lock className="form-input-icon" size={20} />
                      <input
                        type="text"
                        name="otp"
                        placeholder="Enter 6-digit OTP"
                        value={forgotPasswordData.otp}
                        onChange={handleForgotPasswordChange}
                        disabled={forgotPasswordLoading}
                        maxLength="6"
                        className="form-input"
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#666' }}>
                        <Clock size={16} style={{ color: '#f97316' }} />
                        <span>OTP expires in: <strong style={{ color: '#f97316', fontWeight: '600' }}>{timer}s</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendTimer > 0 || forgotPasswordLoading}
                        style={{
                          background: resendTimer > 0 ? '#f0f0f0' : 'none',
                          border: '1px solid #e0e0e0',
                          color: resendTimer > 0 ? '#999' : '#667eea',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.3s ease',
                          opacity: resendTimer > 0 ? 0.6 : 1,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>

                  {forgotPasswordError && (
                    <div style={{ padding: '10px 12px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', color: '#c33', fontSize: '13px', fontWeight: '500' }}>
                      {forgotPasswordError}
                    </div>
                  )}

                  <GradientSubmitButton
                    icon={Lock}
                    loading={forgotPasswordLoading}
                    loadingText="Verifying..."
                  >
                    Verify OTP
                  </GradientSubmitButton>
                </form>
              )}

              {forgotPasswordStep === 3 && (
                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label>New Password</label>
                    <div className="input-wrapper">
                      <Lock className="form-input-icon" size={20} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        placeholder="Enter new password"
                        value={forgotPasswordData.password}
                        onChange={handleForgotPasswordChange}
                        disabled={forgotPasswordLoading}
                        className="form-input"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={forgotPasswordLoading}
                        style={{
                          position: 'absolute',
                          right: '14px',
                          background: 'none',
                          border: 'none',
                          color: '#999',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.3s ease'
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Confirm Password</label>
                    <div className="input-wrapper">
                      <Lock className="form-input-icon" size={20} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        placeholder="Confirm new password"
                        value={forgotPasswordData.confirmPassword}
                        onChange={handleForgotPasswordChange}
                        disabled={forgotPasswordLoading}
                        className="form-input"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={forgotPasswordLoading}
                        style={{
                          position: 'absolute',
                          right: '14px',
                          background: 'none',
                          border: 'none',
                          color: '#999',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.3s ease'
                        }}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', color: '#999', margin: '8px 0 0 0', padding: '0' }}>
                      Password must be at least 6 characters
                    </p>
                  </div>

                  {forgotPasswordError && (
                    <div style={{ padding: '10px 12px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', color: '#c33', fontSize: '13px', fontWeight: '500' }}>
                      {forgotPasswordError}
                    </div>
                  )}

                  <GradientSubmitButton
                    icon={Lock}
                    loading={forgotPasswordLoading}
                    loadingText="Resetting..."
                  >
                    Reset Password
                  </GradientSubmitButton>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Dark Background - Empty Pattern Only */}
      <div className="pattern-container advanced-bg">
        <div className="blobs-container">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>
      </div>
    </div>
  );
}
