import { useEffect, useState } from 'react';
import { Button, Card, Form, Alert } from 'react-bootstrap';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    flatNumber: '',
    gateNumber: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        flatNumber: user.flatNumber || '',
        gateNumber: user.gateNumber || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      // Check if password is being changed
      if (form.newPassword) {
        if (form.newPassword !== form.confirmPassword) {
          globalEventBus.emit('notify', { type: 'danger', message: 'New passwords do not match' });
          setLoading(false);
          return;
        }
        if (!form.currentPassword) {
          globalEventBus.emit('notify', { type: 'danger', message: 'Please enter current password' });
          setLoading(false);
          return;
        }
      }

      const updateData = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      };

      if (form.newPassword) {
        updateData.currentPassword = form.currentPassword;
        updateData.newPassword = form.newPassword;
      }

      const { data } = await apiClient.request('/users/profile', {
        method: 'PUT',
        body: updateData,
      });

      globalEventBus.emit('notify', { type: 'success', message: 'Profile updated successfully' });

      // Update user context
      if (data.user) {
        setUser(data.user);
      }

      // Reset password fields
      setForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h3 className="mb-0">Edit Profile</h3>
        <p className="text-muted mb-0">Update your profile information</p>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <div className="row mb-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Last Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={form.email}
                disabled
              />
              <Form.Text className="text-muted">Email cannot be changed</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </Form.Group>

            {user?.role === 'security' ? (
              <Form.Group className="mb-3">
                <Form.Label>Gate Number</Form.Label>
                <Form.Control
                  type="text"
                  name="gateNumber"
                  value={form.gateNumber}
                  disabled
                />
                <Form.Text className="text-muted">Gate number cannot be changed</Form.Text>
              </Form.Group>
            ) : (
              <Form.Group className="mb-3">
                <Form.Label>Flat Number</Form.Label>
                <Form.Control
                  type="text"
                  name="flatNumber"
                  value={form.flatNumber}
                  disabled
                />
                <Form.Text className="text-muted">Flat number cannot be changed</Form.Text>
              </Form.Group>
            )}

            <hr />

            <h5 className="mb-3">Change Password</h5>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                placeholder="Leave blank if not changing password"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="Leave blank if not changing password"
                minLength={6}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Leave blank if not changing password"
              />
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

