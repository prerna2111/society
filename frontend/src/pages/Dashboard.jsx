import { useEffect, useState } from 'react';
import { Card, Col, Row, Spinner } from 'react-bootstrap';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        const response = await apiClient.request('/dashboard');
        if (isMounted) {
          setData(response.data);
        }
      } catch (error) {
        globalEventBus.emit('notify', { type: 'danger', message: error.message });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      {!hasRole('tenant') && (
        <Row>
          <Col md={4}>
            <Card className="shadow-sm">
              <Card.Body>
                <Card.Title>Maintenance Due</Card.Title>
                {data.bills && data.bills.length > 0 && data.bills[0] ? (
                  <>
                    <Card.Text className="display-5 fw-bold text-primary">
                      ₹ {data.bills[0].amount.toLocaleString()}
                    </Card.Text>
                    <small className="text-muted">
                      Due: {new Date(data.bills[0].dueDate).toLocaleDateString()}
                    </small>
                  </>
                ) : (
                  <>
                    <Card.Text className="display-5 fw-bold text-success">₹ 0</Card.Text>
                    <small className="text-muted">No pending bills</small>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      <Row>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Active Polls</Card.Title>
              <Card.Text className="display-5 fw-bold text-success">{data.activePolls.length}</Card.Text>
              <small className="text-muted">Make sure to vote before they close</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Visitors</Card.Title>
              <Card.Text className="display-5 fw-bold text-warning">{data.upcomingVisitors.length}</Card.Text>
              <small className="text-muted">Scheduled to arrive for your flat</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Latest Notices</Card.Title>
              <div className="d-flex flex-column gap-3">
                {data.notices.slice(0, 3).map((notice) => (
                  <div key={notice._id} className="border rounded p-3 bg-light">
                    <h6 className="mb-1">{notice.title}</h6>
                    <small className="text-muted">{new Date(notice.createdAt).toLocaleString()}</small>
                    <p className="mb-0 mt-2 text-muted">{notice.content.slice(0, 100)}...</p>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Your Recent Complaints</Card.Title>
              <div className="d-flex flex-column gap-3">
                {data.complaints.slice(0, 3).map((complaint) => (
                  <div key={complaint._id} className="border rounded p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">{complaint.subject}</h6>
                      <span className="badge bg-secondary text-uppercase">{complaint.status.replaceAll('_', ' ')}</span>
                    </div>
                    <p className="text-muted mb-1 mt-2">{complaint.description.slice(0, 120)}...</p>
                    <small className="text-muted">
                      Updated: {new Date(complaint.updatedAt || complaint.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Active Polls</Card.Title>
              <div className="d-flex flex-column gap-3">
                {data.activePolls.map((poll) => (
                  <div key={poll._id} className="border rounded p-3 bg-white">
                    <h6>{poll.question}</h6>
                    <small className="text-muted">
                      Closes {poll.closesAt ? new Date(poll.closesAt).toLocaleString() : 'soon'}
                    </small>
                  </div>
                ))}
                {!data.activePolls.length && <p className="text-muted mb-0">No active polls at the moment.</p>}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

