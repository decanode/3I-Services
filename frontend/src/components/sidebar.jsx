import { Home, FileSpreadsheet, Table2, LogOut, UploadCloud } from 'lucide-react';
import '../styles/componentstyles/sidebar.css';

const NAV_ITEMS = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'excel', icon: UploadCloud, label: 'Upload Files' },
  { id: 'view', icon: Table2, label: 'View data' },
  { id: 'notify', icon: FileSpreadsheet, label: 'Collection Details' },
];

export default function Sidebar({
  isMobile,
  isOpen,
  onToggle,
  onCloseMobile,
  activeTab,
  onSelectTab,
  onLogout,
  logoTitle = '7FS',
}) {
  return (
    <div className="sidebar-root">
      <div
        role="presentation"
        className={`sidebar-overlay ${isMobile && isOpen ? 'active' : ''}`}
        onClick={onCloseMobile}
      />

      <aside className={`sidebar ${isMobile && isOpen ? 'mobile-visible' : ''}`}>
        <div className="sidebar__header">
          <div
            className="sidebar__brand"
            onClick={onToggle}
            onKeyDown={(e) => e.key === 'Enter' && onToggle()}
            role="button"
            tabIndex={0}
          >
            <div className="sidebar__brand-icon">
              <FileSpreadsheet size={22} />
            </div>
            <span className="sidebar__logo-text">{logoTitle}</span>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Main">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              className={`sidebar__nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => {
                onSelectTab(id);
                if (isMobile) onCloseMobile?.();
              }}
            >
              <span className="sidebar__nav-icon">
                <Icon size={20} />
              </span>
              <span className="sidebar__nav-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__logout-wrap">
          <button type="button" className="sidebar__logout-btn" onClick={onLogout}>
            <span className="sidebar__nav-icon">
              <LogOut size={20} />
            </span>
            <span className="sidebar__logout-text sidebar__logout-label">Logout</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

export { NAV_ITEMS };
