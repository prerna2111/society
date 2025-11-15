import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Form, Modal, Table } from 'react-bootstrap';
import { format } from 'date-fns';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';
import { useAuth } from '../context/AuthContext';

const statusVariant = {
  scheduled: 'primary',
  checked_in: 'success',
  checked_out: 'secondary',
  cancelled: 'danger',
  pending_approval: 'warning',
  rejected: 'danger',
};

export default function Visitors() {
  const { hasRole, user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    visitorName: '',
    purpose: '',
    contactNumber: '',
    flatToVisit: '',
    expectedTime: '',
    needsApprovalFrom: '', // For security to select approver
  });
  const [flatResidents, setFlatResidents] = useState([]); // Store residents for selected flat

  const isAdmin = hasRole('admin');
  const isSecurity = hasRole('security');
  const isResident = hasRole(['owner', 'tenant']);
  const canCreate = useMemo(() => hasRole(['security', 'committee', 'admin', 'owner', 'tenant']), [hasRole]);
  
  // Auto-fill flat number for admin
  useEffect(() => {
    if (isAdmin && user?.flatNumber && showModal) {
      setForm(prev => ({ ...prev, flatToVisit: user.flatNumber }));
    }
  }, [isAdmin, user, showModal]);

  // Auto-fill flat number when modal opens for residents
  useEffect(() => {
    if (isResident && user?.flatNumber && showModal) {
      setForm(prev => ({ ...prev, flatToVisit: user.flatNumber }));
    }
  }, [isResident, user, showModal]);

  // Fetch residents for selected flat when security adds unscheduled visitor
  useEffect(() => {
    const fetchFlatResidents = async () => {
      if (isSecurity && form.flatToVisit && showModal) {
        try {
          const { data } = await apiClient.request(`/users`);
          const residents = data.users.filter(
            u => u.flatNumber === form.flatToVisit && 
            ['owner', 'tenant'].includes(u.role) && 
            u.isActive && 
            u.isApproved
          );
          setFlatResidents(residents);
          // Auto-select tenant if exists, otherwise owner
          if (residents.length > 0) {
            const tenant = residents.find(u => u.role === 'tenant');
            const owner = residents.find(u => u.role === 'owner');
            const defaultApprover = tenant ? tenant._id : (owner ? owner._id : '');
            setForm(prev => ({ ...prev, needsApprovalFrom: defaultApprover }));
          } else {
            setForm(prev => ({ ...prev, needsApprovalFrom: '' }));
          }
        } catch (error) {
          console.error('Error fetching flat residents:', error);
          setFlatResidents([]);
        }
      } else {
        setFlatResidents([]);
      }
    };
    fetchFlatResidents();
  }, [isSecurity, form.flatToVisit, showModal]);

  const fetchVisitors = async () => {
    try {
      const { data } = await apiClient.request('/visitors');
      setVisitors(data.visitors);
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  // Auto-fill flat number when modal opens for residents
  useEffect(() => {
    if (isResident && user?.flatNumber && showModal) {
      setForm(prev => ({ ...prev, flatToVisit: user.flatNumber }));
    }
  }, [isResident, user, showModal]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      // Ensure flat number is set for residents
      const submitData = isResident && user?.flatNumber 
        ? { ...form, flatToVisit: user.flatNumber }
        : form;
      await apiClient.request('/visitors', { method: 'POST', body: submitData });
      globalEventBus.emit('notify', { type: 'success', message: 'Visitor scheduled' });
      setShowModal(false);
      setForm({ visitorName: '', purpose: '', contactNumber: '', flatToVisit: '', expectedTime: '' });
      fetchVisitors();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleStatusChange = async (id, status) => {
    const payload = { status };
    if (status === 'checked_in') {
      payload.checkInTime = new Date().toISOString();
    }
    if (status === 'checked_out') {
      payload.checkOutTime = new Date().toISOString();
    }

    try {
      await apiClient.request(`/visitors/${id}`, { method: 'PUT', body: payload });
      globalEventBus.emit('notify', { type: 'info', message: 'Visitor status updated' });
      fetchVisitors();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleApprove = async (id, approved) => {
    try {
      await apiClient.request(`/visitors/${id}`, {
        method: 'PUT',
        body: {
          isApproved: approved,
          status: approved ? 'scheduled' : 'rejected',
        },
      });
      globalEventBus.emit('notify', { type: 'success', message: `Visitor ${approved ? 'approved' : 'rejected'}` });
      // Refresh visitors list to show updated status
      await fetchVisitors();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleAddUnscheduledVisitor = async (event) => {
    event.preventDefault();
    if (!form.expectedTime) {
      globalEventBus.emit('notify', { type: 'danger', message: 'Please enter the time for the unscheduled visitor' });
      return;
    }
    if (!form.needsApprovalFrom) {
      globalEventBus.emit('notify', { type: 'danger', message: 'Please select who needs to approve this visitor' });
      return;
    }
    try {
      await apiClient.request('/visitors', {
        method: 'POST',
        body: {
          visitorName: form.visitorName,
          purpose: form.purpose,
          contactNumber: form.contactNumber,
          flatToVisit: form.flatToVisit,
          expectedTime: form.expectedTime,
          status: 'pending_approval',
          needsApprovalFrom: form.needsApprovalFrom, // Send selected approver
        },
      });
      globalEventBus.emit('notify', { type: 'success', message: 'Visitor added. Waiting for resident approval.' });
      setShowModal(false);
      setForm({ visitorName: '', purpose: '', contactNumber: '', flatToVisit: '', expectedTime: '', needsApprovalFrom: '' });
      setFlatResidents([]);
      fetchVisitors();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  // Filter visitors based on role
  // Note: For residents, the backend already filters by flat and approval needs
  // So we just use all visitors returned from backend
  const filteredVisitors = useMemo(() => {
    if (isAdmin) {
      return visitors; // Admin sees all
    } else if (isSecurity) {
      return visitors; // Security sees all
    } else if (isResident) {
      // Backend already filters by flat and approval needs, so return all
      return visitors;
    }
    return visitors;
  }, [visitors, isAdmin, isSecurity, isResident]);

  // Count present visitors (checked in but not checked out)
  const presentCount = useMemo(() => {
    return visitors.filter(v => v.status === 'checked_in').length;
  }, [visitors]);

  // For security: separate scheduled and unscheduled visitors
  const scheduledVisitors = useMemo(() => {
    if (!isSecurity) return [];
    return filteredVisitors.filter(v => 
      (v.status === 'scheduled' || v.status === 'checked_in' || v.status === 'checked_out') && v.isApproved
    );
  }, [filteredVisitors, isSecurity]);

  const unscheduledVisitors = useMemo(() => {
    if (!isSecurity) return [];
    return filteredVisitors.filter(v => v.status === 'pending_approval' || v.status === 'rejected');
  }, [filteredVisitors, isSecurity]);

  // For residents: separate scheduled and pending approval
  const residentScheduled = useMemo(() => {
    if (!isResident) return [];
    return filteredVisitors.filter(v => ['scheduled', 'checked_in', 'checked_out'].includes(v.status));
  }, [filteredVisitors, isResident]);

  const residentPending = useMemo(() => {
    if (!isResident) return [];
    // Show visitors that need approval from this user
    // Check both populated object and raw ID
    return filteredVisitors.filter(v => {
      if (v.status !== 'pending_approval') return false;
      // Handle both populated object and raw ID
      const approverId = v.needsApprovalFrom?._id || v.needsApprovalFrom;
      const userId = user?.id || user?._id;
      if (!approverId || !userId) return false;
      // Convert both to strings for comparison
      return approverId.toString() === userId.toString();
    });
  }, [filteredVisitors, isResident, user]);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h3 className="mb-0">Visitor Management</h3>
          <p className="text-muted mb-0">
            {isAdmin && `Total visitors present: ${presentCount}`}
            {isSecurity && 'Manage visitor check-ins and check-outs'}
            {isResident && 'Schedule and approve visitors for your flat'}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowModal(true)} variant="primary">
            {isSecurity ? 'Add Unscheduled Visitor' : isAdmin ? 'Schedule Visitor' : 'Schedule Visitor'}
          </Button>
        )}
      </div>

      {/* Admin View - No Actions */}
      {isAdmin && (
        <Card className="shadow-sm">
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Purpose</th>
                  <th>Contact</th>
                  <th>Flat</th>
                  <th>Expected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((visitor) => (
                  <tr key={visitor._id}>
                    <td>{visitor.visitorName}</td>
                    <td>{visitor.purpose}</td>
                    <td>{visitor.contactNumber || '-'}</td>
                    <td>{visitor.flatToVisit}</td>
                    <td>{format(new Date(visitor.expectedTime), 'MMM d, yyyy HH:mm')}</td>
                    <td>
                      <Badge bg={statusVariant[visitor.status] || 'secondary'} className="text-uppercase">
                        {visitor.status.replace('_', ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!filteredVisitors.length && <p className="text-muted text-center mb-0">No visitors found.</p>}
          </Card.Body>
        </Card>
      )}

      {/* Security View */}
      {isSecurity && (
        <>
          <Card className="shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Scheduled Visitors</h5>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Purpose</th>
                    <th>Contact</th>
                    <th>Flat</th>
                    <th>Expected</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledVisitors.map((visitor) => (
                    <tr key={visitor._id}>
                      <td>{visitor.visitorName}</td>
                      <td>{visitor.purpose}</td>
                      <td>{visitor.contactNumber || '-'}</td>
                      <td>{visitor.flatToVisit}</td>
                      <td>{format(new Date(visitor.expectedTime), 'MMM d, yyyy HH:mm')}</td>
                      <td>
                        <Badge bg={statusVariant[visitor.status] || 'secondary'} className="text-uppercase">
                          {visitor.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="text-end">
                        {visitor.status === 'scheduled' && visitor.isApproved && (
                          <Button size="sm" variant="outline-success" onClick={() => handleStatusChange(visitor._id, 'checked_in')}>
                            Check In
                          </Button>
                        )}
                        {visitor.status === 'checked_in' && (
                          <Button size="sm" variant="outline-secondary" onClick={() => handleStatusChange(visitor._id, 'checked_out')}>
                            Check Out
                          </Button>
                        )}
                        {visitor.status === 'scheduled' && !visitor.isApproved && (
                          <small className="text-muted">Waiting for approval</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {!scheduledVisitors.length && <p className="text-muted text-center mb-0">No scheduled visitors.</p>}
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Unscheduled Visitors (Pending Approval)</h5>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Purpose</th>
                    <th>Contact</th>
                    <th>Flat</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Approval Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unscheduledVisitors.map((visitor) => (
                    <tr key={visitor._id}>
                      <td>{visitor.visitorName}</td>
                      <td>{visitor.purpose}</td>
                      <td>{visitor.contactNumber || '-'}</td>
                      <td>{visitor.flatToVisit}</td>
                      <td>{visitor.expectedTime ? format(new Date(visitor.expectedTime), 'MMM d, yyyy HH:mm') : '-'}</td>
                      <td>
                        <Badge bg={statusVariant[visitor.status] || 'secondary'} className="text-uppercase">
                          {visitor.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td>
                        {visitor.status === 'pending_approval' && (
                          <Badge bg="warning">Waiting for Approval</Badge>
                        )}
                        {visitor.status === 'rejected' && (
                          <Badge bg="danger">Rejected</Badge>
                        )}
                        {visitor.isApproved && visitor.status === 'scheduled' && (
                          <Badge bg="success">Approved</Badge>
                        )}
                        {visitor.needsApprovalFrom && (
                          <small className="text-muted d-block">
                            Awaiting: {visitor.needsApprovalFrom?.firstName} {visitor.needsApprovalFrom?.lastName}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {!unscheduledVisitors.length && <p className="text-muted text-center mb-0">No unscheduled visitors.</p>}
            </Card.Body>
          </Card>
        </>
      )}

      {/* Resident View */}
      {isResident && (
        <>
          <Card className="shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Scheduled Visitors</h5>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Purpose</th>
                    <th>Contact</th>
                    <th>Expected</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {residentScheduled.map((visitor) => (
                    <tr key={visitor._id}>
                      <td>{visitor.visitorName}</td>
                      <td>{visitor.purpose}</td>
                      <td>{visitor.contactNumber || '-'}</td>
                      <td>{format(new Date(visitor.expectedTime), 'MMM d, yyyy HH:mm')}</td>
                      <td>
                        <Badge bg={statusVariant[visitor.status] || 'secondary'} className="text-uppercase">
                          {visitor.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {!residentScheduled.length && <p className="text-muted text-center mb-0">No scheduled visitors.</p>}
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Visitors Pending Your Approval</h5>
              {residentPending.length > 0 ? (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Purpose</th>
                      <th>Contact</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residentPending.map((visitor) => (
                      <tr key={visitor._id}>
                        <td>{visitor.visitorName}</td>
                        <td>{visitor.purpose}</td>
                        <td>{visitor.contactNumber || '-'}</td>
                        <td>{visitor.expectedTime ? format(new Date(visitor.expectedTime), 'MMM d, yyyy HH:mm') : '-'}</td>
                        <td>
                          <Badge bg={statusVariant[visitor.status] || 'secondary'} className="text-uppercase">
                            {visitor.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            <Button size="sm" variant="outline-success" onClick={() => handleApprove(visitor._id, true)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline-danger" onClick={() => handleApprove(visitor._id, false)}>
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted text-center mb-0">No visitors pending your approval.</p>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={isSecurity ? handleAddUnscheduledVisitor : handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{isSecurity ? 'Add Unscheduled Visitor' : 'Schedule New Visitor'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="d-flex flex-column gap-3">
            <Form.Group>
              <Form.Label>Visitor Name</Form.Label>
              <Form.Control
                value={form.visitorName}
                onChange={(event) => setForm((prev) => ({ ...prev, visitorName: event.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Purpose</Form.Label>
              <Form.Control
                value={form.purpose}
                onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Contact Number</Form.Label>
              <Form.Control
                value={form.contactNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, contactNumber: event.target.value }))}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Flat to Visit</Form.Label>
              <Form.Control
                value={form.flatToVisit}
                onChange={(event) => setForm((prev) => ({ ...prev, flatToVisit: event.target.value }))}
                required
                disabled={isResident || (isAdmin && user?.flatNumber)} // Disable for residents and admin (auto-filled)
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={form.expectedTime}
                onChange={(event) => setForm((prev) => ({ ...prev, expectedTime: event.target.value }))}
                required={isSecurity} // Required for security unscheduled visitors
              />
            </Form.Group>
            {isSecurity && flatResidents.length > 0 && (
              <Form.Group>
                <Form.Label>Approval Required From</Form.Label>
                <Form.Select
                  value={form.needsApprovalFrom}
                  onChange={(event) => setForm((prev) => ({ ...prev, needsApprovalFrom: event.target.value }))}
                  required
                >
                  <option value="">Select approver</option>
                  {flatResidents.map((resident) => (
                    <option value={resident._id} key={resident._id}>
                      {resident.firstName} {resident.lastName} ({resident.role === 'tenant' ? 'Tenant' : 'Owner'})
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  {flatResidents.find(r => r.role === 'tenant') 
                    ? 'Tenant will approve first if selected' 
                    : 'Owner will approve'}
                </Form.Text>
              </Form.Group>
            )}
            {isSecurity && form.flatToVisit && flatResidents.length === 0 && (
              <div className="alert alert-warning">
                No active residents found for this flat. Please check the flat number.
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
