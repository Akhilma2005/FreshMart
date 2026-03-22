import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import './About.css';

const team = [
  { name: 'Rajesh Kumar', role: 'Founder & CEO', emoji: '👨‍💼' },
  { name: 'Priya Sharma', role: 'Head of Operations', emoji: '👩‍💼' },
  { name: 'Amit Patel', role: 'Supply Chain Lead', emoji: '👨‍🌾' },
  { name: 'Sunita Rao', role: 'Customer Experience', emoji: '👩‍💻' },
];

const values = [
  { icon: '🌿', title: 'Farm Fresh', desc: 'Direct from farms to your table, ensuring maximum freshness and nutrition.' },
  { icon: '🤝', title: 'Farmer Support', desc: 'We partner with 500+ local farmers, ensuring fair prices and sustainable farming.' },
  { icon: '🚚', title: 'Fast Delivery', desc: 'Same-day delivery within 4 hours for orders placed before 2 PM.' },
  { icon: '♻️', title: 'Eco Friendly', desc: 'Biodegradable packaging and zero-waste commitment for a greener planet.' },
  { icon: '🔒', title: 'Safe & Secure', desc: 'Hygienic handling, cold chain logistics, and secure payment gateway.' },
  { icon: '💯', title: 'Quality First', desc: 'Every product passes our 10-point quality check before reaching you.' },
];

export default function About() {
  return (
    <div className="about-page">
      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero-content">
          <h1>About <span>FreshMart</span></h1>
          <p>India's most trusted online grocery platform — bringing farm-fresh produce, quality meats, aromatic spices, and cooking essentials right to your doorstep.</p>
          <Link to="/products" className="about-cta">Shop Now <FiArrowRight /></Link>
        </div>
        <div className="about-hero-emojis">
          {['🍎', '🥦', '🥩', '🌶️', '🥭', '🍗', '🧅', '🫙'].map((e, i) => (
            <span key={i} className="about-emoji" style={{ animationDelay: `${i * 0.2}s` }}>{e}</span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="about-stats">
        {[
          { num: '500+', label: 'Products', icon: '📦' },
          { num: '50,000+', label: 'Happy Customers', icon: '😊' },
          { num: '500+', label: 'Partner Farmers', icon: '👨‍🌾' },
          { num: '15+', label: 'Cities Served', icon: '🏙️' },
          { num: '4.8★', label: 'App Rating', icon: '⭐' },
          { num: '2 Hrs', label: 'Avg Delivery', icon: '🚚' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <span className="stat-icon">{s.icon}</span>
            <strong>{s.num}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      {/* Story */}
      <section className="about-story">
        <div className="story-content">
          <h2>Our Story</h2>
          <p>FreshMart was founded in 2020 with a simple mission: make fresh, healthy groceries accessible to every Indian household. We started with just 50 products and 3 delivery partners in Mumbai. Today, we serve 50,000+ families across 15 cities with 500+ products.</p>
          <p>We believe everyone deserves access to fresh, nutritious food at fair prices. By cutting out middlemen and working directly with farmers, we ensure you get the freshest produce while farmers earn better.</p>
        </div>
        <div className="story-visual">
          <div className="story-card">
            <span>🌱</span>
            <h3>2020</h3>
            <p>Founded in Mumbai</p>
          </div>
          <div className="story-card">
            <span>📈</span>
            <h3>2022</h3>
            <p>Expanded to 10 cities</p>
          </div>
          <div className="story-card">
            <span>🏆</span>
            <h3>2024</h3>
            <p>50K+ customers</p>
          </div>
          <div className="story-card">
            <span>🚀</span>
            <h3>2025</h3>
            <p>15 cities & growing</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="about-values">
        <h2>Why Choose FreshMart?</h2>
        <div className="values-grid">
          {values.map((v, i) => (
            <div className="value-card" key={i}>
              <span className="value-icon">{v.icon}</span>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="about-team">
        <h2>Meet Our Team</h2>
        <div className="team-grid">
          {team.map((m, i) => (
            <div className="team-card" key={i}>
              <div className="team-avatar">{m.emoji}</div>
              <h3>{m.name}</h3>
              <p>{m.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta-section">
        <h2>Ready to Shop Fresh? 🛒</h2>
        <p>Join 50,000+ happy customers and experience the FreshMart difference</p>
        <Link to="/products" className="about-cta big">Start Shopping <FiArrowRight /></Link>
      </section>
    </div>
  );
}
