import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Form, Modal, Table } from 'react-bootstrap';
import { format } from 'date-fns';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';
import { useAuth } from '../context/AuthContext';

const statusVariant = {
  initiated: 'warning',
  successful: 'success',
  failed: 'danger',
  refunded: 'secondary',
};

export default function Payments() {
  const { hasRole } = useAuth();
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const isCommittee = useMemo(() => hasRole(['committee', 'admin']), [hasRole]);

  const fetchData = async () => {
    try {
      const [paymentsResponse, billsResponse] = await Promise.all([
        apiClient.request('/payments'),
        apiClient.request('/maintenance'),
      ]);
      setPayments(paymentsResponse.data.payments);
      setBills(billsResponse.data.bills.filter((bill) => bill.status !== 'paid'));
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInitiatePayment = async (event) => {
    event.preventDefault();
    try {
      const bill = bills.find((item) => item._id === selectedBill);
      if (!bill) {
        globalEventBus.emit('notify', { type: 'danger', message: 'Select a bill' });
        return;
      }
      if (!transactionId.trim()) {
        globalEventBus.emit('notify', { type: 'danger', message: 'Please enter transaction ID' });
        return;
      }
      await apiClient.request('/payments', {
        method: 'POST',
        body: {
          billId: bill._id,
          amount: bill.amount,
          paymentMethod: 'razorpay',
          transactionId: transactionId.trim(),
          metadata: { note: 'Payment by resident' },
        },
      });
      globalEventBus.emit('notify', { type: 'success', message: 'Payment initiated' });
      setShowModal(false);
      setSelectedBill('');
      setTransactionId('');
      fetchData();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleStatusUpdate = async (paymentId, status) => {
    try {
      await apiClient.request(`/payments/${paymentId}`, {
        method: 'PATCH',
        body: { status },
      });
      globalEventBus.emit('notify', { type: 'info', message: `Payment marked as ${status}` });
      fetchData();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h3 className="mb-0">Maintenance Payments</h3>
          <p className="text-muted mb-0">Track payment history and settlements.</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Pay Maintenance
        </Button>
      </div>
      <Card className="shadow-sm">
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Bill</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Transaction ID</th>
                <th>Payer</th>
                <th>Updated At</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td>
                    {payment.bill?.flatNumber} ({format(new Date(payment.bill?.periodStart), 'MMM d')} -{' '}
                    {format(new Date(payment.bill?.periodEnd), 'MMM d')})
                  </td>
                  <td>₹ {payment.amount?.toLocaleString()}</td>
                  <td>
                    <Badge bg={statusVariant[payment.status] || 'secondary'} className="text-uppercase">
                      {payment.status}
                    </Badge>
                  </td>
                  <td>{payment.transactionId}</td>
                  <td>
                    {payment.payer?.firstName} {payment.payer?.lastName}
                  </td>
                  <td>{format(new Date(payment.updatedAt), 'MMM d, yyyy HH:mm')}</td>
                  <td className="text-end">
                    {isCommittee && (
                      <div className="d-inline-flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline-success" 
                          onClick={() => handleStatusUpdate(payment._id, 'successful')}
                          disabled={payment.status === 'successful' || payment.status === 'failed'}
                        >
                          Mark Paid
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline-danger" 
                          onClick={() => handleStatusUpdate(payment._id, 'failed')}
                          disabled={payment.status === 'successful' || payment.status === 'failed'}
                        >
                          Mark Failed
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!payments.length && <p className="text-muted text-center">No payments recorded yet.</p>}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleInitiatePayment}>
          <Modal.Header closeButton>
            <Modal.Title>Pay Maintenance</Modal.Title>
          </Modal.Header>
          <Modal.Body className="d-flex flex-column gap-3">
            <Form.Group>
              <Form.Label>Select Bill</Form.Label>
              <Form.Select value={selectedBill} onChange={(event) => setSelectedBill(event.target.value)} required>
                <option value="">Choose a bill</option>
                {bills.map((bill) => (
                  <option value={bill._id} key={bill._id}>
                    Flat {bill.flatNumber} — ₹{bill.amount} due {format(new Date(bill.dueDate), 'MMM d, yyyy')}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Transaction ID</Form.Label>
              <Form.Control
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction ID"
                required
              />
            </Form.Group>
            <p className="text-muted small mb-0">
              Enter the transaction ID from your payment receipt. Committee members can mark payments as successful or failed.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Proceed Payment</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

