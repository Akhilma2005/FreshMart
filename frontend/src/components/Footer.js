import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">

      {/* Trust bar */}
      <div className="footer-top">
        <div className="footer-top-inner">
          {[
            ['🚚','Free Delivery','on orders ₹499+'],
            ['✅','100% Fresh','farm to table'],
            ['🔒','Secure Payment','256-bit SSL'],
            ['↩️','Easy Returns','7-day policy'],
            ['⭐','4.8 Rated','50K+ reviews'],
            ['📞','24/7 Support','+91 98765 43210'],
          ].map(([icon, title, sub]) => (
            <div className="footer-top-item" key={title}>
              <span>{icon}</span>
              <div><strong>{title}</strong> — {sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="footer-container">
        {/* Brand */}
        <div className="footer-brand">
          <div className="footer-logo">🛒 Fresh<span>Mart</span></div>
          <p>India's most trusted online grocery platform. Farm-fresh produce, quality meats, aromatic spices & cooking essentials delivered to your doorstep.</p>
          <div className="footer-badges">
            <span>🌿 Organic</span>
            <span>🚚 Fast Delivery</span>
            <span>🔒 Secure</span>
            <span>✅ FSSAI Certified</span>
          </div>
          <div className="footer-social">
            {['📘','📸','🐦','▶️'].map((s,i) => <div className="social-btn" key={i}>{s}</div>)}
          </div>
        </div>

        {/* Links */}
        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/products">All Products</Link></li>
            <li><Link to="/categories">Categories</Link></li>
            <li><Link to="/cart">My Cart</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/login">Login / Register</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Categories</h4>
          <ul>
            <li><Link to="/products?cat=Fruits">🍎 Fruits</Link></li>
            <li><Link to="/products?cat=Vegetables">🥦 Vegetables</Link></li>
            <li><Link to="/products?cat=Chicken">🍗 Chicken</Link></li>
            <li><Link to="/products?cat=Mutton & Meat">🥩 Mutton & Meat</Link></li>
            <li><Link to="/products?cat=Masalas & Spices">🌶️ Masalas</Link></li>
            <li><Link to="/products?cat=Cooking Items">🫙 Cooking Items</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Customer Care</h4>
          <ul>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">Track Order</a></li>
            <li><a href="#">Return Policy</a></li>
            <li><a href="#">Cancellation</a></li>
            <li><a href="#">Payment Options</a></li>
            <li><a href="#">Bulk Orders</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Contact Us</h4>
          <ul>
            <li>📞 +91 98765 43210</li>
            <li>📧 support@freshmart.in</li>
            <li>📍 Mumbai, Maharashtra</li>
            <li>🕐 Mon–Sun: 6AM–10PM</li>
            <li>🏢 FreshMart Pvt. Ltd.</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2025 FreshMart Pvt. Ltd. All rights reserved. Made with ❤️ in India</p>
        <div className="footer-bottom-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Cookie Policy</a>
          <a href="#">Sitemap</a>
        </div>
      </div>
    </footer>
  );
}
