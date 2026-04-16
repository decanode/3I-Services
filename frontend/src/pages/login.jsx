import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import Alert from '../components/Alert';
import { AnimatedButton, Dropdown, cityOptions, COUNTRY_OPTIONS } from '../components/Button';
import DatePicker from '../components/datepicker';
import Loader from '../components/loader';
import { Scale, FileText, Network, Smartphone, Code, Settings,  CheckCircle2, ChevronRight, Zap, Briefcase, Globe, Cpu, Palette, Lock, Bell, Users, FileSpreadsheet, Mail } from 'lucide-react';
const card1 = '/cards/card1.webp';
const card2 = '/cards/card2.webp';
const card3 = '/cards/card3.webp';
const card4 = '/cards/card4.webp';
const card5 = '/cards/card5.webp';
const card6 = '/cards/card6.webp';
const card7 = '/cards/card7.webp';
const card8 = '/cards/card8.webp';
const card9 = '/cards/card9.webp';
const card10 = '/cards/card10.webp';
const card11 = '/cards/card11.webp';
const card12 = '/cards/card12.webp';
const card13 = '/cards/card13.webp';
const card14 = '/cards/card14.webp';

const CONFIG = {
  carousel: {
    transitionSpeed: 0.6,
    autoplayInterval: 2000,
    scaleDropoff: 0.4,
    spreadX: 40,
    dropY: 10,
    // Card dimensions (responsive: mobile sm  / tablet md  / desktop lg )
    cardWidth: { sm: 240, md: 400, lg: 600},   // in pixels
    cardHeight: { sm: 360, md: 400, lg: 600},  // in pixels
  },
  theme: {
    accentColor: '#fbbf24',    // Golden amber - complements maroon
    panelBg: '#450a0a',        // Deep maroon
    bgLight: '#fef2f2',        // Light rose tint background
  }
};

// --- ICONS (Inline SVGs) ---
const Icons = {
  Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>,
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
  Loader: () => <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
};




// --- CAROUSEL CARDS DATA - NEW DESIGN WITH IMAGES ---
const SERVICES_CARDS = [
  {
    id: 1,
    title: 'Regulatory Compliance',
    keyword: 'compliance',
    icon: Lock,
    iconColor: 'text-amber-600',
    gradientFrom: 'from-amber-400',
    gradientTo: 'to-orange-500',
    image: card2,
    desc: 'Licence Compliance Management - SARAS',
    features: [
      { text: 'Periodic Audit Compliance', type: 'dot' },
      { text: 'Licence Fee & Budget Management', type: 'dot' }
    ]
  },
  {
    id: 2,
    title: 'Licence Operations',
    keyword: 'licensing',
    icon: Briefcase,
    iconColor: 'text-blue-600',
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-cyan-500',
    image: card1,
    desc: 'New Licence Application on SARAL Sanchar',
    features: [
      { text: 'Licence Renewal Management', type: 'dot' },
      { text: 'Compliance Tracking', type: 'dot' }
    ]
  },
  {
    id: 3,
    title: 'Network Solutions',
    keyword: 'networking',
    icon: Globe,
    iconColor: 'text-teal-600',
    gradientFrom: 'from-teal-400',
    gradientTo: 'to-emerald-500',
    image: card4,
    desc: 'Network Optimisation & Security',
    features: [
      { text: 'Advanced Network Security', type: 'dot' },
      { text: 'Performance Monitoring', type: 'dot' }
    ]
  },
  {
    id: 4,
    title: 'Mobile Development',
    keyword: 'mobile solutions',
    icon: Smartphone,
    iconColor: 'text-purple-600',
    gradientFrom: 'from-purple-400',
    gradientTo: 'to-pink-500',
    image: card5,
    desc: 'Native & Cross-platform Mobile Apps',
    features: [
      { text: 'iOS & Android Excellence', type: 'dot' },
      { text: 'Premium User Experiences', type: 'dot' }
    ]
  },
  {
    id: 5,
    title: 'Web Development',
    keyword: 'web innovation',
    icon: Palette,
    iconColor: 'text-emerald-600',
    gradientFrom: 'from-emerald-400',
    gradientTo: 'to-green-500',
    image: card3,
    desc: 'Modern & Responsive Web Experiences',
    features: [
      { text: 'Full-Stack Technologies', type: 'dot' },
      { text: 'SEO & Performance Optimized', type: 'dot' }
    ]
  },
  {
    id: 6,
    title: 'Enterprise Software',
    keyword: 'enterprise solutions',
    icon: Cpu,
    iconColor: 'text-red-600',
    gradientFrom: 'from-red-400',
    gradientTo: 'to-rose-500',
    image: card6,
    desc: 'Custom Software for Complex Workflows',
    features: [
      { text: 'End-to-End Integration', type: 'dot' },
      { text: 'Scalable Architecture', type: 'dot' }
    ]
  },
  {
    id: 7,
    title: 'Data Analytics',
    keyword: 'data insights',
    icon: Code,
    iconColor: 'text-indigo-600',
    gradientFrom: 'from-indigo-400',
    gradientTo: 'to-blue-500',
    image: card7,
    desc: 'Advanced Data Analytics & Business Intelligence',
    features: [
      { text: 'Real-time Data Visualization', type: 'dot' },
      { text: 'Predictive Analytics', type: 'dot' }
    ]
  },
  {
    id: 8,
    title: 'Ledger Management',
    keyword: 'ledger control',
    icon: FileText,
    iconColor: 'text-blue-600',
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-cyan-500',
    image: card8,
    desc: 'Complete Ledger Remainder & Outstanding Management',
    features: [
      { text: 'Track outstanding balances', type: 'dot' },
      { text: 'Manage ledger details efficiently', type: 'dot' }
    ]
  },
  {
    id: 9,
    title: 'Excel Integration',
    keyword: 'data import',
    icon: FileSpreadsheet,
    iconColor: 'text-green-600',
    gradientFrom: 'from-green-400',
    gradientTo: 'to-emerald-500',
    image: card9,
    desc: 'Upload & Manage Excel Files with Validation',
    features: [
      { text: 'Batch upload ledger data', type: 'dot' },
      { text: 'Automatic data validation', type: 'dot' }
    ]
  },
  {
    id: 10,
    title: 'Smart Notifications',
    keyword: 'alerts',
    icon: Bell,
    iconColor: 'text-red-600',
    gradientFrom: 'from-red-400',
    gradientTo: 'to-rose-500',
    image: card10 ,
    desc: 'Automated Reminders & Collection Notifications',
    features: [
      { text: 'Schedule follow-up calls', type: 'dot' },
      { text: 'Real-time notification alerts', type: 'dot' }
    ]
  },
  {
    id: 11,
    title: 'Activity Logging',
    keyword: 'audit trail',
    icon: FileText,
    iconColor: 'text-purple-600',
    gradientFrom: 'from-purple-400',
    gradientTo: 'to-pink-500',
    image: card11,
    desc: 'Complete Activity Logs & Audit Trail',
    features: [
      { text: 'Track all system changes', type: 'dot' },
      { text: 'Generate compliance reports', type: 'dot' }
    ]
  },
  {
    id: 12,
    title: 'Team Management',
    keyword: 'team control',
    icon: Users,
    iconColor: 'text-amber-600',
    gradientFrom: 'from-amber-400',
    gradientTo: 'to-orange-500',
    image: card12,
    desc: 'User & Employee Management System',
    features: [
      { text: 'Manage user roles & permissions', type: 'dot' },
      { text: 'Track employee activities', type: 'dot' }
    ]
  },
  {
    id: 13,
    title: 'Email Notifications',
    keyword: 'communication',
    icon: Mail,
    iconColor: 'text-orange-600',
    gradientFrom: 'from-orange-400',
    gradientTo: 'to-red-500',
    image: card13,
    desc: 'Automated Email Notifications with Nodemailer',
    features: [
      { text: 'Send automated email alerts & reminders', type: 'dot' },
      { text: 'Collect customer feedback via email', type: 'dot' }
    ]
  },
  {
    id: 14,
    title: 'Admin Panel',
    keyword: 'administration',
    icon: Settings,
    iconColor: 'text-slate-600',
    gradientFrom: 'from-slate-400',
    gradientTo: 'to-gray-500',
    image: card14,
    desc: 'Complete Admin Control & Configuration',
    features: [
      { text: 'Approve/reject user registrations', type: 'dot' },
      { text: 'System settings & configurations', type: 'dot' }
    ]
  },
];

function resolveGradientColor(tailwindClass) {
  const map = {
    'from-amber-400': '#fbbf24', 'from-blue-400': '#60a5fa',
    'from-teal-400': '#2dd4bf', 'from-purple-400': '#c4b5fd',
    'from-emerald-400': '#6ee7b7', 'from-green-400': '#4ade80',
    'from-red-400': '#f87171',   'from-indigo-400': '#818cf8',
    'from-orange-400': '#fb923c', 'from-slate-400': '#94a3b8',
    'to-orange-500': '#f97316',  'to-cyan-500': '#06b6d4',
    'to-emerald-500': '#10b981', 'to-pink-500': '#ec4899',
    'to-green-500': '#22c55e',   'to-rose-500': '#f43f5e',
    'to-blue-500': '#3b82f6',    'to-red-500': '#ef4444',
    'to-gray-500': '#6b7280',
  };
  return map[tailwindClass] || '#9ca3af';
}

export default function LoginPage() {
  const isScrolling = useRef(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Responsive card size
  const [cardSize, setCardSize] = useState('lg');
  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth;
      if (w < 640) setCardSize('sm');
      else if (w < 1024) setCardSize('md');
      else setCardSize('lg');
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // UI Flow State
  const [activePanel, setActivePanel] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Function to arrange cards in specific order: 1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13, 7, 14
  const arrangeCardsInOrder = () => {
    const order = [1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13, 7, 14];
    return order.map(id => SERVICES_CARDS.find(card => card.id === id));
  };

  // Memoized cards based on active panel
  const currentCards = useMemo(() => {
    if (activePanel === null) {
      // Normal view: show all 14 cards in the specific order
      return arrangeCardsInOrder();
    } else if (activePanel === 'login') {
      // Login view: show cards 1-7 in order
      return [1, 2, 3, 4, 5, 6, 7].map(id => SERVICES_CARDS.find(card => card.id === id));
    } else if (activePanel === 'signup') {
      // Signup view: show cards 8-14 in order
      return [8, 9, 10, 11, 12, 13, 14].map(id => SERVICES_CARDS.find(card => card.id === id));
    }
    return [];
  }, [activePanel]);
  
  // Forms State
  const [formData, setFormData] = useState({
    userId: '', password: '', firstName: '', lastName: '', fatherName: '',
    dob: '', city: '', countryCode: '+91', phone: '', email: ''
  });
  
  const [forgotData, setForgotData] = useState({ email: '', otp: '', password: '', confirmPassword: '' });
  const [forgotStep, setForgotStep] = useState(1);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpTimer, setOtpTimer] = useState(0);

  // Toggles & Status
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const [alert, setAlert] = useState(null);
  const [emailCardHovered, setEmailCardHovered] = useState(false);
  const [emailCardClicked, setEmailCardClicked] = useState(false);
  const emailCardTimerRef = useRef(null);
  const CYCLE_WORDS = ['Review', 'Suggest', 'Order', 'Consult', 'Analyse', 'Insight', 'Advise', 'Design'];
  const [cycleIndex, setCycleIndex] = useState(0);
  const [cycleVisible, setCycleVisible] = useState(true);

  const OTP_VALID_TIME = 120;
  const OTP_RESEND_TIME = 60;

  const handleImageLoad = useCallback((cardId) => {
    setLoadedImages(prev => ({ ...prev, [cardId]: true }));
  }, []);

  const showAlert = useCallback((type, message) => {
    const titleMap = { error: 'Error', success: 'Success' };
    setAlert({
      type,
      title: titleMap[type] || type,
      message,
      onConfirm: () => setAlert(null),
      onCancel: () => setAlert(null),
    });
  }, []);

  const handleInputChange = (e, target = 'form') => {
    const { name, value } = e.target;
    if (target === 'forgot') {
      setForgotData(prev => ({ 
        ...prev, 
        [name]: name === 'otp' ? value.replace(/\D/g, '').slice(0, 6) : value 
      }));
    } else {
      if (name === 'phone') {
        setFormData(prev => ({ ...prev, [name]: value.replace(/\D/g, '').slice(0, 10) }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    }
  };

  // --- REAL API HANDLERS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.userId || !formData.password) {
      return showAlert('error', 'Please fill all required fields');
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: formData.userId, password: formData.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      login(data.user);
      navigate('/dashboard');
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (formData.phone.length !== 10) {
      return showAlert('error', 'Phone number must be exactly 10 digits');
    }
    
    setIsLoading(true);
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
      
      showAlert('success', 'Request sent for admin. Wait for confirmation mail.');
      setTimeout(() => {
        setActivePanel('login');
        setFormData({
          userId: '', password: '', firstName: '', lastName: '', fatherName: '',
          dob: '', city: '', countryCode: '+91', phone: '', email: ''
        });
      }, 2500);
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Flow
  const handleForgotSendOtp = async (e) => {
    e?.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotData.email)) {
      return showAlert('error', 'Please enter a valid email');
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/password/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotData.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      
      setForgotStep(2);
      setOtpTimer(OTP_VALID_TIME);
      setResendTimer(OTP_RESEND_TIME);
      setForgotData(prev => ({ ...prev, otp: '' }));
      showAlert('success', `OTP sent to ${forgotData.email}`);
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/password/resend-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotData.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resend OTP');
      
      setOtpTimer(OTP_VALID_TIME);
      setResendTimer(OTP_RESEND_TIME);
      setForgotData(prev => ({ ...prev, otp: '' }));
      showAlert('success', 'OTP resent to your email');
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    if (forgotData.otp.length !== 6) {
      return showAlert('error', 'OTP must be 6 digits');
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/password/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotData.email, otp: forgotData.otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid OTP');
      
      setForgotStep(3);
      setForgotData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      showAlert('success', 'OTP verified. Set new password.');
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    
    if (forgotData.password.length < 6) {
      return showAlert('error', 'Password must be at least 6 characters');
    }
    if (forgotData.password !== forgotData.confirmPassword) {
      return showAlert('error', 'Passwords do not match');
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/password/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotData.email,
          otp: forgotData.otp,
          newPassword: forgotData.password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');
      
      showAlert('success', 'Password reset successfully!');
      setForgotData({ email: '', otp: '', password: '', confirmPassword: '' });
      setForgotStep(1);
      setTimeout(() => setActivePanel('login'), 2000);
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    setActiveIndex(0);
  }, [activePanel]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0 && forgotStep === 2) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, forgotStep]);

  useEffect(() => {
    let interval;
    if (otpTimer > 0 && forgotStep === 2) {
      interval = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer, forgotStep]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCycleVisible(false);
      setTimeout(() => {
        setCycleIndex(prev => (prev + 1) % CYCLE_WORDS.length);
        setCycleVisible(true);
      }, 350);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const handleEmailCardClick = (e) => {
    e.preventDefault();
    if (emailCardTimerRef.current) clearTimeout(emailCardTimerRef.current);
    setEmailCardClicked(true);
    emailCardTimerRef.current = setTimeout(() => setEmailCardClicked(false), 3000);
  };

  const generateLongShadow = (length = 15) => {
    let shadow = '';
    const color = '#fecdd3';  // Rose-200 for maroon theme
    for (let i = 1; i <= length; i++) shadow += `${i}px ${i}px 0 ${color}${i === length ? '' : ','}`;
    return shadow;
  };

  // Carousel Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') setActiveIndex((prev) => (prev + 1) % currentCards.length);
      else if (e.key === 'ArrowLeft') setActiveIndex((prev) => (prev - 1 + currentCards.length) % currentCards.length);
    };

    const handleWheel = (e) => {
      if (isScrolling.current) return;
      isScrolling.current = true;
      setTimeout(() => { isScrolling.current = false; }, Math.max(400, CONFIG.carousel.transitionSpeed * 500));
      if (e.deltaY > 0 || e.deltaX > 0) setActiveIndex((prev) => (prev + 1) % currentCards.length);
      else if (e.deltaY < 0 || e.deltaX < 0) setActiveIndex((prev) => (prev - 1 + currentCards.length) % currentCards.length);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    
    const autoplayTimer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % currentCards.length);
    }, CONFIG.carousel.autoplayInterval);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      clearInterval(autoplayTimer);
    };
  }, [currentCards.length]);

  // Shared Form Styles - Deep Maroon Theme. 
  // Added custom autofill targeting classes to suppress native browser yellow background
  const inputStyle = "w-full bg-transparent border-b border-rose-300/30 text-white py-2 focus:outline-none focus:border-amber-400 transition-colors placeholder:text-rose-200/50 text-sm md:text-base autofill:!bg-transparent autofill:shadow-[inset_0_0_0px_1000px_transparent] autofill:[-webkit-text-fill-color:white] [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#450a0a] [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:transition-all [&:-webkit-autofill]:duration-5000";
  const btnStyle = "w-full py-3 bg-amber-400 text-rose-950 font-bold rounded-md hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      {!location.state?.fromLogout && <Loader />}
      <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center font-sans bg-rose-50">
      
      {/* Dynamic Background Pattern */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #fecdd3 1px, transparent 1px),
            linear-gradient(to bottom, #fecdd3 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 100% 0%, #000 50%, transparent 90%)",
          maskImage: "radial-gradient(ellipse 80% 80% at 100% 0%, #000 50%, transparent 90%)",
        }}
      />

      {/* Top Right Toggle Button */}
      <button
        onClick={() => setActivePanel(activePanel ? null : 'login')}
        className="absolute top-6 right-6 md:top-8 md:right-10 z-[60] text-rose-900 font-bold text-lg md:text-xl tracking-wide hover:text-rose-600 transition-colors"
      >
        {activePanel ? 'CLOSE' : 'LOGIN'}
      </button>

      {/* LEFT SLIDING PANEL (LOGIN / FORGOT PASS) */}
      <div 
        className={`absolute top-0 left-0 h-full w-full md:w-[450px] bg-gradient-to-br from-[#450a0a] to-[#7f1d1d] shadow-[20px_0_50px_rgba(127,29,29,0.4)] z-[55] flex flex-col justify-center px-8 md:px-12 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          (activePanel === 'login' || activePanel === 'forgot') ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* LOGIN VIEW */}
        {activePanel === 'login' && (
          <div className="animate-fadeIn">
            <h2 className="text-4xl md:text-5xl font-black text-amber-400 mb-2 tracking-tighter">WELCOME.</h2>
            <p className="text-rose-200/70 mb-10 font-light">Enter your credentials to access the portal.</p>
            
            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <input name="userId" value={formData.userId} onChange={handleInputChange} className={inputStyle} type="text" placeholder="User ID" required />
              
              <div className="relative">
                <input name="password" value={formData.password} onChange={handleInputChange} className={inputStyle} type={showPassword ? 'text' : 'password'} placeholder="Password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-rose-200/60 hover:text-white">
                  {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => setActivePanel('forgot')} className="text-sm text-rose-200/60 hover:text-amber-400 transition-colors">Forgot Password?</button>
              </div>

              <AnimatedButton variant="maroon" loading={isLoading} loadingText="SIGNING IN...">
                SIGN IN
              </AnimatedButton>
            </form>
            
            <p className="mt-8 text-center text-sm text-rose-200/60 font-light">
              Don&apos;t have an account? 
              <button onClick={() => setActivePanel('signup')} className="text-amber-400 hover:text-white font-bold ml-2 transition-colors">Sign Up</button>
            </p>
          </div>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {activePanel === 'forgot' && (
          <div className="animate-fadeIn">
            <button onClick={() => { setActivePanel('login'); setForgotStep(1); }} className="text-rose-200/60 hover:text-white mb-8 flex items-center gap-2">
              <Icons.ArrowLeft /> Back to Login
            </button>
            
            <h2 className="text-3xl md:text-4xl font-black text-amber-400 mb-2 tracking-tighter">RECOVER.</h2>
            <p className="text-rose-200/70 mb-10 font-light">
              {forgotStep === 1 ? 'Enter your email to receive an OTP.' : forgotStep === 2 ? 'Enter the 6-digit code sent to your email.' : 'Secure your account with a new password.'}
            </p>

            {/* STEP 1: Email */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotSendOtp} className="flex flex-col gap-6">
                <input name="email" value={forgotData.email} onChange={(e) => handleInputChange(e, 'forgot')} className={inputStyle} type="email" placeholder="Email Address" required />
                <button type="submit" disabled={isLoading} className={btnStyle}>{isLoading ? <Icons.Loader /> : 'SEND OTP'}</button>
              </form>
            )}

            {/* STEP 2: Verify OTP */}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotVerifyOtp} className="flex flex-col gap-6">
                <input name="otp" value={forgotData.otp} onChange={(e) => handleInputChange(e, 'forgot')} className={`${inputStyle} text-center tracking-[0.5em] text-2xl font-bold`} type="text" maxLength={6} placeholder="------" required />
                {otpTimer > 0 && (
                  <p className="text-center text-sm text-rose-200/60">OTP valid for {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}</p>
                )}
                <button type="submit" disabled={isLoading} className={btnStyle}>{isLoading ? <Icons.Loader /> : 'VERIFY OTP'}</button>
                <div className="text-center mt-4">
                  <button type="button" onClick={handleResendOtp} disabled={resendTimer > 0 || isLoading} className={`text-sm ${resendTimer > 0 ? 'text-rose-300/50' : 'text-amber-400 hover:text-white'}`}>
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Reset Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleForgotReset} className="flex flex-col gap-6">
                <div className="relative">
                  <input name="password" value={forgotData.password} onChange={(e) => handleInputChange(e, 'forgot')} className={inputStyle} type={showPassword ? 'text' : 'password'} placeholder="New Password (min 6 chars)" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-rose-200/60 hover:text-white">{showPassword ? <Icons.EyeOff /> : <Icons.Eye />}</button>
                </div>
                <div className="relative">
                  <input name="confirmPassword" value={forgotData.confirmPassword} onChange={(e) => handleInputChange(e, 'forgot')} className={inputStyle} type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm Password" required minLength={6} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-rose-200/60 hover:text-white">{showConfirmPassword ? <Icons.EyeOff /> : <Icons.Eye />}</button>
                </div>
                <button type="submit" disabled={isLoading} className={btnStyle}>{isLoading ? <Icons.Loader /> : 'RESET PASSWORD'}</button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SLIDING PANEL (SIGNUP) */}
      <div 
        className={`absolute top-0 right-0 h-full w-full md:w-[450px] md:min-w-[450px] bg-gradient-to-bl from-[#450a0a] to-[#7f1d1d] shadow-[-20px_0_50px_rgba(127,29,29,0.4)] z-[55] flex flex-col py-12 px-8 md:px-12 overflow-y-auto [&::-webkit-scrollbar]:hidden transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          activePanel === 'signup' ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <h2 className="text-4xl md:text-5xl font-black text-amber-400 mb-2 tracking-tighter">JOIN US.</h2>
        <p className="text-rose-200/70 mb-8 font-light">Create an account to become part of our network.</p>
        
        <form onSubmit={handleSignup} className="flex flex-col gap-6 mt-auto mb-auto">
          <div className="grid grid-cols-2 gap-4">
            <input name="firstName" value={formData.firstName} onChange={handleInputChange} className={inputStyle} type="text" placeholder="First Name" required />
            <input name="lastName" value={formData.lastName} onChange={handleInputChange} className={inputStyle} type="text" placeholder="Last Name" required />
          </div>
          
          <input name="fatherName" value={formData.fatherName} onChange={handleInputChange} className={inputStyle} type="text" placeholder="Father's Name" required />
          
          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="relative">
              <DatePicker
                value={formData.dob}
                onChange={(value) => handleInputChange({ target: { name: 'dob', value } })}
                required
                variant="signup"
                className={`w-full bg-transparent border-b border-rose-300/30 text-white py-2 focus:outline-none focus:border-amber-400 transition-colors placeholder:text-rose-200/50 text-sm md:text-base`}
              />
            </div>
            <div className="relative">
              <Dropdown
                options={cityOptions}
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Select City"
                name="city"
                required
                variant="signup"
                className={`w-full bg-transparent border-b border-rose-300/30 text-white py-2 focus:outline-none focus:border-amber-400 transition-colors placeholder:text-rose-200/50 text-sm md:text-base`}
              />
            </div>
          </div>

          <div className="flex gap-4 items-end">
            <div className="w-[70px] shrink-0 relative">
              <Dropdown
                options={COUNTRY_OPTIONS}
                value={formData.countryCode}
                onChange={handleInputChange}
                placeholder="+91"
                name="countryCode"
                required
                variant="signup"
                className={`w-full bg-transparent border-b border-rose-300/30 text-white py-2 focus:outline-none focus:border-amber-400 transition-colors placeholder:text-rose-200/50 text-sm md:text-base`}
              />
            </div>
            <input name="phone" value={formData.phone} onChange={handleInputChange} className={`${inputStyle} flex-1`} type="tel" placeholder="Phone (10 digits)" maxLength={10} required />
          </div>

          <input name="email" value={formData.email} onChange={handleInputChange} className={inputStyle} type="email" placeholder="Email Address" required />

          <AnimatedButton variant="maroon" loading={isLoading} loadingText="CREATING ACCOUNT...">
            CREATE ACCOUNT
          </AnimatedButton>
        </form>
        
        <p className="mt-8 text-center text-sm text-rose-200/60 font-light">
          Already have an account? 
          <button onClick={() => setActivePanel('login')} className="text-amber-400 hover:text-white font-bold ml-2 transition-colors">Log In</button>
        </p>
      </div>

      {/* Top Left Background Heading */}
      <div className="absolute top-6 left-6 md:top-8 md:left-10 select-none pointer-events-none z-10">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-rose-900 leading-none tracking-tighter whitespace-nowrap" style={{ textShadow: generateLongShadow(10) }}>
          3i SERVICES
        </h1>
      </div>

      {/* Main Carousel Area */}
      <div className={`absolute inset-0 z-40 flex items-center justify-center transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
        (activePanel === 'login' || activePanel === 'forgot') ? 'md:translate-x-[225px]' : activePanel === 'signup' ? 'md:-translate-x-[225px]' : 'translate-x-0'
      }`} style={{ perspective: '1200px' }}>
        {currentCards.map((card, index) => {
          const totalCards = currentCards.length;
          let offset = ((index - activeIndex) % totalCards + totalCards) % totalCards;
          if (offset > Math.floor(totalCards / 2)) offset -= totalCards;
          
          const absOffset = Math.abs(offset);
          const scale = Math.max(0.4, 1 - absOffset * CONFIG.carousel.scaleDropoff);
          const spreadMultiplier = cardSize === 'sm' ? 4 : cardSize === 'md' ? 7 : 10;
          const translateXpx = offset * CONFIG.carousel.spreadX * spreadMultiplier;
          const translateY = absOffset * CONFIG.carousel.dropY; 
          const zIndex = 50 - absOffset;
          const opacity = Math.max(0, 1 - absOffset * 0.35);

          return (
            <div
              key={card.id}
              onClick={() => setActiveIndex(index)}
              className="absolute cursor-pointer"
              style={{
                left: '50%',
                top: '50%',
                transition: `all ${CONFIG.carousel.transitionSpeed}s cubic-bezier(0.25, 1, 0.5, 1)`,
                transform: `translate(-50%, -50%) translateX(${translateXpx}px) translateY(${translateY}vh) scale(${scale})`,
                zIndex: zIndex, 
                opacity: opacity, 
                pointerEvents: opacity === 0 ? 'none' : 'auto',
              }}
            >
              <div 
                  className={`relative shadow-2xl rounded-3xl flex flex-col overflow-hidden transition-all duration-700 cursor-default`}
                  style={{
                    width: `${CONFIG.carousel.cardWidth[cardSize]}px`,
                    height: `${CONFIG.carousel.cardHeight[cardSize]}px`,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%)',
                  }}
                >
                  {/* Top Image Section */}
                  <div
                    className="relative overflow-hidden"
                    style={{
                      height: cardSize === 'sm' ? '148px' : cardSize === 'md' ? '200px' : '320px',
                      background: `linear-gradient(135deg, ${resolveGradientColor(card.gradientFrom)}, ${resolveGradientColor(card.gradientTo)})`,
                    }}
                  >
                    <img
                      src={card.image}
                      alt={card.title}
                      width={600}
                      height={384}
                      loading={index === activeIndex ? 'eager' : 'lazy'}
                      fetchPriority={index === activeIndex ? 'high' : 'low'}
                      decoding="async"
                      onLoad={() => handleImageLoad(card.id)}
                      className={`w-full h-full object-cover transition-opacity duration-500 ${
                        loadedImages[card.id] ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/30 pointer-events-none" />
                    {/* Icon badge bottom-right */}
                    <div
                      className={`absolute bottom-2 right-2 flex items-center justify-center shadow-md ${cardSize === 'sm' ? 'w-7 h-7 rounded-lg' : 'w-10 h-10 rounded-xl'}`}
                      style={{ background: `linear-gradient(135deg, ${resolveGradientColor(card.gradientFrom)}, ${resolveGradientColor(card.gradientTo)})`, filter: 'brightness(0.85)' }}
                    >
                      {React.createElement(card.icon, { size: cardSize === 'sm' ? 14 : 20, strokeWidth: 2, className: 'text-white drop-shadow-lg' })}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className={`flex flex-col flex-1 relative z-10 ${cardSize === 'sm' ? 'p-3' : cardSize === 'md' ? 'p-5' : 'p-8'}`}>
                    {/* Header with Icon */}
                    <div className={`flex items-start justify-between ${cardSize === 'sm' ? 'mb-2' : 'mb-4'}`}>
                      <h3 className={`font-black text-gray-900 tracking-tight leading-tight ${cardSize === 'sm' ? 'text-base' : cardSize === 'md' ? 'text-xl' : 'text-2xl'}`}>{card.title}</h3>
                    </div>

                    {/* Description with Colorful Background */}
                    <div className={`rounded-xl transition-all duration-500 ${cardSize === 'sm' ? 'mb-2 p-2' : cardSize === 'md' ? 'mb-3 p-3' : 'mb-5 p-4 rounded-2xl'}`}
                      style={{
                        background: `linear-gradient(135deg, ${card.gradientFrom === 'from-amber-400' ? 'rgba(251,191,36,0.12)' : card.gradientFrom === 'from-blue-400' ? 'rgba(96,165,250,0.12)' : card.gradientFrom === 'from-teal-400' ? 'rgba(45,212,191,0.12)' : card.gradientFrom === 'from-purple-400' ? 'rgba(196,181,253,0.12)' : card.gradientFrom === 'from-emerald-400' ? 'rgba(110,231,183,0.12)' : 'rgba(248,113,113,0.12)'}, rgba(255,255,255,0.8))`,
                      }}
                    >
                      <p className={`text-gray-700 font-semibold leading-snug ${cardSize === 'sm' ? 'text-xs' : cardSize === 'md' ? 'text-sm' : 'text-base leading-relaxed'}`}>
                        {card.desc}
                      </p>
                    </div>

                    {/* Features */}
                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
                      <div className={cardSize === 'sm' ? 'space-y-1' : 'space-y-2.5'}>
                        {card.features && card.features.map((feature, idx) => (
                          <div key={idx} className={`flex items-start gap-2 rounded-lg ${cardSize === 'sm' ? 'p-1' : 'p-2'}`}>
                            <div className={`flex-shrink-0 rounded-full shadow-md ${cardSize === 'sm' ? 'w-1 h-1 mt-1.5' : 'w-1.5 h-1.5 mt-2'} ${
                              idx === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                              idx === 1 ? `bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo}` :
                              'bg-gradient-to-br from-gray-400 to-gray-500'
                            }`}></div>
                            <span className={`text-gray-700 font-semibold ${cardSize === 'sm' ? 'text-xs' : 'text-sm'}`}>
                              {feature.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Sentence Footer */}
      <div className={`absolute bottom-12 flex z-40 text-center px-4 drop-shadow-lg transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
        (activePanel === 'login' || activePanel === 'forgot') ? 'md:translate-x-[225px]' : activePanel === 'signup' ? 'md:-translate-x-[225px]' : 'translate-x-0'
      }`}>
        <p className="text-lg sm:text-2xl text-rose-700/70 font-light tracking-wide">
          Empowering your business with <span className="font-black text-rose-900 uppercase transition-all duration-500 inline-block min-w-[150px]">{currentCards[activeIndex]?.keyword}</span>.
        </p>
      </div>

    </div>

    {alert && (
      <Alert
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onConfirm={alert.onConfirm}
        onCancel={alert.onCancel}
      />
    )}

    {/* Attribution Card */}
    <style>{`
      @keyframes dn-shimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      @keyframes dn-glow-pulse {
        0%, 100% { box-shadow: 0 2px 14px rgba(136,19,55,0.10), 0 0 0 1px rgba(251,191,36,0.18); }
        50%       { box-shadow: 0 4px 22px rgba(136,19,55,0.22), 0 0 0 1px rgba(251,191,36,0.40); }
      }
      .dn-brand {
        background: linear-gradient(90deg, #881337 0%, #c2410c 30%, #fbbf24 50%, #c2410c 70%, #881337 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: dn-shimmer 2.4s linear infinite;
        font-weight: 900;
        letter-spacing: -0.03em;
        line-height: 1;
        white-space: nowrap;
      }
      .dn-card {
        animation: dn-glow-pulse 3s ease-in-out infinite;
      }
    `}</style>
    <a
      href="#"
      onClick={handleEmailCardClick}
      onMouseEnter={() => setEmailCardHovered(true)}
      onMouseLeave={() => setEmailCardHovered(false)}
      className="dn-card fixed bottom-3 right-3 md:bottom-5 md:right-5 z-[100] flex items-center px-3 md:px-5 rounded-xl md:rounded-2xl backdrop-blur-md bg-white/80 border border-amber-200/30 cursor-pointer select-none no-underline overflow-hidden w-[230px] md:w-[260px]"
      style={{ height: '32px' }}
    >
      {(() => {
        const showEmail = emailCardHovered || emailCardClicked;
        return (
          <div className="relative w-full h-full flex items-center">
            {/* Default: created by DecaNode */}
            <div
              className="absolute inset-0 flex items-center gap-2"
              style={{
                transition: 'transform 0.45s cubic-bezier(0.25,1,0.5,1), opacity 0.35s ease, filter 0.35s ease',
                transform: showEmail ? 'translateY(-130%)' : 'translateY(0%)',
                opacity: showEmail ? 0 : 1,
                filter: showEmail ? 'blur(5px)' : 'blur(0px)',
              }}
            >
              <span className="text-amber-400 leading-none shrink-0" style={{ fontSize: '10px' }}>✦</span>
              <span style={{ fontSize: '10px', fontWeight: 500, color: '#be123c', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                created by&nbsp;
              </span>
              <span className="dn-brand" style={{ fontSize: '13px' }}>DecaNode</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#b45309',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  marginLeft: '4px',
                  transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.25,1,0.5,1), filter 0.35s ease',
                  opacity: cycleVisible ? 1 : 0,
                  transform: cycleVisible ? 'translateY(0px)' : 'translateY(-6px)',
                  filter: cycleVisible ? 'blur(0px)' : 'blur(3px)',
                  display: 'inline-block',
                  textTransform: 'uppercase',
                }}
              >
                · {CYCLE_WORDS[cycleIndex]}
              </span>
            </div>
            {/* Hover/click: email */}
            <div
              className="absolute inset-0 flex items-center gap-2"
              style={{
                transition: 'transform 0.45s cubic-bezier(0.25,1,0.5,1), opacity 0.35s ease, filter 0.35s ease',
                transform: showEmail ? 'translateY(0%)' : 'translateY(130%)',
                opacity: showEmail ? 1 : 0,
                filter: showEmail ? 'blur(0px)' : 'blur(5px)',
              }}
            >
              <Mail size={11} className="text-amber-500 shrink-0" />
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#9f1239', letterSpacing: '-0.01em', whiteSpace: 'nowrap', flex: 1 }}>
                decanode10@gmail.com
              </span>
              <a
                href="https://mail.google.com/mail/?view=cm&to=decanode10@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 flex items-center justify-center rounded-md md:rounded-lg transition-all duration-200 hover:scale-110"
                style={{ width: '20px', height: '20px', background: 'linear-gradient(135deg, #fbbf24, #f97316)', boxShadow: '0 2px 6px rgba(251,191,36,0.4)' }}
                title="Send mail to DecaNode"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/>
                </svg>
              </a>
            </div>
          </div>
        );
      })()}
    </a>
    </>
  );
}
