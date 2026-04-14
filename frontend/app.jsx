import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import Dashboard from './src/components/Dashboard';

const LoginPage = lazy(() => import('./src/pages/login'));
const HomePage = lazy(() => import('./src/pages/home'));
const ExcelPage = lazy(() => import('./src/pages/excel'));
const ExcelMasterPage = lazy(() => import('./src/pages/excel-master'));
const ViewPage = lazy(() => import('./src/pages/view'));
const ViewDataPage = lazy(() => import('./src/pages/view-master'));
const NotifyPage = lazy(() => import('./src/pages/view-notify'));
const NotifyDetailPage = lazy(() => import('./src/pages/view-notify-detail'));
const ViewLogPage = lazy(() => import('./src/pages/view-log'));
const ViewOutstandingsPage = lazy(() => import('./src/pages/view-outstandings'));
const UserProfilePage = lazy(() => import('./src/components/userprofile'));

// Dev-only Firebase monitor — file is gitignored, silently absent on production clones
let DevMonitor = null;
if (import.meta.env.DEV) {
  DevMonitor = lazy(() =>
    import('./src/dev/FirebaseMonitor.jsx').catch(() => ({ default: () => null }))
  );
}

function ProtectedRoute({ children, activeTab }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;

  return (
    <Dashboard activeTab={activeTab}>
      {children}
    </Dashboard>
  );
}

function AdminRoute({ children, activeTab }) {
  const { isLoggedIn, user } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/home" replace />;

  return (
    <Dashboard activeTab={activeTab}>
      {children}
    </Dashboard>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>}>
        {DevMonitor && <DevMonitor />}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/home"
            element={
              <ProtectedRoute activeTab="home">
                <HomePage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/excel"
            element={
              <AdminRoute activeTab="excel">
                <ExcelPage />
              </AdminRoute>
            }
          />

          <Route
            path="/excel-master"
            element={
              <AdminRoute activeTab="excel">
                <ExcelMasterPage />
              </AdminRoute>
            }
          />

          <Route
            path="/view"
            element={
              <ProtectedRoute activeTab="view">
                <ViewPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/view-master"
            element={
              <ProtectedRoute activeTab="view">
                <ViewDataPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notify"
            element={
              <ProtectedRoute activeTab="notify">
                <NotifyPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/view-notify-detail"
            element={
              <ProtectedRoute activeTab="notify">
                <NotifyDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/view-log"
            element={
              <ProtectedRoute activeTab="view">
                <ViewLogPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/view-outstandings"
            element={
              <ProtectedRoute activeTab="view">
                <ViewOutstandingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute activeTab="profile">
                <UserProfilePage />
              </ProtectedRoute>
            }
          />

          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
