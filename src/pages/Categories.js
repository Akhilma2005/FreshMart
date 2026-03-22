import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { SocketContext } from '../App';
import { FiArrowRight } from 'react-icons/fi';
import MiniCard from '../components/MiniCard';
import useFrontCategories from '../hooks/useFrontCategories';
import API from '../api';
import './Categories.css';

export default function Categories() {
  const socket = useContext(SocketContext);
  const categories = useFrontCategories();
  const [apiProducts, setApiProducts] = useState([]);

  const fetchProducts = () => {
    fetch(`${API}/products`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setApiProducts(data.map(p => {
        let img = p.image;
        if (img && img.startsWith('/uploads/')) img = `http://localhost:5000${img}`;
        return { ...p, image: img };
      })))
      .catch(() => {});
  };

  useEffect(() => {
    fetchProducts();
    socket.on('products:updated', fetchProducts);
    return () => socket.off('products:updated', fetchProducts);
  }, []); // eslint-disable-line

  const handleCatClick = (key) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="categories-page">
      <div className="cat-hero">
        <h1>🏪 All Categories</h1>
        <p>Explore our wide range of fresh groceries and cooking essentials</p>
      </div>

      {/* ── Category icon strip ── */}
      <div className="cat-icon-strip">
        <div className="cat-icon-strip-inner">
          {categories.map(cat => {
            const key = cat._id || cat.id;
            return (
              <button key={key} className="cat-icon-btn" onClick={() => handleCatClick(key)}>
                <div className="cat-icon-circle" style={{ background: cat.bg, borderColor: cat.color }}>
                  {cat.image
                    ? <img src={cat.image.startsWith('http') ? cat.image : `http://localhost:5000${cat.image}`}
                        alt={cat.name}
                        onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                    : null}
                  <span style={{ display: cat.image ? 'none' : 'block' }}>{cat.icon}</span>
                </div>
                <span className="cat-icon-label">{cat.displayName || cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── All category sections ── */}
      <div className="cat-container">
        {categories.map(cat => {
          const key = cat._id || cat.id;
          const catProducts = apiProducts
            .filter(p => p.category === cat.name)
            .sort((a, b) => a.name.localeCompare(b.name));

          return (
            <div
              className="cat-section"
              key={key}
            >
              <div className="cat-section-header" style={{ borderColor: cat.color }}>
                <div className="cat-title">
                  <span className="cat-big-icon">{cat.icon}</span>
                  <div>
                    <h2>{cat.displayName || cat.name}</h2>
                    <p>{catProducts.length} products available</p>
                  </div>
                </div>
                <Link
                  to={`/products?cat=${encodeURIComponent(cat.name)}`}
                  className="cat-view-all"
                  style={{ color: cat.color }}
                >
                  View All <FiArrowRight />
                </Link>
              </div>

              {catProducts.length > 0 ? (
                <div className="cat-preview-grid">
                  {catProducts.slice(0, 5).map(p => <MiniCard key={p._id || p.id} product={p} />)}
                </div>
              ) : (
                <div className="cat-empty">
                  <span>{cat.icon}</span>
                  <p>No products in {cat.displayName || cat.name} yet.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
