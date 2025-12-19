import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row } from 'react-bootstrap';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';
import { useAuth } from '../context/AuthContext';

const statusOptions = [
  { value: 'open', label: 'Open', variant: 'warning' },
  { value: 'in_progress', label: 'In Progress', variant: 'info' },
  { value: 'resolved', label: 'Resolved', variant: 'success' },
  { value: 'rejected', label: 'Rejected', variant: 'danger' },
];

export default function Complaints() {
  const { hasRole, user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'maintenance',
    priority: 'medium', // Only used for admin
  });

  const canModerate = useMemo(() => hasRole(['committee', 'admin']), [hasRole]);

  const fetchComplaints = async () => {
    try {
      const { data } = await apiClient.request('/complaints');
      setComplaints(data.complaints);
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await apiClient.request('/complaints', { method: 'POST', body: form });
      globalEventBus.emit('notify', { type: 'success', message: 'Complaint submitted' });
      setShowModal(false);
      setForm({ subject: '', description: '', category: 'maintenance', priority: 'medium' });
      fetchComplaints();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      await apiClient.request(`/complaints/${complaintId}`, {
        method: 'PUT',
        body: { status: newStatus },
      });
      globalEventBus.emit('notify', { type: 'success', message: 'Status updated' });
      fetchComplaints();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleDelete = async (complaintId) => {
    if (!window.confirm('Delete this complaint?')) return;
    try {
      await apiClient.request(`/complaints/${complaintId}`, { method: 'DELETE' });
      globalEventBus.emit('notify', { type: 'success', message: 'Complaint deleted' });
      fetchComplaints();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };


  // Filter complaints by status
  const filteredComplaints = useMemo(() => {
    if (selectedStatus === 'all') return complaints;
    return complaints.filter(c => c.status === selectedStatus);
  }, [complaints, selectedStatus]);

  // Group complaints by status
  const complaintsByStatus = useMemo(() => {
    return {
      open: complaints.filter(c => c.status === 'open'),
      in_progress: complaints.filter(c => c.status === 'in_progress'),
      rejected: complaints.filter(c => c.status === 'rejected'),
      resolved: complaints.filter(c => c.status === 'resolved'),
    };
  }, [complaints]);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h3 className="mb-0">Virtual Complaint Box</h3>
          <p className="text-muted mb-0">Raise issues and track their resolution status in real-time.</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">
          New Complaint
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="d-flex gap-2">
        <Button
          variant={selectedStatus === 'all' ? 'primary' : 'outline-primary'}
          size="sm"
          onClick={() => setSelectedStatus('all')}
        >
          All ({complaints.length})
        </Button>
        <Button
          variant={selectedStatus === 'open' ? 'warning' : 'outline-warning'}
          size="sm"
          onClick={() => setSelectedStatus('open')}
        >
          Open ({complaintsByStatus.open.length})
        </Button>
        <Button
          variant={selectedStatus === 'in_progress' ? 'info' : 'outline-info'}
          size="sm"
          onClick={() => setSelectedStatus('in_progress')}
        >
          In Progress ({complaintsByStatus.in_progress.length})
        </Button>
        <Button
          variant={selectedStatus === 'rejected' ? 'danger' : 'outline-danger'}
          size="sm"
          onClick={() => setSelectedStatus('rejected')}
        >
          Rejected ({complaintsByStatus.rejected.length})
        </Button>
        <Button
          variant={selectedStatus === 'resolved' ? 'success' : 'outline-success'}
          size="sm"
          onClick={() => setSelectedStatus('resolved')}
        >
          Resolved ({complaintsByStatus.resolved.length})
        </Button>
      </div>

      <div className="d-flex flex-column gap-3">
        {filteredComplaints.map((complaint) => {
          const statusMeta = statusOptions.find((option) => option.value === complaint.status) || statusOptions[0];
          const isOwner = complaint.createdBy?._id === user?.id;
          return (
            <Card key={complaint._id} className="shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h5 className="mb-0">{complaint.subject}</h5>
                      <Badge bg={statusMeta.variant}>{statusMeta.label}</Badge>
                      {canModerate && (
                        <Badge bg="secondary" className="text-capitalize">
                          {complaint.priority}
                        </Badge>
                      )}
                    </div>
                    <small className="text-muted">
                      Raised on {new Date(complaint.createdAt).toLocaleString()} by {complaint.createdBy?.firstName}{' '}
                      {complaint.createdBy?.lastName}
                    </small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {canModerate && (
                      <Form.Select
                        value={complaint.status}
                        onChange={(event) => handleStatusChange(complaint._id, event.target.value)}
                        size="sm"
                        disabled={complaint.status === 'resolved'}
                      >
                        {statusOptions.map((option) => (
                          <option value={option.value} key={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                    {/* Admin can only delete own complaints, residents can delete their own */}
                    {((canModerate && isOwner) || (!canModerate && isOwner)) && (
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(complaint._id)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-3 mb-0">{complaint.description}</p>
                {complaint.resolutionNotes && (
                  <Card className="mt-3 border-success">
                    <Card.Body>
                      <strong>Resolution Notes:</strong>
                      <p className="mb-0">{complaint.resolutionNotes}</p>
                    </Card.Body>
                  </Card>
                )}
              </Card.Body>
            </Card>
          );
        })}
        {!complaints.length && <p className="text-muted text-center">No complaints found.</p>}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Raise Complaint</Modal.Title>
          </Modal.Header>
          <Modal.Body className="d-flex flex-column gap-3">
            <Form.Group>
              <Form.Label>Subject</Form.Label>
              <Form.Control name="subject" value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Category</Form.Label>
              <Form.Select
                name="category"
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option value="maintenance">Maintenance</option>
                <option value="security">Security</option>
                <option value="billing">Billing</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

