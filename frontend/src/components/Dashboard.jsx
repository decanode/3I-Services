import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, ArrowLeft } from 'lucide-react';
import Sidebar from './sidebar';
import { useAuth } from '../context/AuthContext';
import '../styles/componentstyles/Dashboard.css';

export default function Dashboard({ activeTab, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen((o) => !o);
  const closeMobileSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    await logout(); // calls backend to invalidate session + clears local state
    navigate('/login', { state: { fromLogout: true } });
  };

  const handleTabChange = (tabId) => {
    navigate(`/${tabId}`);
  };

  const PAGE_TITLES = {
    home: '3i Services',
    view: 'Ledger View',
    'view-master': 'Master Data',
    notify: 'Notifications',
    'view-notify': 'Ledger Notifications',
    'view-notify-detail': 'Notification Detail',
    'view-log': 'Activity Logs',
    'view-outstandings': 'Outstandings',
    excel: 'Excel Upload',
    profile: 'Profile',
  };
  const pageTitle = PAGE_TITLES[activeTab] || '3i Services';

  return (
    <div className="common-dashboard">
      <Sidebar
        isMobile={isMobile}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onCloseMobile={closeMobileSidebar}
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        onLogout={handleLogout}
        userRole={user?.role}
      />

      <main className="common-dashboard-main">
        {isMobile && (
          <div className="mobile-header">
            <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Open Menu">
              <Menu size={24} />
            </button>
            <h1 className="mobile-app-title">{pageTitle}</h1>
            {activeTab !== 'home' && (
              <button className="mobile-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
                <ArrowLeft size={16} />
                Back
              </button>
            )}
          </div>
        )}
        <div className="common-dashboard-body">
          {children}
        </div>
      </main>
    </div>
  );
}