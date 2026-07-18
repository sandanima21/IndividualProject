import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const HOURS = [
  { day: 'Every Day', time: '10:00 AM – 10:30 PM' },
  { day: 'Last Order', time: 'By 10:30 PM' },
  { day: 'Closed', time: 'Before 10:00 AM' },
];

const ATMOSPHERE_IMGS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&q=80',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600&q=80',
  'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=600&q=80',
  'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=600&q=80',
];

const FUN_FACTS = [
  { icon: 'bi-fire', text: 'Our special sambol recipe has been passed down through 3 generations' },
  { icon: 'bi-heart-fill', text: 'Every kottu is hand-chopped to order — never pre-made' },
  { icon: 'bi-leaf', text: 'We source fresh vegetables from local Meegoda farmers daily' },
  { icon: 'bi-trophy-fill', text: 'Voted "Best Sri Lankan Restaurant — Western Province" 2023' },
  { icon: 'bi-clock-history', text: 'Our watalappam takes 4 hours to prepare the traditional way' },
  { icon: 'bi-people-fill', text: 'Family-run since 2015 — every dish made with homemade love' },
];

const Section = ({ id, title, icon, children }) => (
  <section id={id} className="py-5" style={{ borderBottom: '1px solid var(--border)' }}>
    <div className="container">
      <h2 className="fw-bold mb-4 d-flex align-items-center gap-3">
        <span style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(201,168,76,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`bi ${icon}`} style={{ color: 'var(--gold)' }}></i>
        </span>
        {title}
      </h2>
      {children}
    </div>
  </section>
);

const AboutUs = () => {
  const [lightbox, setLightbox] = useState(null);

  return (
    <div style={{ background: 'var(--black)', minHeight: '100vh' }}>

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1208 50%, #0c0c0c 100%)',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        padding: '4rem 0 3rem',
        textAlign: 'center',
      }}>
        <div className="container">
          <p className="text-uppercase fw-semibold mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.18em', fontSize: '0.78rem' }}>Our Story</p>
          <h1 className="display-4 fw-bold mb-3">About <span className="text-shimmer">KukiHabun</span></h1>
          <p className="lead" style={{ color: 'rgba(240,236,224,0.65)', maxWidth: 600, margin: '0 auto' }}>
            A family kitchen that grew into a landmark. Every meal carries the warmth of Sri Lankan tradition.
          </p>
        </div>
      </div>

      {/* Night restaurant badge */}
      <div className="text-center py-3" style={{ background: 'rgba(201,168,76,0.06)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
        <span style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 50, padding: '6px 20px', color: 'var(--gold)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.12em' }}>
          <i className="bi bi-sun-fill me-2"></i>Open Daily · 10:00 AM – 10:30 PM
        </span>
      </div>

      {/* ── Shop Story ── */}
      <Section id="story" title="Our Story" icon="bi-book-half">
        <div className="row g-5 align-items-center">
          <div className="col-lg-6">
            <img
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&q=80"
              alt="KukiHabun kitchen"
              className="img-fluid rounded-4 w-100"
              style={{ border: '1px solid rgba(201,168,76,0.15)', maxHeight: 380, objectFit: 'cover' }}
            />
          </div>
          <div className="col-lg-6">
            <p className="lead mb-4" style={{ color: 'rgba(240,236,224,0.85)' }}>
              KukiHabun began its journey in 2017 with a simple mission — bringing joy to people through delicious food and warm hospitality.
            </p>
            <p style={{ color: 'rgba(240,236,224,0.65)', lineHeight: 1.9 }}>
              What started as a small family-run restaurant with nothing more than a notebook, a pen, and a passion for cooking has steadily grown through dedication, hard work, and the support of our loyal customers. Every order was handwritten, every customer was greeted personally, and every meal was prepared with care.
            </p>
            <p style={{ color: 'rgba(240,236,224,0.65)', lineHeight: 1.9 }}>
              As our community grew, so did our vision. In 2025, KukiHabun expanded into a medium-sized restaurant, allowing us to serve more customers while maintaining the authentic taste and quality that made us special from the beginning.
            </p>
            <p style={{ color: 'rgba(240,236,224,0.65)', lineHeight: 1.9 }}>
              At KukiHabun, we believe food is more than just something to eat. It brings people together, creates memories, celebrates special moments, and spreads happiness. Our goal is not simply to serve meals — we aim to create experiences that leave our customers smiling.
            </p>
            <p style={{ color: 'rgba(240,236,224,0.65)', lineHeight: 1.9 }}>
              Today, we continue to embrace innovation while staying true to our roots. From managing orders with a simple book and pen, we have evolved into a modern digital ordering and delivery system that makes enjoying KukiHabun easier than ever. As we continue to grow, our promise remains the same: fresh food, genuine service, and unforgettable moments shared around every table.
            </p>

            {/* Stats */}
            <div className="row g-3 mt-2">
              {[
                { num: '2017', label: 'Founded' },
                { num: '9+', label: 'Years Growing' },
                { num: '50+', label: 'Menu Items' },
                { num: 'Growing Daily', label: 'Serving More Customers Every Year' },
              ].map(({ num, label }) => (
                <div key={label} className="col-6">
                  <div className="p-3 rounded-3 text-center" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
                    <div className="fw-bold fs-5 mb-1" style={{ color: 'var(--gold)' }}>{num}</div>
                    <div className="small" style={{ color: 'rgba(240,236,224,0.5)', lineHeight: 1.3 }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Opening Hours ── */}
      <Section id="hours" title="Opening Hours" icon="bi-clock-fill">
        <div className="row g-4">
          {HOURS.map(h => (
            <div key={h.day} className="col-md-4">
              <div className="card h-100 text-center p-4" style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)' }}>
                <i className="bi bi-calendar3 fs-3 mb-3" style={{ color: 'var(--gold)' }}></i>
                <div className="fw-semibold mb-1">{h.day}</div>
                <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1.1rem' }}>{h.time}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted small mt-3">
          <i className="bi bi-info-circle me-1"></i>
          Last orders accepted 30 minutes before closing. Kitchen may close earlier on special occasions.
        </p>
      </Section>

      {/* ── Delivery Information ── */}
      <Section id="delivery" title="Delivery Information" icon="bi-truck">
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card p-4 h-100" style={{ background: 'rgba(74,158,255,0.04)', border: '1px solid rgba(74,158,255,0.15)' }}>
              <h5 className="fw-bold mb-4"><i className="bi bi-geo-alt-fill me-2" style={{ color: '#4a9eff' }}></i>Delivery Area & Fees</h5>
              <div className="d-flex flex-column gap-2">
                {[
                  ['Up to 1 km', 'Rs. 100'],
                  ['2 km', 'Rs. 150'],
                  ['3 km', 'Rs. 200'],
                  ['4 km', 'Rs. 250'],
                  ['5 km', 'Rs. 300'],
                ].map(([dist, fee]) => (
                  <div key={dist} className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'rgba(240,236,224,0.7)' }}>{dist}</span>
                    <span className="fw-semibold" style={{ color: '#4a9eff' }}>{fee}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted small mt-3 mb-0">
                Fee increases by Rs. 50 per additional km beyond 1 km.
              </p>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card p-4 h-100" style={{ background: 'rgba(62,207,142,0.04)', border: '1px solid rgba(62,207,142,0.15)' }}>
              <h5 className="fw-bold mb-4"><i className="bi bi-info-circle-fill me-2" style={{ color: '#3ecf8e' }}></i>Delivery Details</h5>
              {[
                ['bi-clock', 'Estimated Time', '30–45 minutes depending on distance and order volume'],
                ['bi-geo', 'Coverage', 'We currently deliver within Colombo'],
                ['bi-credit-card', 'Payment', 'Pay securely online via PayHere before delivery'],
                ['bi-telephone', 'Phone Required', 'Valid mobile number needed for delivery coordination'],
                ['bi-pin-map', 'Pinpoint Location', 'Use the map in checkout to pin your exact delivery spot'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="d-flex gap-3 mb-3">
                  <div style={{ width: 32, flexShrink: 0, marginTop: 2 }}>
                    <i className={`bi ${icon}`} style={{ color: '#3ecf8e' }}></i>
                  </div>
                  <div>
                    <div className="fw-semibold small">{title}</div>
                    <div className="text-muted small">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Refund Policy ── */}
      <Section id="refund" title="Refund Policy" icon="bi-arrow-counterclockwise">
        <div className="row g-4">
          {[
            { icon: 'bi-check-circle-fill', color: '#3ecf8e', title: 'Full Refund', desc: 'Cancel within 15 minutes of placing your order for a full refund. Refunds are processed within 3–5 business days to your original payment method.' },
            { icon: 'bi-exclamation-triangle-fill', color: '#ffc107', title: 'Wrong or Missing Items', desc: 'Contact us within 1 hour of delivery if items are missing or incorrect. We will redeliver or issue a partial refund at our discretion.' },
            { icon: 'bi-x-circle-fill', color: '#f47373', title: 'No Refund After Cooking', desc: 'Once an order moves to "Preparing" status, cancellations and refunds are no longer available as ingredients have been committed.' },
          ].map(p => (
            <div key={p.title} className="col-md-4">
              <div className="card p-4 h-100">
                <i className={`bi ${p.icon} fs-3 mb-3`} style={{ color: p.color }}></i>
                <h6 className="fw-bold mb-2">{p.title}</h6>
                <p className="text-muted small mb-0">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <p className="text-muted small">
            For refund queries, reach us at <a href="mailto:kukihabun@gmail.com" style={{ color: 'var(--gold)' }}>kukihabun@gmail.com</a> or
            call <a href="tel:+94777123456" style={{ color: 'var(--gold)' }}>+94 777 123 456</a>. ·
            See also <Link to="/terms" style={{ color: 'var(--gold)' }}>Terms & Conditions</Link> and <Link to="/privacy" style={{ color: 'var(--gold)' }}>Privacy Policy</Link>.
          </p>
        </div>
      </Section>

      {/* ── Terms & Policies Summary ── */}
      <Section id="policies" title="Terms & Policies" icon="bi-file-earmark-text">
        <div className="row g-4">
          {[
            { title: 'Ordering', points: ['Minimum order: Rs. 200', 'Orders confirmed only after successful payment', 'Menu prices inclusive of all taxes', 'We reserve the right to refuse service'] },
            { title: 'Privacy', points: ['Personal data used solely for order processing', 'We never sell your data to third parties', 'Google sign-in data limited to profile basics', 'Data deleted on account removal request'] },
            { title: 'Food & Allergens', points: ['All items prepared in a shared kitchen', 'Possible cross-contamination with nuts, gluten, dairy', 'Custom requests handled on best-effort basis', 'Notify us of severe allergies before ordering'] },
          ].map(section => (
            <div key={section.title} className="col-md-4">
              <div className="card p-4 h-100">
                <h6 className="fw-bold mb-3" style={{ color: 'var(--gold)' }}>{section.title}</h6>
                <ul className="list-unstyled mb-0">
                  {section.points.map(p => (
                    <li key={p} className="d-flex gap-2 mb-2 text-muted small">
                      <i className="bi bi-dot fs-5" style={{ color: 'var(--gold)', flexShrink: 0, marginTop: -4 }}></i>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 small text-muted">
          Full details: <Link to="/terms" style={{ color: 'var(--gold)' }}>Terms of Service</Link> · <Link to="/privacy" style={{ color: 'var(--gold)' }}>Privacy Policy</Link>
        </p>
      </Section>

      {/* ── Fun Facts ── */}
      <Section id="fun" title="Did You Know?" icon="bi-lightbulb-fill">
        <div className="row g-3">
          {FUN_FACTS.map(f => (
            <div key={f.text} className="col-md-6 col-lg-4">
              <div className="d-flex gap-3 p-3 rounded-3" style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi ${f.icon}`} style={{ color: 'var(--gold)' }}></i>
                </div>
                <p className="mb-0 small" style={{ color: 'rgba(240,236,224,0.75)', lineHeight: 1.6 }}>{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Atmosphere Gallery ── */}
      <Section id="gallery" title="Our Atmosphere" icon="bi-images">
        <div className="row g-3">
          {ATMOSPHERE_IMGS.map((src, i) => (
            <div key={i} className="col-6 col-md-4">
              <div
                style={{ borderRadius: 12, overflow: 'hidden', cursor: 'zoom-in', border: '1px solid rgba(201,168,76,0.1)', aspectRatio: '4/3' }}
                onClick={() => setLightbox(src)}
              >
                <img
                  src={src}
                  alt={`KukiHabun atmosphere ${i + 1}`}
                  className="w-100 h-100"
                  style={{ objectFit: 'cover', transition: 'transform 0.35s', display: 'block' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Gallery" style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 12, objectFit: 'contain' }} />
          <button onClick={() => setLightbox(null)}
            style={{ position: 'fixed', top: 20, right: 24, background: 'none', border: 'none', color: '#fff', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 }}>
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default AboutUs;
