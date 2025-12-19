import { Container } from 'react-bootstrap';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { NotificationCenter } from './NotificationCenter';
import { useEffect } from 'react';

export function AppLayout() {
  const { isAuthenticated, user, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && hasRole('security') && window.location.pathname === '/dashboard') {
      navigate('/visitors', { replace: true });
    }
  }, [isAuthenticated, hasRole, navigate]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1 sc-content">
        <Topbar />
        <Container fluid className="py-4">
          <Outlet />
        </Container>
      </div>
      <NotificationCenter />
    </div>
  );
}

