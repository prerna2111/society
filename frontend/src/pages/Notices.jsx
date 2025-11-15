import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Form, Modal } from 'react-bootstrap';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';
import { useAuth } from '../context/AuthContext';

export default function Notices() {
  const { hasRole } = useAuth();
  const [notices, setNotices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    audience: 'all',
    isPinned: false,
  });

  const canManage = useMemo(() => hasRole(['committee', 'admin']), [hasRole]);

  const fetchNotices = async () => {
    try {
      const { data } = await apiClient.request('/notices');
      setNotices(data.notices);
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await apiClient.request('/notices', {
        method: 'POST',
        body: form,
      });
      globalEventBus.emit('notify', { type: 'success', message: 'Notice created' });
      setShowModal(false);
      setForm({ title: '', content: '', audience: 'all', isPinned: false });
      fetchNotices();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notice?')) return;
    try {
      await apiClient.request(`/notices/${id}`, { method: 'DELETE' });
      globalEventBus.emit('notify', { type: 'success', message: 'Notice removed' });
      fetchNotices();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handlePinToggle = async (noticeId, isPinned) => {
    try {
      await apiClient.request(`/notices/${noticeId}`, {
        method: 'PUT',
        body: { isPinned },
      });
      globalEventBus.emit('notify', { type: 'success', message: `Notice ${isPinned ? 'pinned' : 'unpinned'}` });
      fetchNotices();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h3 className="mb-0">Virtual Notice Board</h3>
          <p className="text-muted mb-0">Stay updated with official announcements from your society.</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)} variant="primary">
            Add Notice
          </Button>
        )}
      </div>
      <div className="d-flex flex-column gap-3">
        {notices.map((notice) => (
          <Card key={notice._id} className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <Card.Title className="mb-0">{notice.title}</Card.Title>
                    {notice.isPinned && <Badge bg="warning">Pinned</Badge>}
                    {notice.audience.map((aud) => (
                      <Badge bg="secondary" key={aud}>
                        {aud}
                      </Badge>
                    ))}
                  </div>
                  <small className="text-muted">
                    Posted on {new Date(notice.createdAt).toLocaleString()} by {notice.createdBy?.firstName}{' '}
                    {notice.createdBy?.lastName}
                  </small>
                </div>
                {canManage && (
                  <div className="d-flex align-items-center gap-2">
                    <Button
                      size="sm"
                      variant={notice.isPinned ? 'warning' : 'outline-secondary'}
                      onClick={() => handlePinToggle(notice._id, !notice.isPinned)}
                      title={notice.isPinned ? 'Unpin' : 'Pin'}
                    >
                      {notice.isPinned ? '📌' : '📍'}
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(notice._id)}>
                      Delete
                    </Button>
                  </div>
                )}
              </div>
              <Card.Text className="mt-3 mb-0">{notice.content}</Card.Text>
            </Card.Body>
          </Card>
        ))}
        {!notices.length && <p className="text-muted text-center">No notices have been posted yet.</p>}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Add Notice</Modal.Title>
          </Modal.Header>
          <Modal.Body className="d-flex flex-column gap-3">
            <Form.Group>
              <Form.Label>Title</Form.Label>
              <Form.Control name="title" value={form.title} onChange={handleChange} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Content</Form.Label>
              <Form.Control as="textarea" rows={4} name="content" value={form.content} onChange={handleChange} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Audience</Form.Label>
              <Form.Select name="audience" value={form.audience} onChange={handleChange}>
                <option value="all">All Members</option>
                <option value="owners">Owners</option>
                <option value="tenants">Tenants</option>
                <option value="committee">Committee</option>
              </Form.Select>
            </Form.Group>
            <Form.Check
              type="switch"
              label="Pin this notice to the top"
              name="isPinned"
              checked={form.isPinned}
              onChange={handleChange}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Publish Notice</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

