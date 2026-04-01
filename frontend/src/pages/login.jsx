import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn, UserPlus, MapPin, Phone, Mail, Eye, EyeOff, Scale, FileText, Network, Smartphone, Code, Settings, PieChart, Cpu, RadioTower } from 'lucide-react';
import { Dropdown, cityOptions } from '../components/Button';
import DatePicker from '../components/datepicker';
import Alert from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import Masonry from '../components/Masonry';
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

const renderCardFront = (card) => (
  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: 'transparent', borderRadius: '12px' }}>
    <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
      {card.icon}
    </div>
    <h1 style={{ fontSize: 'px', fontWeight: 'bold', color: '#ffffff', textAlign: 'center', margin: 0 }}>
      {card.title}
    </h1>
  </div>
);

const renderCardBack = (card) => (
  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'transparent', color: '#ffffff', borderRadius: '12px', overflowY: 'auto' }}>
    <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', marginBottom: '12px', borderBottom: '2px solid rgba(255,255,255,0.3)', paddingBottom: '8px' }}>
      {card.title}
    </h4>
    {card.description && (
      <p style={{ fontSize: '18px', color: '#ffffff', marginBottom: '12px', lineHeight: '1.5' }}>
        {card.description}
      </p>
    )}
    {card.tags && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {card.tags.map((tag, i) => (
          <span key={i} style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)' }}>
            {tag}
          </span>
        ))}
      </div>
    )}
    <ul style={{ listStyleType: 'none', padding: 0, margin: 0, flexGrow: 1 }}>
      {card.features.map((feature, i) => (
        <li key={i} style={{ fontSize: '17px', color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ color: '#60a5fa', marginRight: '8px', flexShrink: 0 }}>✓</span>
          {feature}
        </li>
      ))}
    </ul>
  </div>
);

const loginItems = cardData.map((card, idx) => ({
  id: card.id,
  height: card.height,
  name: `div-c-${idx+1}`,
  content: renderCardFront(card),
  flipContent: renderCardBack(card),
  raw: card
}));

const signupItems = [...loginItems].reverse();

const AnimatedBackground = ({ items }) => {
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 5000); // Shift focus every 5 seconds
    return () => clearInterval(interval);
  }, [items.length]);

  return (
    <div className="pattern-container advanced-bg">
      <div className="blobs-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      <div className="floating-cards-wrapper">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          
          // Generate background positions
          const bgLeft = `${10 + (index * 47) % 65}%`;
          const bgTop = `${10 + (index * 31) % 65}%`;
          const animDelay = `${index * -2}s`;
          
          return (
            <div 
              key={item.id} 
              className={`floating-card-container ${isActive ? 'active-hero-card' : 'bg-float-card'}`}
              style={isActive ? {} : { 
                left: bgLeft, 
                top: bgTop
              }}
            >
              <div className="card-bobble" style={{ animationDelay: animDelay }}>
                <div className="glass-card main-glass-card">
                  {item.content}
                </div>
                {/* Automated Popups (Rooted) */}
                <div className="popup-root popup-1">
                  <div className="glass-card small-popup">
                    <h4>{item.raw.title}</h4>
                    <div style={{fontSize: '11px', opacity: 0.8}}>Focus Module</div>
                  </div>
                </div>
                {item.raw.features && item.raw.features.length > 0 && (
                  <div className="popup-root popup-2">
                    <div className="glass-card small-popup">
                      <ul style={{ padding: 0, margin: 0, listStyle: 'none', fontSize: '11px' }}>
                        <li>✓ {item.raw.features[0]}</li>
                        {item.raw.features[1] && <li>✓ {item.raw.features[1]}</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
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

        // Reset form and switch to login view after a delay
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
                  {/* First Name Input */}
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

                  {/* Last Name Input */}
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

                {/* Father's name (required by API for user ID / password generation) */}
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

                {/* Date of Birth */}
                <div className="form-group">
                  <label>Date of Birth</label>
                  <DatePicker
                    name="dob"
                    value={formData.dob}
                    onChange={(value) => handleInputChange({ target: { name: 'dob', value } })}
                    required={true}
                  />
                </div>

                {/* City Dropdown */}
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

                {/* Phone Number with Country Code */}
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

                {/* Email */}
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
                {/* User ID Input */}
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

                {/* Password Input */}
                <div className="form-group">
                  <div className="password-header">
                    <label htmlFor="password">Password</label>
                    <button type="button" className="forgot-password-link">
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

            {/* Login/Signup Button */}
            <button type="submit" className="login-button" disabled={!!alertState}>
              <LogIn size={20} />
              {isLogin ? 'Login' : 'Create Account'}
            </button>
          </form>

          {/* Toggle Link */}
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
        </div>
      </div>

      {/* Right Dark Background with Pattern */}
      {isLogin ? (
        <AnimatedBackground items={loginItems} />
      ) : (
        <AnimatedBackground items={signupItems} />
      )}
    </div>
  );
}
