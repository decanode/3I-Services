import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './src/context/AuthContext';
import LoginPage from './src/pages/login';
import HomePage from './src/pages/home';
import ExcelPage from './src/pages/excel';
import ExcelMasterPage from './src/pages/excel-master';
import ViewPage from './src/pages/view';
import ViewDataPage from './src/pages/view-master';
import NotifyPage from './src/pages/view-notify';
import NotifyDetailPage from './src/pages/view-notify-detail';
import ViewLogPage from './src/pages/view-log';
import Dashboard from './src/components/Dashboard';

function ProtectedRoute({ children, activeTab }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  
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
              <ProtectedRoute activeTab="excel">
                <ExcelPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/excel-master"
            element={
              <ProtectedRoute activeTab="excel">
                <ExcelMasterPage />
              </ProtectedRoute>
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
            path="/viewdata"
            element={
              <ProtectedRoute activeTab="viewdata">
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
            path="/notify-detail"
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

          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
