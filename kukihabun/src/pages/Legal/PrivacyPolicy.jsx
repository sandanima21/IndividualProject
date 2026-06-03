import React from 'react';

const Section = ({ title, children }) => (
  <div className="mb-4">
    <h5 className="text-gold fw-bold mb-2">{title}</h5>
    <div style={{ color: 'rgba(240,236,224,0.75)', lineHeight: 1.8 }}>{children}</div>
  </div>
);

const PrivacyPolicy = () => (
  <div className="container py-5" style={{ maxWidth: 800 }}>
    <div className="text-center mb-5">
      <p className="explore-label">Legal</p>
      <h1 className="fw-bold" style={{ color: '#f0ece0' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-muted)' }}>Last updated: May 2026</p>
    </div>

    <div className="card p-4 p-md-5">
      <Section title="1. Information We Collect">
        We collect information you provide when signing up (name, email, Google account data), placing orders
        (delivery address, phone number, payment info), and using our chat feature. We also collect usage data
        such as browser type, pages visited, and interaction data to improve our services.
      </Section>

      <Section title="2. How We Use Your Information">
        Your information is used to process orders, deliver food, send order status updates, provide customer
        support, process payments securely via PayHere, and improve our platform. We do not sell your personal
        data to third parties.
      </Section>

      <Section title="3. Payment Information">
        Payments are processed securely by <strong className="text-gold">PayHere</strong>, a PCI-DSS compliant
        payment gateway. KukiHabun does not store your credit/debit card details. PayHere's own privacy policy
        governs the handling of your payment data.
      </Section>

      <Section title="4. Data Sharing">
        We share your delivery address and contact number with our delivery personnel solely for fulfilling your
        order. We use AWS S3 for image storage. No other third-party sharing occurs without your consent.
      </Section>

      <Section title="5. Data Retention">
        Your account data is retained while your account is active. Order history is kept for 2 years for
        accounting purposes. You may request deletion of your data by contacting us.
      </Section>

      <Section title="6. Cookies">
        We use localStorage to remember your session and cart. No third-party tracking cookies are used.
      </Section>

      <Section title="7. Your Rights">
        You have the right to access, correct, or delete your personal data. Contact us at{' '}
        <a href="mailto:kukihabun@gmail.com" className="text-gold">kukihabun@gmail.com</a> to exercise these rights.
      </Section>

      <Section title="8. Changes to This Policy">
        We may update this policy periodically. Continued use of the service after changes constitutes acceptance.
      </Section>

      <Section title="9. Contact">
        <p>KukiHabun<br />
        Phone: +94115678989<br />
        Email: <a href="mailto:kukihabun@gmail.com" className="text-gold">kukihabun@gmail.com</a></p>
      </Section>
    </div>
  </div>
);

export default PrivacyPolicy;
