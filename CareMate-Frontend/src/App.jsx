import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider, usePageTranslation } from './context/I18nContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import FindDoctor from './pages/FindDoctor';
import Appointments from './pages/Appointments';
import Chat from './pages/Chat';
import Reports from './pages/Reports';
import Facilities from './pages/Facilities';
import Schedule from './pages/Schedule';
import MyDocuments from './pages/MyDocuments';
import MyPrescriptions from './pages/MyPrescriptions';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function ProtectedPage({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Translation hook wrapper - activates full-page translation when language changes
function TranslationActivator() {
  usePageTranslation();
  return null;
}

function AppRoutes() {
  return (
    <>
      {/* Hidden Google Translate element */}
      <div id="google-translate-element" style={{ display: 'none' }} />
      <TranslationActivator />
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Admin only */}
        <Route path="/admin" element={<ProtectedPage allowedRoles={['admin']}><AdminDashboard /></ProtectedPage>} />

        {/* Shared */}
        <Route path="/dashboard"    element={<ProtectedPage><Dashboard /></ProtectedPage>} />
        <Route path="/profile"      element={<ProtectedPage><Profile /></ProtectedPage>} />
        <Route path="/appointments" element={<ProtectedPage><Appointments /></ProtectedPage>} />
        <Route path="/reports"      element={<ProtectedPage><Reports /></ProtectedPage>} />

        {/* Patient only */}
        <Route path="/find-doctor"       element={<ProtectedPage allowedRoles={['patient']}><FindDoctor /></ProtectedPage>} />
        <Route path="/chat"              element={<ProtectedPage allowedRoles={['patient']}><Chat /></ProtectedPage>} />
        <Route path="/my-documents"      element={<ProtectedPage allowedRoles={['patient']}><MyDocuments /></ProtectedPage>} />
        <Route path="/my-prescriptions"  element={<ProtectedPage allowedRoles={['patient']}><MyPrescriptions /></ProtectedPage>} />

        {/* Doctor only */}
        <Route path="/facilities" element={<ProtectedPage allowedRoles={['doctor']}><Facilities /></ProtectedPage>} />
        <Route path="/schedule"   element={<ProtectedPage allowedRoles={['doctor']}><Schedule /></ProtectedPage>} />

        {/* Default */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <I18nProvider>
          <AppRoutes />
        </I18nProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
