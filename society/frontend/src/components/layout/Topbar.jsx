import { Button, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '?';

  return (
    <header className="sc-topbar d-flex align-items-center justify-content-between px-4 bg-white">
      <div>
        <h5 className="mb-0 fw-semibold text-secondary">Welcome back, {user?.firstName}!</h5>
        <small className="text-muted text-capitalize">{user?.role}</small>
      </div>
      <div className="d-flex align-items-center gap-3">
        <Dropdown align="end">
          <Dropdown.Toggle variant="light" className="d-flex align-items-center gap-2">
            <span className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
              {initials}
            </span>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Header>
              {user?.firstName} {user?.lastName}
              <div className="small text-muted text-lowercase">{user?.email}</div>
            </Dropdown.Header>
            <Dropdown.Divider />
            <Dropdown.Item onClick={logout}>Logout</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  );
}

