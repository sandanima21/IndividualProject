import React, { useContext, useEffect, useRef, useState } from 'react';
import { StoreContext } from '../../context/StoreContext';
import { getMessages, sendMessage, sendMessageWithImage } from '../../service/chatservice';
import { toast } from 'react-toastify';
import './Chat.css';

const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const groupMessagesByDate = (messages) => {
  const groups = [];
  let currentKey = null;
  let currentGroup = null;
  messages.forEach(msg => {
    const key = new Date(msg.createdAt).toDateString();
    if (key !== currentKey) {
      currentKey = key;
      currentGroup = { dateLabel: formatDateLabel(msg.createdAt), messages: [] };
      groups.push(currentGroup);
    }
    currentGroup.messages.push(msg);
  });
  return groups;
};

const Chat = () => {
  const { user, token } = useContext(StoreContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const load = async () => {
    if (!user || !token) return;
    try {
      const data = await getMessages(user.id || 'me', token);
      setMessages(data);
      localStorage.setItem('kukihabun_chat_seen_at', new Date().toISOString());
    } catch {
      // No messages yet is fine
    }
  };

  useEffect(() => { load(); }, [user, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!text.trim() && !imageFile) return;
    setSending(true);
    try {
      let msg;
      if (imageFile) {
        msg = await sendMessageWithImage(imageFile, text.trim(), token);
        clearImage();
      } else {
        msg = await sendMessage(text.trim(), token);
      }
      setMessages(prev => [...prev, msg]);
      setText('');
      localStorage.setItem('kukihabun_chat_seen_at', new Date().toISOString());
    } catch {
      toast.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-lock fs-1 text-muted"></i>
        <p className="mt-3">Please sign in to chat with the shop owner.</p>
      </div>
    );
  }

  const groups = groupMessagesByDate(messages);

  return (
    <div className="chat-fullscreen">
      {/* Header */}
      <div className="chat-fs-header">
        <div className="d-flex align-items-center gap-3">
          <div className="chat-fs-avatar">
            <i className="bi bi-shop"></i>
          </div>
          <div>
            <div className="fw-semibold" style={{ color: 'var(--text)' }}>KukiHabun Shop Owner</div>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>For special &amp; custom orders</small>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-fs-messages">
        {messages.length === 0 && (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <i className="bi bi-chat-dots fs-1" style={{ color: 'rgba(201,168,76,0.3)' }}></i>
            <p className="mt-3 small">Start a conversation for special or bulk orders<br />(parties, events, gatherings)</p>
          </div>
        )}

        {groups.map((group, gi) => (
          <div key={gi}>
            {/* Date separator */}
            <div className="chat-date-separator">
              <span>{group.dateLabel}</span>
            </div>

            {group.messages.map(msg => (
              <div
                key={msg.id}
                className={`d-flex mb-2 ${msg.senderRole === 'CUSTOMER' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                {msg.senderRole !== 'CUSTOMER' && (
                  <div className="chat-fs-owner-icon me-2">
                    <i className="bi bi-shop"></i>
                  </div>
                )}
                <div className={`chat-bubble ${msg.senderRole === 'CUSTOMER' ? 'customer' : 'owner'}`}>
                  {msg.imageUrl && (
                    <a href={msg.imageUrl} target="_blank" rel="noreferrer">
                      <img
                        src={msg.imageUrl}
                        alt="shared"
                        style={{ maxWidth: 220, maxHeight: 180, borderRadius: 8, display: 'block', marginBottom: msg.content ? 6 : 0 }}
                      />
                    </a>
                  )}
                  {msg.content && <span>{msg.content}</span>}
                  <div className="chat-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-fs-input">
        {imagePreview && (
          <div className="d-flex align-items-center gap-2 mb-2 p-2 rounded" style={{ background: '#242424', border: '1px solid rgba(201,168,76,0.2)' }}>
            <img src={imagePreview} alt="preview" style={{ height: 44, borderRadius: 6, objectFit: 'cover' }} />
            <span className="small text-muted flex-fill">{imageFile?.name}</span>
            <button className="btn btn-sm btn-outline-danger" onClick={clearImage}>
              <i className="bi bi-x"></i>
            </button>
          </div>
        )}
        <div className="input-group">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            className="btn btn-outline-secondary"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            style={{ borderColor: 'rgba(201,168,76,0.2)', color: 'var(--gold)' }}
          >
            <i className="bi bi-image"></i>
          </button>
          <input
            type="text"
            className="form-control"
            placeholder={imageFile ? 'Add a caption (optional)...' : 'Message KukiHabun...'}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending || (!text.trim() && !imageFile)}
          >
            {sending
              ? <span className="spinner-border spinner-border-sm"></span>
              : <i className="bi bi-send-fill"></i>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
