import { useEffect, useState } from 'react';
import { Badge, Button, Card, Form, Modal, Image } from 'react-bootstrap';
import { Heart, HeartFill, Chat, Trash } from 'react-bootstrap-icons';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [form, setForm] = useState({ content: '', images: [] });
  const [commentText, setCommentText] = useState('');

  const fetchPosts = async () => {
    try {
      const { data } = await apiClient.request('/community');
      setPosts(data.posts);
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await apiClient.request('/community', {
        method: 'POST',
        body: form,
      });
      globalEventBus.emit('notify', { type: 'success', message: 'Post created' });
      setShowModal(false);
      setForm({ content: '', images: [] });
      fetchPosts();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleImageChange = async (event) => {
    const files = Array.from(event.target.files);
    const imageData = [];
    
    for (const file of files) {
      // Convert to base64 for storage
      const reader = new FileReader();
      const promise = new Promise((resolve) => {
        reader.onload = (e) => {
          resolve({
            fileName: file.name,
            url: e.target.result, // Base64 data URL
          });
        };
        reader.onerror = () => resolve(null);
      });
      reader.readAsDataURL(file);
      const result = await promise;
      if (result) imageData.push(result);
    }
    
    setForm(prev => ({ ...prev, images: [...prev.images, ...imageData] }));
  };

  const handleLike = async (postId) => {
    try {
      await apiClient.request(`/community/${postId}/like`, { method: 'POST' });
      fetchPosts();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleAddComment = async (postId) => {
    if (!commentText.trim()) return;
    try {
      await apiClient.request(`/community/${postId}/comments`, {
        method: 'POST',
        body: { content: commentText },
      });
      globalEventBus.emit('notify', { type: 'success', message: 'Comment added' });
      setCommentText('');
      setShowCommentModal(null);
      fetchPosts();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await apiClient.request(`/community/${postId}`, { method: 'DELETE' });
      globalEventBus.emit('notify', { type: 'success', message: 'Post deleted' });
      fetchPosts();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await apiClient.request(`/community/${postId}/comments/${commentId}`, { method: 'DELETE' });
      globalEventBus.emit('notify', { type: 'success', message: 'Comment deleted' });
      fetchPosts();
    } catch (error) {
      globalEventBus.emit('notify', { type: 'danger', message: error.message });
    }
  };

  const isLiked = (post) => {
    return post.likes?.some(like => like._id === user?.id || like === user?.id);
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h3 className="mb-0">Community</h3>
          <p className="text-muted mb-0">Share updates, photos, and connect with your neighbors</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">
          Create Post
        </Button>
      </div>

      <div className="d-flex flex-column gap-4">
        {posts.map((post) => (
          <Card key={post._id} className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 className="mb-0">
                    {post.createdBy?.firstName} {post.createdBy?.lastName}
                  </h5>
                  <small className="text-muted">
                    {post.createdBy?.flatNumber} • {format(new Date(post.createdAt), 'MMM d, yyyy HH:mm')}
                  </small>
                </div>
                {(post.createdBy?._id === user?.id || post.createdBy === user?.id) && (
                  <Button variant="outline-danger" size="sm" onClick={() => handleDeletePost(post._id)}>
                    <Trash />
                  </Button>
                )}
              </div>
              <p className="mb-3">{post.content}</p>
              {post.images && post.images.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {post.images.map((img, idx) => (
                    <Image key={idx} src={img.url} alt={img.fileName} thumbnail style={{ maxWidth: '200px', maxHeight: '200px' }} />
                  ))}
                </div>
              )}
              <div className="d-flex align-items-center gap-3 mb-3">
                <Button
                  variant="link"
                  className="p-0 text-decoration-none"
                  onClick={() => handleLike(post._id)}
                >
                  {isLiked(post) ? (
                    <HeartFill className="text-danger me-1" />
                  ) : (
                    <Heart className="me-1" />
                  )}
                  {post.likes?.length || 0}
                </Button>
                <Button
                  variant="link"
                  className="p-0 text-decoration-none"
                  onClick={() => setShowCommentModal(post._id)}
                >
                  <Chat className="me-1" />
                  {post.comments?.length || 0}
                </Button>
              </div>
              {post.comments && post.comments.length > 0 && (
                <div className="border-top pt-3">
                  {post.comments.map((comment) => (
                    <div key={comment._id} className="mb-2 d-flex justify-content-between align-items-start">
                      <div>
                        <strong>{comment.createdBy?.firstName} {comment.createdBy?.lastName}</strong>
                        <p className="mb-0">{comment.content}</p>
                        <small className="text-muted">{format(new Date(comment.createdAt), 'MMM d, HH:mm')}</small>
                      </div>
                      {(comment.createdBy?._id === user?.id || comment.createdBy === user?.id || user?.role === 'admin') && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-danger"
                          onClick={() => handleDeleteComment(post._id, comment._id)}
                        >
                          <Trash size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        ))}
        {!posts.length && <p className="text-muted text-center">No posts yet. Be the first to share!</p>}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Create Post</Modal.Title>
          </Modal.Header>
          <Modal.Body className="d-flex flex-column gap-3">
            <Form.Group>
              <Form.Label>What's on your mind?</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={form.content}
                onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Add Images</Form.Label>
              <Form.Control type="file" multiple accept="image/*" onChange={handleImageChange} />
              {form.images.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {form.images.map((img, idx) => (
                    <Image key={idx} src={img.url} thumbnail style={{ maxWidth: '100px', maxHeight: '100px' }} />
                  ))}
                </div>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Post</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showCommentModal !== null} onHide={() => setShowCommentModal(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Comment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Control
              as="textarea"
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCommentModal(null)}>
            Cancel
          </Button>
          <Button onClick={() => handleAddComment(showCommentModal)}>Comment</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

