import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';

const Contact = ({ embedded = false, onChatClick }) => {
  const navigate = useNavigate();
  const { user } = useContext(StoreContext);

  const handleChatClick = () => {
    if (onChatClick) { onChatClick(); return; }
    if (!user) { navigate('/signin'); return; }
    navigate('/chat');
  };

  const content = (
    <>
      <div className="row g-4">
        <div className="col-lg-6">
          <div style={{ height: '100%', minHeight: 300, position: 'relative', cursor: 'pointer' }}
            onClick={() => window.open('https://maps.app.goo.gl/3zFt7sefzHnuajRs6', '_blank')}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d990.3466391805888!2d80.03913846950536!3d6.844176631120501!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae2524481a277eb%3A0xf66b469e0caa1af4!2sPrix!5e0!3m2!1sen!2slk!4v1771172433108!5m2!1sen!2slk"
              width="100%" height="100%" style={{ border: 0, pointerEvents: 'none', borderRadius: 12, minHeight: 280 }}
              allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
        <div className="col-lg-6 d-flex align-items-center">
          <div className="w-100">
            <h4 className="fw-bold mb-4">Get in Touch</h4>
            {[
              { icon: 'bi-telephone-fill', label: 'Phone', val: '+94 115 678 989', href: 'tel:+94115678989' },
              { icon: 'bi-envelope-fill',  label: 'Email', val: 'kukihabun@gmail.com', href: 'mailto:kukihabun@gmail.com' },
              { icon: 'bi-instagram',      label: 'Instagram', val: '@kukihabun', href: 'https://instagram.com/kukihabun' },
              { icon: 'bi-facebook',       label: 'Facebook',  val: 'Kuki Habun',    href: 'https://facebook.com/kukihabun' },
            ].map(item => (
              <div key={item.label} className="d-flex align-items-center gap-3 mb-4">
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`bi ${item.icon} fs-5`} style={{ color: 'var(--gold)' }}></i>
                </div>
                <div>
                  <div className="text-muted small">{item.label}</div>
                  <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                    className="fw-semibold text-decoration-none" style={{ color: 'var(--text)' }}>{item.val}</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating chat button */}
      <div className="chat-float-wrap">
        <button className="chat-float-btn" onClick={handleChatClick}>
          <i className="bi bi-chat-dots-fill fs-5"></i>
          <span className="chat-float-tooltip">Chat with the Shop Owner</span>
        </button>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="container py-5">
        <h2 className="text-center mb-5">Contact Us</h2>
        {content}
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ position: 'relative' }}>
      <h2 className="text-center mb-5">Contact Us</h2>
      {content}
    </div>
  );
};

export default Contact;
