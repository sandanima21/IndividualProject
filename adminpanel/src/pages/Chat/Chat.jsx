import React, { useEffect, useRef, useState } from 'react';
import { getConversations, getMessages, markConversationRead, replyMessage, replyWithImage } from '../../services/chatService';
import { toast } from 'react-toastify';
import './Chat.css';

const LAST_VISIT_KEY = 'admin_chat_last_visit';

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const chatBodyRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch {
      toast.error('Failed to load conversations.');
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const data = await getMessages(conversationId);
      setMessages(data);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    // Mark visit time immediately so sidebar badge clears as soon as admin opens chat
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    loadConversations();
    const poll = setInterval(loadConversations, 30_000);
    return () => {
      clearInterval(poll);
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    };
  }, []);

  // Scroll the message body to bottom whenever messages change
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSelect = (conv) => {
    setSelected(conv);
    loadMessages(conv.conversationId);
    setImageFile(null);
    setImagePreview(null);
    setText('');
    setConversations(prev =>
      prev.map(c => c.conversationId === conv.conversationId ? { ...c, unreadCount: 0 } : c)
    );
    markConversationRead(conv.conversationId).catch(() => {});
  };

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
    if ((!text.trim() && !imageFile) || !selected) return;
    setSending(true);
    try {
      let msg;
      if (imageFile) {
        msg = await replyWithImage(selected.conversationId, imageFile, text.trim());
        clearImage();
      } else {
        msg = await replyMessage(selected.conversationId, text.trim());
      }
      setMessages(prev => [...prev, msg]);
      setText('');
      loadConversations();
    } catch {
      toast.error('Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="py-4 px-3">
      <h4 className="mb-4 fw-bold">Customer Chats</h4>
      {/* Fixed-height container prevents page-level scroll bleed */}
      <div className="row" style={{ height: '72vh', overflow: 'hidden' }}>

        {/* Conversation list — scrolls independently */}
        <div className="col-md-4" style={{ borderRight: '1px solid rgba(201,168,76,0.15)', height: '100%', overflowY: 'auto' }}>
          {conversations.length === 0 && (
            <p className="text-muted p-3">No conversations yet.</p>
          )}
          {conversations.map(conv => {
            const hasUnread = conv.unreadCount > 0;
            return (
              <div
                key={conv.conversationId}
                className={`conv-item p-3 ${selected?.conversationId === conv.conversationId ? 'conv-active' : ''}`}
                onClick={() => handleSelect(conv)}
                style={{ cursor: 'pointer', borderBottom: '1px solid rgba(201,168,76,0.08)' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: 'linear-gradient(135deg,rgba(201,168,76,0.3),rgba(201,168,76,0.1))',
                      border: '1px solid rgba(201,168,76,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold)',
                    }}>
                      {conv.customerName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    {hasUnread && (
                      <span style={{
                        position: 'absolute', top: -2, right: -2,
                        background: '#3ecf8e', color: '#000',
                        borderRadius: '50%', fontSize: '0.55rem', fontWeight: 700,
                        minWidth: 16, height: 16, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', padding: '0 3px', lineHeight: 1,
                        border: '1.5px solid var(--sidebar-bg, #1a1a1a)',
                      }}>
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-fill min-w-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className={`small ${hasUnread ? 'fw-bold' : 'fw-semibold'}`}
                        style={hasUnread ? { color: '#fff' } : {}}>
                        {conv.customerName}
                      </span>
                      <small className="text-muted" style={{ fontSize: '0.62rem' }}>
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                    <small
                      className="text-truncate d-block"
                      style={{ maxWidth: 170, fontSize: '0.75rem', color: hasUnread ? 'rgba(255,255,255,0.75)' : undefined, fontWeight: hasUnread ? 500 : undefined }}
                    >
                      {conv.lastMessage}
                    </small>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message area — scrolls independently, min-height:0 prevents flex overflow */}
        <div className="col-md-8 d-flex flex-column ps-3" style={{ height: '100%', minHeight: 0 }}>
          {!selected ? (
            <div className="flex-fill d-flex align-items-center justify-content-center text-muted">
              <div className="text-center">
                <i className="bi bi-chat-left-dots" style={{ fontSize: '2.5rem', color: 'rgba(201,168,76,0.3)' }}></i>
                <p className="mt-2 small">Select a conversation to reply</p>
              </div>
            </div>
          ) : (
            <>
              <div className="pb-2 mb-2 fw-semibold d-flex align-items-center gap-2"
                style={{ borderBottom: '1px solid rgba(201,168,76,0.15)', flexShrink: 0 }}>
                <i className="bi bi-person-circle" style={{ color: 'var(--gold)' }}></i>
                {selected.customerName}
              </div>
              {/* min-height:0 + overflow-y:auto for scroll isolation; ref used for direct scrollTop (avoids scrollIntoView bleeding to page) */}
              <div ref={chatBodyRef} className="flex-fill admin-chat-body" style={{ overflowY: 'auto', minHeight: 0 }}>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`d-flex mb-3 ${msg.senderRole === 'OWNER' ? 'justify-content-end' : 'justify-content-start'}`}
                  >
                    <div className={`chat-bubble ${msg.senderRole === 'OWNER' ? 'owner' : 'customer'}`}>
                      <div className="chat-sender mb-1">
                        {msg.senderRole === 'OWNER' ? 'You (Shop Owner)' : msg.senderName}
                      </div>
                      {msg.imageUrl && (
                        <a href={msg.imageUrl} target="_blank" rel="noreferrer">
                          <img
                            src={msg.imageUrl}
                            alt="shared"
                            style={{ maxWidth: 200, maxHeight: 180, borderRadius: 8, display: 'block', marginBottom: msg.content ? 6 : 0 }}
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

              {imagePreview && (
                <div className="d-flex align-items-center gap-2 mb-2 p-2 rounded" style={{ background: '#1e1e1e', border: '1px solid rgba(201,168,76,0.2)', flexShrink: 0 }}>
                  <img src={imagePreview} alt="preview" style={{ height: 52, borderRadius: 6, objectFit: 'cover' }} />
                  <span className="small text-muted flex-fill">{imageFile?.name}</span>
                  <button className="btn btn-sm btn-outline-danger" onClick={clearImage}>
                    <i className="bi bi-x"></i>
                  </button>
                </div>
              )}

              <div className="input-group mt-1" style={{ flexShrink: 0 }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                <button className="btn btn-outline-secondary" onClick={() => fileInputRef.current?.click()}
                  title="Attach image" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
                  <i className="bi bi-image"></i>
                </button>
                <input
                  type="text"
                  className="form-control"
                  placeholder={imageFile ? 'Add a caption (optional)...' : 'Type your reply...'}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                />
                <button className="btn btn-primary" onClick={handleSend}
                  disabled={sending || (!text.trim() && !imageFile)}>
                  {sending ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-send-fill"></i>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
