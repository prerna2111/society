import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { format } from 'date-fns';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';
import { useAuth } from '../context/AuthContext';

const DEFAULT_FORM = {
  owner: '',
  periodStart: '',
  periodEnd: '',
  amount: '',
  dueDate: '',
  breakdown: {
    maintenance: '',
    parking: '',
    sinkingFund: '',
    other: '',
  },
};

export default function Maintenance() {
  const { hasRole } = useAuth();
  const [bills, setBills] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const canManage = useMemo(() => hasRole(['committee', 'admin']), [hasRole]);

  const fetchBills = async () => {
    try {
      const { data } = await apiClient.request('/maintenance');
      setBills(data.bills);
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await apiClient.request('/users');
      setUsers(data.users);
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  useEffect(() => {
    fetchBills();
    if (canManage) {
      fetchUsers();
    }
  }, [canManage]);

  const handleBreakdownChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      breakdown: {
        ...prev.breakdown,
        [name]: value,
      },
    }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const selectedUser = users.find(u => u._id === form.owner);
      const payload = {
        flatNumber: selectedUser?.flatNumber || '',
        owner: form.owner,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        breakdown: Object.fromEntries(Object.entries(form.breakdown).map(([key, val]) => [key, Number(val) || 0])),
      };
      await apiClient.request('/maintenance', {
        method: 'POST',
        body: payload,
      });
      globalEventBus.emit('notify', { type: 'success', message: 'Maintenance bill created' });
      setShowModal(false);
      setForm(DEFAULT_FORM);
      fetchBills();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleDelete = async (billId) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    try {
      await apiClient.request(`/maintenance/${billId}`, { method: 'DELETE' });
      globalEventBus.emit('notify', { type: 'success', message: 'Bill deleted successfully' });
      fetchBills();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h3 className="mb-0">Maintenance Management</h3>
          <p className="text-muted mb-0">Track maintenance bills, payment statuses, and due dates.</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)} variant="primary">
            Add Bill
          </Button>
        )}
      </div>

      {/* Pending Bills Section */}
      <Card className="shadow-sm">
        <Card.Body>
          <h5 className="mb-3">Pending Bills</h5>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Flat</th>
                <th>Owner</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Updated</th>
                {canManage && <th className="text-end">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {bills.filter(bill => bill.status !== 'paid').map((bill) => (
                <tr key={bill._id}>
                  <td>{bill.flatNumber}</td>
                  <td>
                    {bill.owner?.firstName} {bill.owner?.lastName}
                  </td>
                  <td>
                    {format(new Date(bill.periodStart), 'MMM d, yyyy')} - {format(new Date(bill.periodEnd), 'MMM d, yyyy')}
                  </td>
                  <td>₹ {bill.amount.toLocaleString()}</td>
                  <td>{format(new Date(bill.dueDate), 'MMM d, yyyy')}</td>
                  <td>
                    <Badge
                      bg={
                        bill.status === 'paid'
                          ? 'success'
                          : bill.status === 'overdue'
                          ? 'danger'
                          : bill.status === 'pending'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {bill.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td>{format(new Date(bill.updatedAt || bill.createdAt), 'MMM d, yyyy')}</td>
                  {canManage && (
                    <td className="text-end">
                      <Button size="sm" variant="outline-danger" onClick={() => handleDelete(bill._id)}>
                        Delete
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
          {!bills.filter(bill => bill.status !== 'paid').length && <p className="text-muted mb-0 text-center">No pending bills.</p>}
        </Card.Body>
      </Card>

      {/* Paid Bills Section */}
      <Card className="shadow-sm">
        <Card.Body>
          <h5 className="mb-3">Paid Bills</h5>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Flat</th>
                <th>Owner</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {bills.filter(bill => bill.status === 'paid').map((bill) => (
                <tr key={bill._id}>
                  <td>{bill.flatNumber}</td>
                  <td>
                    {bill.owner?.firstName} {bill.owner?.lastName}
                  </td>
                  <td>
                    {format(new Date(bill.periodStart), 'MMM d, yyyy')} - {format(new Date(bill.periodEnd), 'MMM d, yyyy')}
                  </td>
                  <td>₹ {bill.amount.toLocaleString()}</td>
                  <td>{format(new Date(bill.dueDate), 'MMM d, yyyy')}</td>
                  <td>
                    <Badge bg="success">
                      {bill.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td>{format(new Date(bill.updatedAt || bill.createdAt), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!bills.filter(bill => bill.status === 'paid').length && <p className="text-muted mb-0 text-center">No paid bills.</p>}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Create Maintenance Bill</Modal.Title>
          </Modal.Header>
          <Modal.Body className="d-flex flex-column gap-3">
            <Row>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Select Resident</Form.Label>
                  <Form.Select name="owner" value={form.owner} onChange={handleChange} required>
                    <option value="">Select owner</option>
                    {users.filter(u => u.role === 'owner').map((user) => (
                      <option value={user._id} key={user._id}>
                        {user.firstName} {user.lastName} - {user.flatNumber}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Period Start</Form.Label>
                  <Form.Control type="date" name="periodStart" value={form.periodStart} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Period End</Form.Label>
                  <Form.Control type="date" name="periodEnd" value={form.periodEnd} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Amount</Form.Label>
                  <Form.Control type="number" name="amount" value={form.amount} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Due Date</Form.Label>
                  <Form.Control type="date" name="dueDate" value={form.dueDate} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Maintenance</Form.Label>
                  <Form.Control type="number" name="maintenance" value={form.breakdown.maintenance} onChange={handleBreakdownChange} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Parking</Form.Label>
                  <Form.Control type="number" name="parking" value={form.breakdown.parking} onChange={handleBreakdownChange} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Sinking Fund</Form.Label>
                  <Form.Control type="number" name="sinkingFund" value={form.breakdown.sinkingFund} onChange={handleBreakdownChange} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Other</Form.Label>
                  <Form.Control type="number" name="other" value={form.breakdown.other} onChange={handleBreakdownChange} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Bill</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

