const userService = require('../services/user');
const activityService = require('../services/activity');
const registrationService = require('../services/registration');

function formatLastLogin(last) {
  if (!last) return null;
  const ts = last.timestamp;
  if (ts) {
    try {
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      }
    } catch {
      /* fall through */
    }
  }
  const parts = [last.date, last.time].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

exports.getDashboard = async (req, res) => {
  try {
    const [users, lastLoginMap] = await Promise.all([
      userService.getAllUsers(),
      activityService.getAllLastLogins(),
    ]);

    const employees = users.map((u) => ({
      empId: u.userId || '',
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      phone: u.phone || '',
      countryCode: u.countryCode || '+91',
      city: u.city || '',
      role: u.role || 'employee',
      lastLogin: formatLastLogin(lastLoginMap[u.userId] || null),
    }));

    employees.sort((a, b) => {
      const na = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
      const nb = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
      return na.localeCompare(nb);
    });

    const pendingRaw = await registrationService.getPendingRequests();
    const pendingRequests = pendingRaw
      .map((r) => ({
        id: r.id,
        firstName: r.firstName || '',
        lastName: r.lastName || '',
        email: r.email || '',
        phone: r.phone || '',
        countryCode: r.countryCode || '+91',
        city: r.city || '',
        createdAt: r.createdAt || '',
      }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    res.status(200).json({
      stats: {
        employees: employees.length,
        pendingRequests: pendingRequests.length,
      },
      employees,
      pendingRequests,
    });
  } catch (e) {
    console.error('admin dashboard:', e);
    res.status(500).json({ message: 'Failed to load dashboard', error: e.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const result = await userService.deleteUser(userId);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete user', error: e.message });
  }
};
