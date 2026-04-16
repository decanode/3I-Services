import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Clock, Mail, Check, X, Trash2, IdCard, Shield, User as UserIcon, Bell, MapPin, BookMarked, IndianRupee, Database, FileCheck, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import Alert from '../components/Alert';
import PageLoader from '../components/loading';
import { RemainderCard } from './Remainder';
import { cityOptions, COUNTRY_OPTIONS } from '../components/Button';
import '../styles/pagestyles/home.css';

function formatStatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}, ${time}`;
}

function formatRequestDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function initials(first, last) {
  const a = (first || '').trim().charAt(0);
  const b = (last || '').trim().charAt(0);
  return (a + b).toUpperCase() || '?';
}

function AdminDashboard({ isEmployeeCardExpanded, setIsEmployeeCardExpanded, adminData, setAdminData, activeAdminList, setActiveAdminList }) {
  const [data, setData] = useState(adminData);
  const [loading, setLoading] = useState(!adminData);
  const [error, setError] = useState(null);
  const [alertState, setAlertState] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({ city: '', phone: '', countryCode: '+91' });
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (activeAdminList === 'requests') {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const container = document.querySelector('.hp');
        if (container) container.scrollTop = 0;
      }, 100);
    }
  }, [activeAdminList]);

  const promptDeleteUser = (userId, userName) => {
    setAlertState({
      type: 'warning',
      title: 'Delete User?',
      message: `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      onConfirm: async () => {
        setAlertState({ type: 'loading', title: 'Deleting User...' });
        await handleDeleteUser(userId);
      },
      onCancel: () => setAlertState(null),
    });
  };

  const promptRejectRequest = (requestId, userName) => {
    setAlertState({
      type: 'warning',
      title: 'Reject Request?',
      message: `Are you sure you want to reject the registration for ${userName}?`,
      onConfirm: () => handleRequestAction(requestId, 'reject'),
      onCancel: () => setAlertState(null),
    });
  };

  const handleDeleteUser = async (userId) => {
    const startTime = Date.now();
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || `Server error (${res.status})`);
      }
      const remaining = 2000 - (Date.now() - startTime);
      setTimeout(() => {
        setAlertState({ type: 'success', title: 'User Deleted', message: 'The user has been successfully removed.' });
        load();
      }, Math.max(0, remaining));
    } catch (e) {
      const remaining = 2000 - (Date.now() - startTime);
      setTimeout(() => {
        setAlertState({ type: 'error', title: 'Deletion Failed', message: e.message });
      }, Math.max(0, remaining));
    }
  };

  const handleRequestAction = async (id, action) => {
    const isApprove = action === 'approve';
    setAlertState({ type: 'loading', title: isApprove ? 'Approving...' : 'Rejecting...' });
    const startTime = Date.now();
    try {
      const res = await apiFetch(`/api/signup/${action}/${id}`, { method: 'PUT' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Action failed');
      }
      const remaining = 2000 - (Date.now() - startTime);
      setTimeout(() => {
        setAlertState({
          type: isApprove ? 'success' : 'warning',
          title: isApprove ? 'User Approved' : 'User Rejected',
          message: isApprove ? 'The user has been successfully approved and notified.' : 'The user registration has been rejected.',
        });
        load();
      }, Math.max(0, remaining));
    } catch (e) {
      const remaining = 2000 - (Date.now() - startTime);
      setTimeout(() => {
        setAlertState({ type: 'error', title: 'Action Failed', message: e.message });
      }, Math.max(0, remaining));
    }
  };

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/dashboard');
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError('You do not have admin access.');
        setData(null);
        setAdminData(null);
        return;
      }
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to load');
      setData(json);
      setAdminData(json);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
      setData(null);
      setAdminData(null);
    } finally {
      setLoading(false);
    }
  }, [setAdminData]);

  // HomePage is the sole owner of the fetch lifecycle.
  // AdminDashboard renders from the prop; load() is only used for post-mutation refresh.
  useEffect(() => {
    if (adminData) {
      setData(adminData);
      setLoading(false);
    }
  }, [adminData]);

  const validatePhone = (phone) => {
    if (phone === '') return '';
    if (!/^\d+$/.test(phone)) return 'Only digits are allowed.';
    if (phone.length < 7) return 'Phone must be at least 7 digits.';
    if (phone.length > 10) return 'Phone must be at most 10 digits.';
    return '';
  };

  const startEdit = (row) => {
    setEditingRow(row.empId);
    setEditValues({ city: row.city || '', phone: row.phone || '', countryCode: row.countryCode || '+91' });
    setPhoneError('');
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setEditValues({ city: '', phone: '', countryCode: '+91' });
    setPhoneError('');
  };

  const handleUpdateUser = async (empId) => {
    const err = validatePhone(editValues.phone);
    if (err) { setPhoneError(err); return; }
    setAlertState({ type: 'loading', title: 'Saving changes…' });
    const startTime = Date.now();
    try {
      const res = await apiFetch(`/api/admin/users/${empId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Update failed');
      }
      const remaining = 1500 - (Date.now() - startTime);
      setTimeout(() => {
        setAlertState({ type: 'success', title: 'Saved', message: 'Employee details updated.' });
        setData((prev) => ({
          ...prev,
          employees: prev.employees.map((e) =>
            e.empId === empId ? { ...e, ...editValues } : e
          ),
        }));
        cancelEdit();
        setTimeout(() => setAlertState(null), 1800);
      }, Math.max(0, remaining));
    } catch (e) {
      const remaining = 1500 - (Date.now() - startTime);
      setTimeout(() => {
        setAlertState({ type: 'error', title: 'Update Failed', message: e.message });
      }, Math.max(0, remaining));
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setAlertState({ type: 'success', title: 'Copied!', message: `${label} copied to clipboard` });
      setTimeout(() => setAlertState(null), 2000);
    }).catch(() => {
      setAlertState({ type: 'error', title: 'Copy Failed', message: 'Failed to copy to clipboard' });
    });
  };

  return (
    <div className="ad">
      {alertState && (
        <Alert
          type={alertState.type}
          title={alertState.title}
          message={alertState.message}
          onConfirm={alertState.onConfirm || (() => setAlertState(null))}
          onCancel={alertState.onCancel || (() => setAlertState(null))}
        />
      )}
      {error && <div className="ad__alert" role="alert">{error}</div>}

      {loading && !data && !error && (
        <div className="ad__loading">Loading dashboard…</div>
      )}

      {data && (
        <>
          {/* Employee Management Panel */}
          <section className={`ad__panel ${isEmployeeCardExpanded ? 'ad__panel--open' : 'ad__panel--closed'}`}>
            <div className="ad__panel-head">
              <div className="ad__toggle">
                <button
                  type="button"
                  className={`ad__toggle-btn ${activeAdminList === 'employees' ? 'ad__toggle-btn--on' : ''}`}
                  onClick={() => setActiveAdminList('employees')}
                >
                  <Users size={16} />
                  Employees
                </button>
                <button
                  type="button"
                  className={`ad__toggle-btn ${activeAdminList === 'requests' ? 'ad__toggle-btn--on' : ''}`}
                  onClick={() => setActiveAdminList('requests')}
                >
                  <UserPlus size={16} />
                  Requests
                  {data.pendingRequests?.length > 0 && (
                    <span className="ad__badge ad__badge--pending">{data.pendingRequests.length}</span>
                  )}
                </button>
              </div>
            </div>

            {activeAdminList === 'employees' && (
              <div className="ad__table-wrap">
                <table className="ad__table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Emp ID</th>
                      <th>City</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Last login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.employees || []).length === 0 ? (
                      <tr><td colSpan={7} className="ad__table-empty">No employees yet.</td></tr>
                    ) : (
                      (data.employees || []).map((row) => {
                        const isEditing = editingRow === row.empId;
                        return (
                          <tr key={row.empId}>
                            <td>
                              <div className="ad__person">
                                <span className="ad__person-name">
                                  {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                                </span>
                              </div>
                            </td>
                            <td><code className="ad__code">{row.empId || '—'}</code></td>
                            <td>
                              {isEditing ? (
                                <select
                                  className="ad__inline-select"
                                  value={editValues.city}
                                  onChange={(e) => setEditValues((v) => ({ ...v, city: e.target.value }))}
                                >
                                  <option value="">— Select City —</option>
                                  {cityOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              ) : (
                                row.city || '—'
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <>
                                  <div className="ad__inline-phone">
                                    <select
                                      className="ad__inline-select ad__inline-select--cc"
                                      value={editValues.countryCode}
                                      onChange={(e) => setEditValues((v) => ({ ...v, countryCode: e.target.value }))}
                                    >
                                      {COUNTRY_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.shortLabel}</option>
                                      ))}
                                    </select>
                                    <input
                                      className={`ad__inline-input${phoneError ? ' ad__inline-input--error' : ''}`}
                                      type="tel"
                                      value={editValues.phone}
                                      onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setEditValues((v) => ({ ...v, phone: digits }));
                                        setPhoneError(validatePhone(digits));
                                      }}
                                      placeholder="Phone number"
                                      maxLength={10}
                                    />
                                  </div>
                                  {phoneError && (
                                    <span className="ad__inline-error">{phoneError}</span>
                                  )}
                                </>
                              ) : (
                                row.phone ? (
                                  <code
                                    className="ad__code ad__code--click"
                                    onClick={() => copyToClipboard(`${row.countryCode}${row.phone}`, 'Phone Number')}
                                    title="Click to copy"
                                  >
                                    {row.countryCode}{row.phone}
                                  </code>
                                ) : '—'
                              )}
                            </td>
                            <td>
                              <span className={row.role === 'admin' ? 'ad__badge ad__badge--admin' : 'ad__badge ad__badge--emp'}>
                                {row.role || 'employee'}
                              </span>
                            </td>
                            <td>
                              <span className="ad__login">
                                <Clock size={14} />
                                {row.lastLogin || 'Never'}
                              </span>
                            </td>
                            <td>
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="ad__act-btn ad__act-btn--approve"
                                    onClick={() => handleUpdateUser(row.empId)}
                                    disabled={!!alertState}
                                    title="Save changes"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="ad__act-btn ad__act-btn--decline"
                                    onClick={cancelEdit}
                                    disabled={!!alertState}
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="ad__act-btn ad__act-btn--edit"
                                    onClick={() => startEdit(row)}
                                    disabled={!!alertState || !!editingRow}
                                    title="Edit city & phone"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="ad__act-btn ad__act-btn--delete"
                                    onClick={() => promptDeleteUser(row.empId, [row.firstName, row.lastName].filter(Boolean).join(' '))}
                                    disabled={!!alertState || !!editingRow || row.role === 'admin'}
                                    title={row.role === 'admin' ? 'Admin users cannot be deleted' : undefined}
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeAdminList === 'requests' && (
              <div className="ad__requests">
                {(data.pendingRequests || []).length === 0 ? (
                  <div className="ad__requests-empty">
                    <UserPlus size={40} strokeWidth={1.25} />
                    <p>No pending signup requests.</p>
                    <span>New registrations will appear here.</span>
                  </div>
                ) : (
                  <ul className="ad__req-list">
                    {(data.pendingRequests || []).map((req) => (
                      <li key={req.id} className="ad__req-card">
                        <div className="ad__req-top">
                          <div className="ad__req-who">
                            <strong>{[req.firstName, req.lastName].filter(Boolean).join(' ') || '—'}</strong>
                          </div>
                          <div className="ad__req-actions">
                            <button type="button" className="ad__act-btn ad__act-btn--approve" onClick={() => handleRequestAction(req.id, 'approve')} disabled={!!alertState}>
                              <Check size={16} />
                            </button>
                            <button type="button" className="ad__act-btn ad__act-btn--decline" onClick={() => promptRejectRequest(req.id, [req.firstName, req.lastName].filter(Boolean).join(' '))} disabled={!!alertState}>
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="ad__req-meta">
                          <span><Mail size={14} />{req.email}</span>
                          <span>{req.city || '—'}</span>
                          {req.phone && <span>{req.countryCode}{req.phone}</span>}
                          <span className="ad__req-time"><Clock size={14} />{formatRequestDate(req.createdAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Upcoming Calls Card */}
          <div className="ad__upcoming">
            <RemainderCard />
          </div>
        </>
      )}
    </div>
  );
}

function EmployeeHome() {
  return (
    <div className="eh">
      <div className="eh__upcoming">
        <RemainderCard />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [isEmployeeCardExpanded, setIsEmployeeCardExpanded] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [counterStats, setCounterStats] = useState(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [activeAdminList, setActiveAdminList] = useState('employees');
  const [initialLoading, setInitialLoading] = useState(isAdmin);
  const [showLoader, setShowLoader] = useState(true);

  const handleBellClick = useCallback(() => {
    if (isEmployeeCardExpanded && activeAdminList === 'requests') {
      setActiveAdminList('employees');
      setIsEmployeeCardExpanded(false);
    } else {
      setIsEmployeeCardExpanded(true);
      setTimeout(() => setActiveAdminList('requests'), 50);
    }
  }, [isEmployeeCardExpanded, activeAdminList]);

  useEffect(() => {
    const loadCounterStats = async () => {
      try {
        const res = await apiFetch('/api/counter');
        const json = await res.json().catch(() => ({}));
        if (res.ok) setCounterStats(json.stats);
      } catch (e) {
        console.error('Failed to load counter stats:', e);
      }
    };
    loadCounterStats();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const loadAdminData = async () => {
        try {
          const res = await apiFetch('/api/admin/dashboard');
          const json = await res.json().catch(() => ({}));
          if (res.ok) {
            setAdminData(json);
            setPendingRequestCount(json.pendingRequests?.length || 0);
          }
        } catch (e) {
          console.error('Failed to load admin data:', e);
        } finally {
          setInitialLoading(false);
        }
      };
      loadAdminData();
    } else {
      setInitialLoading(false);
    }
  }, [isAdmin]);

  return (
    <div className="hp">
      {showLoader && (
        <PageLoader
          pageName="Dashboard"
          isDataLoading={initialLoading}
          duration={2000}
          onComplete={() => setShowLoader(false)}
        />
      )}

      <UserGreetingBanner
        user={user}
        stats={counterStats}
        onEmployeeCardClick={() => setIsEmployeeCardExpanded(!isEmployeeCardExpanded)}
        isEmployeeCardExpanded={isEmployeeCardExpanded}
        activeAdminList={activeAdminList}
        pendingRequestCount={pendingRequestCount}
        onBellClick={handleBellClick}
      />
      {isAdmin ? (
        <AdminDashboard
          isEmployeeCardExpanded={isEmployeeCardExpanded}
          setIsEmployeeCardExpanded={setIsEmployeeCardExpanded}
          adminData={adminData}
          setAdminData={setAdminData}
          activeAdminList={activeAdminList}
          setActiveAdminList={setActiveAdminList}
        />
      ) : (
        <EmployeeHome />
      )}
    </div>
  );
}

function UserGreetingBanner({ user, stats, onEmployeeCardClick, isEmployeeCardExpanded, activeAdminList, pendingRequestCount = 0, onBellClick }) {
  const navigate = useNavigate();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const role = user?.role || 'Employee';
  const idValue = user?.empId || user?.userId || 'N/A';
  const city = user?.city || 'Not Set';
  const isAdmin = user?.role === 'admin';

  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  return (
    <div className="ub">
      {/* Greeting card with integrated info */}
      <div className="ub__greeting">
        <div className="ub__greeting-header">
          <div className="ub__greeting-icon"><UserIcon size={32} /></div>
          <div className="ub__greeting-text">
            <h1 className="ub__greeting-title">{greeting}, <span className="ub__greeting-name">{name}</span>!</h1>
            <p className="ub__greeting-role">You are logged in as <span>{role}</span></p>
          </div>
          {isAdmin && pendingRequestCount > 0 && (
            <div
              className="ub__bell"
              title={isEmployeeCardExpanded && activeAdminList === 'requests' ? 'Click to close requests' : `${pendingRequestCount} pending request(s) - Click to view`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBellClick?.(); }}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBellClick?.(); } }}
            >
              <Bell size={24} className="ub__bell-icon" />
              <span className="ub__bell-badge">{pendingRequestCount}</span>
            </div>
          )}
        </div>

        {/* Integrated info cards grid */}
        <div className="ub__cards-integrated">
          {/* Row 1: Location, Employee ID, Role, Manage Employees */}
          <div className="ub__card ub__card--location">
            <div className="ub__card-icon"><MapPin size={28} /></div>
            <div className="ub__card-body">
              <div className="ub__card-label">Location</div>
              <div className="ub__card-value">{isAdmin ? 'All' : city}</div>
            </div>
          </div>

          <div className="ub__card ub__card--emp-id">
            <div className="ub__card-icon"><IdCard size={28} /></div>
            <div className="ub__card-body">
              <div className="ub__card-label">Employee ID</div>
              <div className="ub__card-value">{idValue}</div>
            </div>
          </div>

          <div className="ub__card ub__card--role">
            <div className="ub__card-icon"><Shield size={28} /></div>
            <div className="ub__card-body">
              <div className="ub__card-label">Role</div>
              <div className="ub__card-value" style={{ textTransform: 'capitalize' }}>{role}</div>
            </div>
          </div>

          {isAdmin ? (
            <div
              className={`ub__card ub__card--manage ${isEmployeeCardExpanded ? 'ub__card--manage-active' : ''}`}
              onClick={onEmployeeCardClick}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && onEmployeeCardClick()}
            >
              <div className="ub__card-icon"><Users size={28} /></div>
              <div className="ub__card-body">
                <div className="ub__card-label">Manage</div>
                <div className="ub__card-value">Employees</div>
              </div>
            </div>
          ) : (
            <div
              className="ub__card ub__card--profile"
              onClick={() => navigate('/profile')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && navigate('/profile')}
            >
              <div className="ub__card-icon"><UserIcon size={28} /></div>
              <div className="ub__card-body">
                <div className="ub__card-label">My</div>
                <div className="ub__card-value">Profile</div>
              </div>
            </div>
          )}

          {/* Row 2: Analytics cards with mock data */}
          <div className="ub__card ub__card--ledgers">
            <div className="ub__card-icon"><Database size={28} /></div>
            <div className="ub__card-body">
              <div className="ub__card-label">No of Ledgers</div>
              <div className="ub__card-value">{stats?.totalLedgers ?? '—'}</div>
            </div>
          </div>

          <div className="ub__card ub__card--outstandings">
            <div className="ub__card-icon"><IndianRupee size={28} /></div>
            <div className="ub__card-body">
              <div className="ub__card-label">Total Outstandings</div>
              <div className="ub__card-value">
                {stats?.totaldebit != null
                  ? `₹ ${Number(stats.totaldebit).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                  : '—'}
              </div>
            </div>
          </div>

          <div className="ub__card ub__card--master-upload">
            <div className="ub__card-icon"><FileCheck size={28} /></div>
            <div className="ub__card-body">
              <div className="ub__card-label">Last Master Uploaded</div>
              <div className="ub__card-value">
                {stats?.src_master_date ? formatStatDate(stats.src_master_date) : 'Not uploaded'}
              </div>
            </div>
          </div>

          <div className="ub__card ub__card--outstanding-upload">
            <div className="ub__card-icon"><BookMarked size={28} /></div>
            <div className="ub__card-body">
              <div className="ub__card-label">Last Outstanding Uploaded</div>
              <div className="ub__card-value">
                {stats?.src_outstanding_date ? formatStatDate(stats.src_outstanding_date) : 'Not uploaded'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
