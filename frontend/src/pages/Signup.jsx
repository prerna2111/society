import { useState } from 'react';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { globalEventBus } from '../utils/EventBus';
import apiClient from '../services/ApiClient';

export default function Signup() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    flatNumber: '',
    gateNumber: '',
    role: 'owner',
  });
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (form.password !== form.confirmPassword) {
      globalEventBus.emit('notify', { type: 'danger', message: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      await apiClient.request('/auth/register', {
        method: 'POST',
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          phone: form.phone,
          flatNumber: form.role === 'security' ? form.gateNumber : form.flatNumber,
          gateNumber: form.role === 'security' ? form.gateNumber : undefined,
          role: form.role,
        },
      });
      globalEventBus.emit('notify', { 
        type: 'success', 
        message: 'Registration successful! Please wait for admin approval before logging in.' 
      });
      navigate('/login');
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message || 'Unable to register' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="justify-content-center">
      <Col md={8} lg={6}>
        <Card className="shadow-sm">
          <Card.Body className="p-4">
            <div className="mb-4 text-center">
              <h2 className="fw-bold">Society Connect</h2>
              <p className="text-muted mb-0">Create your account</p>
            </div>
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="firstName">
                    <Form.Label>First Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="firstName"
                      placeholder="John"
                      value={form.firstName}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="lastName">
                    <Form.Label>Last Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="lastName"
                      placeholder="Doe"
                      value={form.lastName}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3" controlId="email">
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="password">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      placeholder="Enter password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="confirmPassword">
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3" controlId="phone">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  type="tel"
                  name="phone"
                  placeholder="+1234567890"
                  value={form.phone}
                  onChange={handleChange}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="role">
                <Form.Label>Role</Form.Label>
                <Form.Select name="role" value={form.role} onChange={handleChange} required>
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant</option>
                  <option value="security">Security</option>
                </Form.Select>
              </Form.Group>
              {form.role === 'security' ? (
                <Form.Group className="mb-3" controlId="gateNumber">
                  <Form.Label>Gate Number</Form.Label>
                  <Form.Select name="gateNumber" value={form.gateNumber || ''} onChange={handleChange} required>
                    <option value="">Select Gate</option>
                    <option value="Gate 1">Gate 1</option>
                    <option value="Gate 2">Gate 2</option>
                    <option value="Gate 3">Gate 3</option>
                  </Form.Select>
                </Form.Group>
              ) : (
                <Form.Group className="mb-3" controlId="flatNumber">
                  <Form.Label>Flat Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="flatNumber"
                    placeholder="A-101"
                    value={form.flatNumber}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              )}
              <div className="d-grid">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Signing up...' : 'Sign Up'}
                </Button>
              </div>
              <div className="text-center mt-3">
                <small className="text-muted">
                  Already have an account? <Link to="/login">Sign in</Link>
                </small>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

