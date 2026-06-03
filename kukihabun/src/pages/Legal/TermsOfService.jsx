import React from 'react';

const Section = ({ title, children }) => (
  <div className="mb-4">
    <h5 className="text-gold fw-bold mb-2">{title}</h5>
    <div style={{ color: 'rgba(240,236,224,0.75)', lineHeight: 1.8 }}>{children}</div>
  </div>
);

const TermsOfService = () => (
  <div className="container py-5" style={{ maxWidth: 800 }}>
    <div className="text-center mb-5">
      <p className="explore-label">Legal</p>
      <h1 className="fw-bold" style={{ color: '#f0ece0' }}>Terms of Service</h1>
      <p style={{ color: 'var(--text-muted)' }}>Last updated: May 2026</p>
    </div>

    <div className="card p-4 p-md-5">
      <Section title="1. Acceptance of Terms">
        By accessing or using KukiHabun ("Service"), you agree to be bound by these Terms of Service.
        If you do not agree, please do not use the Service.
      </Section>

      <Section title="2. Use of Service">
        KukiHabun provides an online food ordering platform. You must be 18 years or older to place orders.
        You are responsible for maintaining the confidentiality of your account credentials.
      </Section>

      <Section title="3. Orders and Payment">
        <ul>
          <li>All prices are in Sri Lankan Rupees (LKR) and include applicable taxes.</li>
          <li>Orders are confirmed once payment is successfully processed via PayHere.</li>
          <li>Delivery fees are calculated based on distance from our location.</li>
          <li>You may cancel an order within <strong>15 minutes</strong> of payment for a full refund.</li>
        </ul>
      </Section>

      <Section title="4. Cancellations and Refunds">
        Customers may cancel orders within 15 minutes of payment. Refunds will be processed within 3–5
        business days to the original payment method. No cancellations are permitted once preparation has begun.
      </Section>

      <Section title="5. Delivery">
        We aim to deliver within 30–45 minutes. Delivery times may vary based on distance, traffic, and
        order volume. Real-time tracking is available for delivery orders.
      </Section>

      <Section title="6. Prohibited Conduct">
        You may not use the Service for fraudulent purposes, place fake orders, misuse the chat feature,
        or attempt to interfere with the platform's operation.
      </Section>

      <Section title="7. Intellectual Property">
        All content on KukiHabun, including logos, images, and text, is owned by KukiHabun and protected
        by copyright law.
      </Section>

      <Section title="8. Limitation of Liability">
        KukiHabun is not liable for delays caused by circumstances beyond our control (weather, traffic, etc.).
        Our liability is limited to the value of the order placed.
      </Section>

      <Section title="9. Changes to Terms">
        We reserve the right to update these terms. Continued use after changes constitutes acceptance.
      </Section>

      <Section title="10. Contact">
        <p>KukiHabun | Email: <a href="mailto:kukihabun@gmail.com" className="text-gold">kukihabun@gmail.com</a><br />
        Phone: +94115678989</p>
      </Section>
    </div>
  </div>
);

export default TermsOfService;
