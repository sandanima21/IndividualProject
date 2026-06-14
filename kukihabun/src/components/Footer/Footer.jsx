import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import { assets } from '../../assets/assets';

const MAP_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d990.3466391805888!2d80.03913846950536!3d6.844176631120501!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae2524481a277eb%3A0xf66b469e0caa1af4!2sPrix!5e0!3m2!1sen!2slk!4v1771172433108!5m2!1sen!2slk';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="kuki-footer">

      {/* ── Full-width Google Map ── */}
      <div className="kuki-footer-map">
        <iframe
          src={MAP_EMBED}
          title="KukiHabun Location"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* ── Main Footer ── */}
      <div className="kuki-footer-body">
        <div className="kuki-footer-gold-border" />

        <div className="container-fluid px-4 px-lg-5 py-5">
          <div className="row g-5">

            {/* ──────── Column 1: Information ──────── */}
            <div className="col-lg-4 col-md-6">
              <div className="kuki-footer-brand">
                <img src={assets.logo} alt="KukiHabun" width={52} height={52} style={{ borderRadius: 10 }} />
                <span className="kuki-footer-brand-name">KukiHabun</span>
              </div>
              <p className="kuki-footer-tagline">
                Sri Lanka's finest flavours, crafted with passion, tradition, and the warmest hospitality.
              </p>

              <div className="mt-4">
                <p className="kuki-footer-heading">Information</p>
                <ul className="kuki-footer-links">
                  <li><Link to="/">Home</Link></li>
                  <li><Link to="/explore">Menu &amp; Order Online</Link></li>
                  <li><a href="#about">About Us</a></li>
                  <li><Link to="/terms">Terms &amp; Conditions</Link></li>
                  <li><Link to="/privacy">Privacy Policy</Link></li>
                </ul>
              </div>
            </div>

            {/* ──────── Column 2: Get In Touch ──────── */}
            <div className="col-lg-4 col-md-6">
              <p className="kuki-footer-heading">Get In Touch</p>
              <div className="kuki-contact-list">

                <div className="kuki-contact-row">
                  <div className="kuki-contact-icon"><i className="bi bi-clock-fill"></i></div>
                  <div className="kuki-contact-text">
                    <div className="kuki-contact-label">Opening Hours</div>
                    <div className="kuki-contact-value">
                      Every Day &nbsp;·&nbsp; 4:00 PM – 10:30 PM
                    </div>
                  </div>
                </div>

                <div className="kuki-contact-row">
                  <div className="kuki-contact-icon"><i className="bi bi-geo-alt-fill"></i></div>
                  <div className="kuki-contact-text">
                    <div className="kuki-contact-label">Address</div>
                    <div className="kuki-contact-value">
                      No. 45/2, Colombo–Ratnapura Road,<br />
                      Meegoda, Sri Lanka
                    </div>
                  </div>
                </div>

                <div className="kuki-contact-row">
                  <div className="kuki-contact-icon"><i className="bi bi-telephone-fill"></i></div>
                  <div className="kuki-contact-text">
                    <div className="kuki-contact-label">Phone</div>
                    <div className="kuki-contact-value">
                      <a href="tel:+94115678989">+94 115 678 989</a><br />
                      <a href="tel:+94777123456">+94 777 123 456</a>
                    </div>
                  </div>
                </div>

                <div className="kuki-contact-row">
                  <div className="kuki-contact-icon"><i className="bi bi-envelope-fill"></i></div>
                  <div className="kuki-contact-text">
                    <div className="kuki-contact-label">Email</div>
                    <div className="kuki-contact-value">
                      <a href="mailto:kukihabun@gmail.com">kukihabun@gmail.com</a>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ──────── Column 3: Social & Payments ──────── */}
            <div className="col-lg-4 col-md-12">
              <p className="kuki-footer-heading">Follow Us</p>
              <div className="kuki-social-grid">
                <a href="https://facebook.com/kukihabun" target="_blank" rel="noreferrer" className="kuki-social-btn fb">
                  <i className="bi bi-facebook"></i><span>Facebook</span>
                </a>
                <a href="https://instagram.com/kukihabun" target="_blank" rel="noreferrer" className="kuki-social-btn ig">
                  <i className="bi bi-instagram"></i><span>Instagram</span>
                </a>
                <a href="https://tiktok.com/@kukihabun" target="_blank" rel="noreferrer" className="kuki-social-btn tt">
                  <i className="bi bi-tiktok"></i><span>TikTok</span>
                </a>
                <a href="https://wa.me/94777123456" target="_blank" rel="noreferrer" className="kuki-social-btn wa">
                  <i className="bi bi-whatsapp"></i><span>WhatsApp</span>
                </a>
              </div>

              <p className="kuki-footer-heading">We Accept</p>
              <div className="kuki-pay-row">
                <span className="kuki-pay-badge visa">VISA</span>
                <span className="kuki-pay-badge mc">Mastercard</span>
                <span className="kuki-pay-badge stripe">Stripe</span>
                <span className="kuki-pay-badge cash">Cash</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Bottom copyright bar ── */}
      <div className="kuki-footer-divider" />
      <div className="kuki-footer-bottom">
        <div className="container-fluid px-4 px-lg-5">
          <div className="kuki-footer-bottom-inner">
            <span>© {year} KukiHabun. All Rights Reserved.</span>
            <span>
              Crafted with care &nbsp;·&nbsp;
              <a href="https://github.com/sandanima21" target="_blank" rel="noreferrer">sandanima21</a>
            </span>
          </div>
          <p className="kuki-footer-recaptcha">
            Protected by reCAPTCHA — Google{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
            {' '}and{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms of Service</a>
            {' '}apply.
          </p>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
