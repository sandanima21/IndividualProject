import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import { getMessages } from '../../service/chatservice';
import './FloatingChat.css';

const SEEN_KEY = 'kukihabun_chat_seen_at';

const FloatingChat = () => {
  const { user, token } = useContext(StoreContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const isOnChat = location.pathname === '/chat';

  useEffect(() => {
    if (isOnChat) {
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
      setUnread(0);
    }
  }, [isOnChat]);

  useEffect(() => {
    if (!user || !token || isOnChat) return;

    const checkUnread = async () => {
      try {
        const messages = await getMessages(user.id || 'me', token);
        const seenAt = localStorage.getItem(SEEN_KEY);
        const ownerMessages = messages.filter(m => m.senderRole !== 'CUSTOMER');
        const unreadMsgs = seenAt
          ? ownerMessages.filter(m => new Date(m.createdAt) > new Date(seenAt))
          : ownerMessages;
        setUnread(unreadMsgs.length);
      } catch {
        // ignore
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => clearInterval(interval);
  }, [user, token, isOnChat]);

  if (!user || user.role === 'DELIVERY' || isOnChat) return null;

  return (
    <button
      className={`floating-chat-btn${unread > 0 ? ' has-new' : ''}`}
      onClick={() => navigate('/chat')}
      title="Chat with Shop Owner"
      aria-label="Chat with Shop Owner"
    >
      <i className="bi bi-chat-dots-fill"></i>
      {unread > 0 && (
        <span className="floating-chat-badge">{unread > 9 ? '9+' : unread}</span>
      )}
    </button>
  );
};

export default FloatingChat;
