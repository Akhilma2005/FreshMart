import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext, SocketContext } from '../App';
import { FiZap } from 'react-icons/fi';
import MiniCard from '../components/MiniCard';
import useFrontCategories from '../hooks/useFrontCategories';
import API from '../api';
import './Home.css';

function useCountdown() {
  const [time, setTime] = useState({ h: 8, m: 45, s: 30 });
  useEffect(() => {
    const t = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        s--; if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return {
    h: String(time.h).padStart(2, '0'),
    m: String(time.m).padStart(2, '0'),
    s: String(time.s).padStart(2, '0'),
  };
}

function DealCard({ product }) {
  const { cartItems, addToCart, updateQty } = useContext(CartContext);
  const pid = product._id || product.id;
  const cartItem = cartItems.find(i => i.id === pid);
  const displayPrice = product.discountPrice || product.price;
  const discPct = product.discountPct > 0 ? product.discountPct
    : product.discountPrice ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : ({ Premium: 15, Organic: 10, Fresh: 8, Pure: 12, Spicy: 5, Refined: 7, Natural: 10, 'Whole Grain': 8 }[product.badge] || 8);
  const navigate = useNavigate();
  return (
    <div className="deal-prod" onClick={() => navigate(`/product/${pid}`)} style={{ cursor: 'pointer' }}>
      <div className="deal-prod-img-wrap">
        {product.image
          ? <img src={product.image} alt={product.name} className="deal-prod-img"
              onError={e => { e.target.style.display='none'; e.target.parentNode.querySelector('.deal-prod-emoji').style.display='flex'; }} />
          : null}
        <div className="deal-prod-emoji" style={{ display: product.image ? 'none' : 'flex' }}>{product.emoji || '🛒'}</div>
      </div>
      <div className="deal-prod-name">{product.name}</div>
      <div className="deal-prod-price">₹{displayPrice}</div>
      <div className="deal-prod-off">{discPct}% OFF</div>
      {cartItem ? (
        <div className="deal-prod-qty" onClick={e => e.stopPropagation()}>
          <button onClick={() => updateQty(pid, cartItem.qty - 1)}>−</button>
          <span>{cartItem.qty}</span>
          <button onClick={() => updateQty(pid, cartItem.qty + 1)}>+</button>
        </div>
      ) : (
        <button className="deal-prod-add" onClick={e => { e.stopPropagation(); addToCart({ ...product, id: pid }); }}>Add to Cart</button>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { h, m, s } = useCountdown();
  const socket = useContext(SocketContext);
  const [search, setSearch] = useState('');
  const categories = useFrontCategories();
  const [products, setProducts] = useState([]);

  const fetchProducts = () => {
    fetch(`${API}/products`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setProducts(data.map(p => {
        let img = p.image;
        if (img && img.startsWith('/uploads/')) img = `${(process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '')}${img}`;
        return { ...p, image: img };
      })))
      .catch(() => {});
  };

  useEffect(() => {
    fetchProducts();
    socket.on('products:updated', fetchProducts);
    return () => socket.off('products:updated', fetchProducts);
  }, []); // eslint-disable-line

  // Seller products first, then default — for all sections
  const sellerProducts = products.filter(p => p.isVendorProduct);
  const allSorted = [...sellerProducts, ...products.filter(p => !p.isVendorProduct)];

  const bestPicks = allSorted.slice(0, 10);
  const meatItems = allSorted.filter(p => {
    const cat = (p.category || '').toLowerCase();
    return cat === 'raw meats' || cat === 'meat' || cat === 'poultry';
  }).slice(0, 5);
  const dealItems = allSorted.filter(p => p.discountPrice || p.discountPct > 0 || p.price < 200).slice(0, 6);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/products?search=${search.trim()}`);
  };

  return (
    <div className="hk-page">

      {/* ══ HERO ══ */}
      <section className="hk-hero">
        <div className="hk-hero-main">
          <div className="hk-hero-pattern" />
          <div className="hk-hero-content">
            <div className="hk-hero-badge">✦ FRESH DAILY FROM LOCAL FARMS</div>
            <h1 className="hk-hero-title">
              Farm Fresh,<br />
              <em>Delivered Fast</em>
            </h1>
            <p className="hk-hero-sub">
              Fruits, vegetables, meats, masalas & more — sourced fresh every morning from the finest farms.
            </p>
            <div className="hk-hero-actions">
              <Link to="/products" className="hk-btn-primary">Shop Now</Link>
              <Link to="/about" className="hk-btn-outline">Our Story →</Link>
            </div>
            <div className="hk-hero-stats">
              {[['500+','Products'],['30 min','Delivery'],['50K+','Happy Families']].map(([n,l]) => (
                <div className="hk-hstat" key={l}>
                  <div className="hk-hstat-num">{n}</div>
                  <div className="hk-hstat-lbl">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="hk-hero-side">
          <Link to="/products?cat=Raw Meats" className="hk-side-banner hk-sb1">
            <div className="hk-sb-badge">NEW ARRIVALS</div>
            <div className="hk-sb-title">Premium Meat &amp; Seafood</div>
            <div className="hk-sb-sub">Farm-raised, antibiotic-free</div>
            <div className="hk-sb-link">Shop Now →</div>
            <div className="hk-sb-emoji">🥩</div>
          </Link>
          <Link to="/products?cat=Masalas%20%26%20Spices" className="hk-side-banner hk-sb2">
            <div className="hk-sb-badge">UP TO 40% OFF</div>
            <div className="hk-sb-title">Authentic Masalas &amp; Spices</div>
            <div className="hk-sb-sub">Stone-ground, no preservatives</div>
            <div className="hk-sb-link">Explore →</div>
            <div className="hk-sb-emoji">🌶</div>
          </Link>
        </div>
      </section>

      {/* ══ OFFERS STRIP ══ */}
      <div className="hk-offers-strip">
        {[
          { icon:'🚚', tag:'Free Delivery', title:'On orders above ₹499', sub:'Delivered to your doorstep within 2 hours', bg:'linear-gradient(120deg,#e8f5e9,#c8e6c9)' },
          { icon:'🌿', tag:'100% Organic', title:'Certified Fresh Produce', sub:'Directly sourced from trusted partner farms', bg:'linear-gradient(120deg,#fff8e1,#ffecb3)' },
          { icon:'🔄', tag:'Easy Returns', title:"Not Happy? We'll Refund", sub:'24-hour freshness guarantee on all orders', bg:'linear-gradient(120deg,#e3f2fd,#bbdefb)' },
        ].map((o, i) => (
          <div className="hk-offer-card" key={i} style={{ background: o.bg }}>
            <div className="hk-offer-icon">{o.icon}</div>
            <div className="hk-offer-text">
              <div className="hk-offer-tag">{o.tag}</div>
              <h3>{o.title}</h3>
              <p>{o.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══ SHOP BY CATEGORY ══ */}
      <section className="hk-section">
        <div className="hk-section-header">
          <h2 className="hk-section-title">Shop by <span>Category</span></h2>
          <Link to="/categories" className="hk-see-all">View All →</Link>
        </div>
        <div className="hk-cat-grid">
          {categories.map((cat, i) => (
            <Link to={`/products?cat=${encodeURIComponent(cat.name)}`} key={`cat-${cat._id || cat.id}-${i}`} className="hk-cat-card">
              <div className="hk-cat-circle" style={{ background: cat.bg }}>
                {cat.image
                  ? <img src={cat.image.startsWith('http') ? cat.image : `${(process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '')}${cat.image}`} alt={cat.name}
                      style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}
                      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                  : null}
                <span style={{ display: cat.image ? 'none' : 'block' }}>{cat.icon}</span>
              </div>
              <div className="hk-cat-name">{cat.displayName || cat.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══ BEST PICKS ══ */}
      <section className="hk-section">
        <div className="hk-section-header">
          <h2 className="hk-section-title">Today's <span>Best Picks</span></h2>
          <Link to="/products" className="hk-see-all">See All Products →</Link>
        </div>
        <div className="hk-prod-grid">
          {bestPicks.map(p => <MiniCard key={p._id || p.id} product={p} />)}
        </div>
      </section>

      {/* ══ DEAL OF THE DAY ══ */}
      <div className="hk-deal-banner">
        <div className="hk-deal-inner">
          <div className="hk-deal-bg" />
          <div className="hk-deal-text">
            <span className="hk-deal-tag">⚡ DEAL OF THE DAY</span>
            <h2 className="hk-deal-title">Flash Sale on <em>Premium Products</em></h2>
            <p className="hk-deal-sub">Limited-time offers on our finest selection. Fresh stock, unbeatable prices.</p>
            <div className="hk-timer">
              {[['h','HRS'],['m','MIN'],['s','SEC']].map(([k,l]) => (
                <div className="hk-tbox" key={k}>
                  <div className="hk-tnum">{k === 'h' ? h : k === 'm' ? m : s}</div>
                  <div className="hk-tlbl">{l}</div>
                </div>
              ))}
            </div>
            <Link to="/products" className="hk-btn-primary">Grab Deals →</Link>
          </div>
          <div className="hk-deal-products">
            {dealItems.map(p => <DealCard key={p._id || p.id} product={p} />)}
          </div>
        </div>
      </div>

      {/* ══ MEATS & SEAFOOD ══ */}
      <section className="hk-section">
        <div className="hk-section-header">
          <h2 className="hk-section-title">Fresh <span>Meats &amp; Poultry</span></h2>
          <Link to="/products?cat=Raw Meats" className="hk-see-all">View All →</Link>
        </div>
        <div className="hk-prod-grid">
          {meatItems.map(p => <MiniCard key={p._id || p.id} product={p} />)}
        </div>
      </section>

      {/* ══ ABOUT SECTION ══ */}
      <section className="hk-about">
        <div className="hk-about-inner">
          <div className="hk-about-left">
            <div className="hk-about-label">✦ Our Story</div>
            <h2 className="hk-about-title">
              Rooted in Tradition,<br /><em>Built for Today</em>
            </h2>
            <p className="hk-about-text">
              FreshMart was born from a simple belief — every family deserves access to food that is genuinely fresh, honestly priced, and thoughtfully sourced. We partner directly with over 200 farmers, cutting out middlemen to bring the market straight to your kitchen.
            </p>
            <p className="hk-about-text">
              From sun-ripened fruits to hand-ground masalas and sustainably sourced meats — every product carries a story of honest labour and natural goodness.
            </p>
            <div className="hk-about-features">
              {[
                ['🌱','Farm-Direct Sourcing','Directly from 200+ partner farms'],
                ['✅','Quality Certified','FSSAI & organic certified products'],
                ['🧊','Cold-Chain Delivery','Temperature-controlled logistics'],
                ['💚','Zero Food Waste','Surplus goes to local food banks'],
              ].map(([icon, title, desc]) => (
                <div className="hk-about-feat" key={title}>
                  <div className="hk-feat-icon">{icon}</div>
                  <div><h4>{title}</h4><p>{desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="hk-about-stats">
            {[
              ['200+','Partner Farms','Across India'],
              ['50K+','Happy Families','Served Every Month'],
              ['2 Hrs','Avg Delivery','Guaranteed Fresh'],
            ].map(([num, lbl, desc]) => (
              <div className="hk-about-stat" key={lbl}>
                <div className="hk-astat-num">{num}</div>
                <div className="hk-astat-lbl">{lbl}</div>
                <div className="hk-astat-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ NEWSLETTER ══ */}
      <div className="hk-newsletter">
        <div className="hk-nl-inner">
          <h2 className="hk-nl-title">🌿 Get Fresh Deals in Your Inbox</h2>
          <p className="hk-nl-sub">Subscribe for weekly offers, new arrivals, and exclusive discounts for members.</p>
          <form className="hk-nl-form" onSubmit={e => { e.preventDefault(); e.target.reset(); }}>
            <input type="email" className="hk-nl-input" placeholder="Enter your email address" required />
            <button type="submit" className="hk-nl-btn">Subscribe</button>
          </form>
        </div>
      </div>

    </div>
  );
}
