import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, ProgressBar, Row } from 'react-bootstrap';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';
import { useAuth } from '../context/AuthContext';

export default function Polls() {
  const { hasRole, user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const canCreate = useMemo(() => hasRole(['committee', 'admin']), [hasRole]);

  const fetchPolls = async () => {
    try {
      const { data } = await apiClient.request('/polls');
      setPolls(data.polls);
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const handleVote = async (pollId, optionId) => {
    try {
      await apiClient.request(`/polls/${pollId}/vote`, {
        method: 'POST',
        body: { optionId },
      });
      globalEventBus.emit('notify', { type: 'success', message: 'Vote submitted' });
      fetchPolls();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleClosePoll = async (pollId) => {
    try {
      await apiClient.request(`/polls/${pollId}/close`, { method: 'POST' });
      globalEventBus.emit('notify', { type: 'info', message: 'Poll closed' });
      fetchPolls();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Delete this poll?')) return;
    try {
      await apiClient.request(`/polls/${pollId}`, { method: 'DELETE' });
      globalEventBus.emit('notify', { type: 'success', message: 'Poll deleted' });
      fetchPolls();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleCreatePoll = async (event) => {
    event.preventDefault();
    const validOptions = options.map((opt) => opt.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      globalEventBus.emit('notify', { type: 'danger', message: 'Add at least two options' });
      return;
    }
    try {
      await apiClient.request('/polls', {
        method: 'POST',
        body: {
          question,
          options: validOptions.map((label) => ({ label })),
        },
      });
      globalEventBus.emit('notify', { type: 'success', message: 'Poll created' });
      setQuestion('');
      setOptions(['', '']);
      setShowModal(false);
      fetchPolls();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h3 className="mb-0">Community Polls</h3>
          <p className="text-muted mb-0">Participate in society decision-making with quick polls.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowModal(true)} variant="primary">
            Create Poll
          </Button>
        )}
      </div>

      <div className="d-flex flex-column gap-3">
        {polls.map((poll) => {
          const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
          const hasVoted = poll.responses?.some((response) => response.user === user?.id);
          return (
            <Card key={poll._id} className="shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 className="mb-1">{poll.question}</h5>
                    <small className="text-muted">
                      Created on {new Date(poll.createdAt).toLocaleString()} by {poll.createdBy?.firstName}{' '}
                      {poll.createdBy?.lastName}
                    </small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg={poll.isActive ? 'success' : 'secondary'}>{poll.isActive ? 'Active' : 'Closed'}</Badge>
                    {canCreate && (
                      <>
                        {poll.isActive && (
                          <Button variant="outline-warning" size="sm" onClick={() => handleClosePoll(poll._id)}>
                            Close
                          </Button>
                        )}
                        <Button variant="outline-danger" size="sm" onClick={() => handleDeletePoll(poll._id)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <Row className="mt-3 g-3">
                  {poll.options.map((option) => {
                    const voteShare = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
                    return (
                      <Col md={6} key={option._id}>
                        <Card className="border">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span>{option.label}</span>
                              <span className="fw-bold">{option.votes} votes</span>
                            </div>
                            <ProgressBar now={voteShare} label={`${voteShare}%`} className="mb-2" />
                            {poll.isActive && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleVote(poll._id, option._id)}
                                disabled={hasVoted}
                              >
                                {hasVoted ? 'Already Voted' : 'Vote'}
                              </Button>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
                <small className="text-muted d-block mt-3">Total votes: {totalVotes}</small>
              </Card.Body>
            </Card>
          );
        })}
        {!polls.length && <p className="text-muted text-center">No polls available.</p>}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleCreatePoll}>
          <Modal.Header closeButton>
            <Modal.Title>Create Poll</Modal.Title>
          </Modal.Header>
          <Modal.Body className="d-flex flex-column gap-3">
            <Form.Group>
              <Form.Label>Question</Form.Label>
              <Form.Control value={question} onChange={(event) => setQuestion(event.target.value)} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Options</Form.Label>
              <div className="d-flex flex-column gap-2">
                {options.map((option, index) => (
                  <div key={index} className="d-flex gap-2">
                    <Form.Control
                      value={option}
                      onChange={(event) => {
                        const next = [...options];
                        next[index] = event.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                    {options.length > 2 && (
                      <Button
                        variant="outline-danger"
                        onClick={() => setOptions(options.filter((_, idx) => idx !== index))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline-primary" onClick={() => setOptions([...options, ''])}>
                  Add Option
                </Button>
              </div>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

