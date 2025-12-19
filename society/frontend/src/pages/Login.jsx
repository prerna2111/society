import { useState } from 'react';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { globalEventBus } from '../utils/EventBus';

export default function Login() {
  const { login, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    // Redirect security users to visitors page
    if (hasRole('security')) {
      return <Navigate to="/visitors" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      // Redirect based on role
      if (user?.role === 'security') {
        navigate('/visitors');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message || 'Unable to login' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="justify-content-center">
      <Col md={6} lg={5}>
        <Card className="shadow-sm">
          <Card.Body className="p-4">
            <div className="mb-4 text-center">
              <h2 className="fw-bold">Society Connect</h2>
              <p className="text-muted mb-0">Sign in to manage your society dashboard</p>
            </div>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="email">
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </Form.Group>
              <div className="d-grid">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
              <div className="text-center mt-3">
                <small className="text-muted">
                  Don't have an account? <Link to="/signup">Sign up</Link>
                </small>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

