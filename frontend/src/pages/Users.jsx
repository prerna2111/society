import { useEffect, useState } from 'react';
import { Badge, Button, Card, Form, Table } from 'react-bootstrap';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';
import { useAuth } from '../context/AuthContext';

const roleLabels = {
  admin: 'Administrator',
  committee: 'Committee',
  owner: 'Owner',
  tenant: 'Tenant',
  security: 'Security',
};

export default function Users() {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [deactivatedUsers, setDeactivatedUsers] = useState([]);

  const canManage = hasRole(['admin', 'committee']);
  const isResident = hasRole(['owner', 'tenant']);

  const fetchUsers = async () => {
    try {
      if (canManage) {
        const [approvedResponse, pendingResponse, deactivatedResponse] = await Promise.all([
          apiClient.request('/users?isApproved=true&isActive=true'),
          apiClient.request('/users?isApproved=false'),
          apiClient.request('/users?isActive=false'),
        ]);
        // Filter out security users and only show active users
        const activeUsers = approvedResponse.data.users.filter(
          u => u.role !== 'security' && u.isActive === true
        );
        setUsers(activeUsers);
        setPendingUsers(pendingResponse.data.users);
        // Store deactivated users separately (only truly deactivated, not active ones)
        const deactivated = deactivatedResponse.data.users.filter(
          u => u.role !== 'security' && u.isActive === false
        );
        setDeactivatedUsers(deactivated);
      } else {
        const approvedResponse = await apiClient.request('/users?isApproved=true&isActive=true');
        setUsers(approvedResponse.data.users.filter(u => u.role !== 'security'));
      }
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  useEffect(() => {
    if (canManage || isResident) {
      fetchUsers();
    }
  }, [canManage, isResident]);

  const handleRoleChange = async (userId, role) => {
    try {
      await apiClient.request(`/users/${userId}`, { method: 'PUT', body: { role } });
      globalEventBus.emit('notify', { type: 'success', message: 'Role updated' });
      fetchUsers();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleDeactivate = async (userId, isActive) => {
    try {
      await apiClient.request(`/users/${userId}`, { method: 'PUT', body: { isActive } });
      globalEventBus.emit('notify', { type: 'info', message: `User ${isActive ? 'activated' : 'deactivated'}` });
      // Refresh both active and deactivated lists
      fetchUsers();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleApprove = async (userId) => {
    try {
      await apiClient.request(`/users/${userId}`, { method: 'PUT', body: { isApproved: true } });
      globalEventBus.emit('notify', { type: 'success', message: 'User approved successfully' });
      fetchUsers();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  if (!canManage && !isResident) {
    return <p className="text-muted">You do not have permission to view this page.</p>;
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h3 className="mb-0">{canManage ? 'Member Directory' : 'Society Members'}</h3>
        <p className="text-muted mb-0">
          {canManage ? 'Manage society members, their roles, and account status.' : 'View all society members.'}
        </p>
      </div>
      <Card className="shadow-sm">
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Flat</th>
                <th>Role</th>
                <th>Status</th>
                {canManage && <th className="text-end">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.flatNumber}</td>
                  <td>
                    <Badge bg="primary">{roleLabels[user.role] || user.role}</Badge>
                  </td>
                  <td>
                    <Badge bg={user.isActive ? 'success' : 'secondary'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  {canManage && (
                    <td className="text-end">
                      <div className="d-inline-flex gap-2">
                        <Form.Select
                          size="sm"
                          value={user.role}
                          onChange={(event) => handleRoleChange(user._id, event.target.value)}
                        >
                          {Object.keys(roleLabels).map((role) => (
                            <option value={role} key={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                        </Form.Select>
                        <Button
                          size="sm"
                          variant={user.isActive ? 'outline-danger' : 'outline-success'}
                          onClick={() => handleDeactivate(user._id, !user.isActive)}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
          {!users.length && <p className="text-muted text-center">No users found.</p>}
        </Card.Body>
      </Card>

      {pendingUsers.length > 0 && canManage && (
        <Card className="shadow-sm">
          <Card.Body>
            <h4 className="mb-3">Pending Approvals</h4>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Flat/Gate</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <tr key={user._id}>
                    <td>
                      {user.firstName} {user.lastName}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.flatNumber}</td>
                    <td>
                      <Badge bg="warning">{roleLabels[user.role] || user.role}</Badge>
                    </td>
                    <td>{user.phone || '-'}</td>
                    <td className="text-end">
                      <Button size="sm" variant="success" onClick={() => handleApprove(user._id)}>
                        Approve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {deactivatedUsers.length > 0 && canManage && (
        <Card className="shadow-sm">
          <Card.Body>
            <h4 className="mb-3">Deactivated Members</h4>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Flat</th>
                  <th>Role</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deactivatedUsers.map((user) => (
                  <tr key={user._id}>
                    <td>
                      {user.firstName} {user.lastName}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.flatNumber}</td>
                    <td>
                      <Badge bg="secondary">{roleLabels[user.role] || user.role}</Badge>
                    </td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-success" onClick={() => handleDeactivate(user._id, true)}>
                        Activate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

