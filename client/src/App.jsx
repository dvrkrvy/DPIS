import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import { useAuth } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import SignInPage from './pages/SignInPage';
import UserDashboard from './pages/UserDashboard';

function RoleDashboard() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'DOCTOR') return <DoctorDashboard />;
  return <UserDashboard />;
}

export default function App() {
  const location = useLocation();
  const isBlankShell = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen flex flex-col bg-surface dark:bg-on-primary-fixed text-on-surface dark:text-inverse-on-surface transition-colors">
      {!isBlankShell && <Navbar />}
      <main
        className={`w-full flex-1 bg-surface dark:bg-on-primary-fixed ${
          isBlankShell ? 'min-h-screen flex items-center justify-center px-margin' : 'pt-20'
        }`}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<SignInPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<RoleDashboard />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main>
      {!isBlankShell && <Footer />}
    </div>
  );
}
