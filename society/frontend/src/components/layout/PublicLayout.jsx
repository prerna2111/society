import { Container } from 'react-bootstrap';
import { Outlet } from 'react-router-dom';
import { NotificationCenter } from './NotificationCenter';

export function PublicLayout() {
  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <Container>
        <Outlet />
      </Container>
      <NotificationCenter />
    </div>
  );
}

