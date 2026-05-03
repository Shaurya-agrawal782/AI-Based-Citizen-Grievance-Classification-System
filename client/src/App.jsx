import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AIAssistant from './components/AIAssistant';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import CitizenDashboard from './pages/CitizenDashboard';
import NewGrievance from './pages/NewGrievance';
import TrackComplaint from './pages/TrackComplaint';
import AdminDashboard from './pages/AdminDashboard';
import AdminMap from './pages/AdminMap';
import GrievanceDetail from './pages/GrievanceDetail';
import Analytics from './pages/Analytics';
import TaxonomyStudio from './pages/TaxonomyStudio';
import DemoMode from './pages/DemoMode';
import QRZoneReport from './pages/QRZoneReport';
import QRZones from './pages/QRZones';
import Copilot from './pages/Copilot';
import TrackTicket from './pages/TrackTicket';
import './index.css';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace /> : <Auth />} />
      <Route path="/demo-mode" element={<><Navbar /><DemoMode /></>} />
      <Route path="/qr-zones" element={<QRZones />} />
      <Route path="/qr-report/:zoneId" element={<QRZoneReport />} />
      <Route path="/copilot" element={<Copilot />} />
      <Route path="/track-ticket" element={<TrackTicket />} />

      {/* Citizen Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute roles={['citizen']}><Navbar /><CitizenDashboard /></ProtectedRoute>
      } />
      <Route path="/grievance/new" element={
        <ProtectedRoute roles={['citizen']}><Navbar /><NewGrievance /></ProtectedRoute>
      } />
      <Route path="/new-grievance" element={
        <ProtectedRoute roles={['citizen']}><Navbar /><NewGrievance /></ProtectedRoute>
      } />
      <Route path="/track" element={
        <ProtectedRoute roles={['citizen']}><Navbar /><TrackComplaint /></ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin', 'department']}><Navbar /><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/grievance/:id" element={
        <ProtectedRoute roles={['admin', 'department']}><Navbar /><GrievanceDetail /></ProtectedRoute>
      } />
      <Route path="/admin/analytics" element={
        <ProtectedRoute roles={['admin', 'department']}><Navbar /><Analytics /></ProtectedRoute>
      } />
      <Route path="/admin/map" element={
        <ProtectedRoute roles={['admin', 'department']}><Navbar /><AdminMap /></ProtectedRoute>
      } />
      <Route path="/admin/taxonomy" element={
        <ProtectedRoute roles={['admin']}><Navbar /><TaxonomyStudio /></ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <AIAssistant />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
