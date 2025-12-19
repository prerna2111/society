import { useCallback, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { useEventBus } from '../../hooks/useEventBus';

let counter = 0;

export function NotificationCenter() {
  const [messages, setMessages] = useState([]);

  const handleNotification = useCallback((payload) => {
    counter += 1;
    const notification = {
      id: counter,
      type: payload?.type || 'info',
      message: payload?.message || 'Notification',
    };
    setMessages((prev) => [...prev, notification]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== notification.id));
    }, payload?.duration || 4000);
  }, []);

  useEventBus('notify', handleNotification);

  if (!messages.length) {
    return null;
  }

  return (
    <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1050 }}>
      {messages.map((notification) => (
        <Alert key={notification.id} variant={notification.type}>
          {notification.message}
        </Alert>
      ))}
    </div>
  );
}

