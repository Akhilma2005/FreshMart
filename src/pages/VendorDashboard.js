import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import API from '../api';
import { io } from 'socket.io-client';
import {
  FiShoppingBag, FiPackage, FiTrendingUp,
  FiPlus, FiEdit2, FiTrash2, FiEye,
  FiUser, FiMail, FiPhone, FiMapPin, FiCheck,
  FiAlertCircle, FiDollarSign, FiGrid, FiList,
  FiCamera, FiGlobe, FiInfo, FiCreditCard, FiShield
} from 'react-icons/fi';
import './VendorDashboard.css';

const EMPTY_SHOP = { shopName: '', tagline: '', phone: '', email: '', website: '', description: '', address: '', city: '', state: '', pincode: '' };
const EMPTY_PAYMENT = { upiId: '', accountHolder: '', bankName: '', accountNumber: '', confirmAccountNumber: '', ifsc: '', accountType: 'savings' };

const imgUrl = (src) => !src ? '' : src.startsWith('http') ? src : `http://localhost:5000${src}`;

export default function VendorDashboard() {
  const { auth, authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user;
  const headers = React.useMemo(() => ({
    Authorization: `Bearer ${auth?.token}`,
    'Content-Type': 'application/json'
  }), [auth?.token]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode]   = useState('grid');

  const [products, setProducts]   = useState([]);
  const [productStats, setProductStats] = useState([]);
  const [stats, setStats]         = useState({ totalProducts: 0, totalSales: 0, totalRevenue: 0, activeListings: 0, outOfStock: 0 });
  const [shopForm, setShopForm]   = useState(EMPTY_SHOP);
  const [shopExists, setShopExists] = useState(false);
  const [shopSaved, setShopSaved] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopAvatar, setShopAvatar] = useState(null);
  const [shopAvatarLoading, setShopAvatarLoading] = useState(false);
  const shopAvatarInputRef = React.useRef();

  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentExists, setPaymentExists] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [upiStatus, setUpiStatus] = useState(null); // { valid, message, bank }


  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`${API}/vendor/products/${user.id}`, { headers });
    if (res.ok) {
      const data = await res.json();
      // Enrich with catalog images for products that have no image
      let catalogMap = {};
      try {
        const cr = await fetch(`${API}/admin/catalog/public`);
        if (cr.ok) {
          const cats = await cr.json();
          cats.forEach(cat => cat.items?.forEach(item => {
            if (item.image) catalogMap[item.name.toLowerCase()] = imgUrl(item.image);
          }));
        }
      } catch {}
      const enrich = d => d.map(p => ({
        ...p,
        image: p.image ? imgUrl(p.image) : (catalogMap[p.name.toLowerCase()] || null),
      }));
      setProducts(enrich(data));
      try {
        const res2 = await fetch(`${API}/vendor/product-stats/${user.id}`, { headers });
        if (res2.ok) {
          setProductStats(enrich(await res2.json()));
        } else {
          setProductStats(enrich(data).map(p => ({ ...p, qtySold: p.sales || 0, revenue: (p.discountPrice || p.price) * (p.sales || 0), orderCount: 0 })));
        }
      } catch {
        setProductStats(enrich(data).map(p => ({ ...p, qtySold: p.sales || 0, revenue: (p.discountPrice || p.price) * (p.sales || 0), orderCount: 0 })));
      }
    }
  }, [user?.id, headers]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`${API}/vendor/stats/${user.id}`, { headers });
    if (res.ok) setStats(await res.json());
  }, [user?.id, headers]);

  const applyShopData = (data) => {
    setShopForm({
      shopName:    data.shopName    || '',
      tagline:     data.tagline     || '',
      phone:       data.phone       || '',
      email:       data.email       || '',
      website:     data.website     || '',
      description: data.description || '',
      address:     data.address     || '',
      city:        data.city        || '',
      state:       data.state       || '',
      pincode:     data.pincode     || '',
    });
    setShopAvatar(data.avatar || null);
    setShopExists(true);
  };

  const fetchShop = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`${API}/vendor/shop/${user.id}`, { headers });
    if (res.ok) applyShopData(await res.json());
  }, [user?.id, headers]);

  const fetchPayment = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`${API}/vendor/payment/${user.id}`, { headers });
    if (res.ok) {
      const data = await res.json();
      // accountNumber comes back masked (****1234) — clear it so user must re-enter to change
      setPaymentForm({ ...EMPTY_PAYMENT, ...data, accountNumber: '', confirmAccountNumber: '' });
      setPaymentExists(true);
    }
  }, [user?.id, headers]);

  const fetchReviews = useCallback(async () => {
    if (!user) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`${API}/reviews/vendor/${user.id}`, { headers });
      if (res.ok) setReviews(await res.json());
    } finally { setReviewsLoading(false); }
  }, [user?.id, headers]);

  const socketRef = useRef(null);
  const [realtimeFlash, setRealtimeFlash] = useState(null); // productId that just updated

  useEffect(() => {
    if (!user?.id) return;
    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join:vendor', user.id);

    socket.on('vendor:product-update', (updates) => {
      // updates = [{ _id, stock, status, sales, qtySold, revenue, orderCount }]
      setProductStats(prev => prev.map(p => {
        const u = updates.find(u => u._id === p._id.toString() || u._id === p._id);
        if (!u) return p;
        setRealtimeFlash(p._id);
        setTimeout(() => setRealtimeFlash(null), 1500);
        return {
          ...p,
          stock:      u.stock,
          status:     u.status,
          sales:      u.sales,
          qtySold:    u.qtySold,
          revenue:    u.revenue,
          orderCount: (p.orderCount || 0) + u.orderCount,
        };
      }));
      // also refresh stats strip
      fetchStats();
    });

    return () => socket.disconnect();
  }, [user?.id, fetchStats]);

  useEffect(() => { fetchProducts(); fetchStats(); fetchShop(); fetchPayment(); fetchReviews(); }, [fetchProducts, fetchStats, fetchShop, fetchPayment, fetchReviews]);

  useEffect(() => {
    if (!authLoading && !auth) navigate('/login');
  }, [auth, authLoading, navigate]);

  if (authLoading) return null;
  if (!auth) return null;
  if (!auth.user.roles?.includes('vendor') && auth.user.role !== 'vendor') {
    return (
      <div className="vd-access-denied">
        <div className="vd-denied-card">
          <FiAlertCircle size={52} />
          <h2>Vendor Access Only</h2>
          <p>This page is only available to users who registered as a <strong>Vendor</strong>.</p>
          <p>You are currently logged in as: <strong>{auth.user.roles?.join(', ') || auth.user.role}</strong>.</p>
          <div className="vd-denied-btns">
            <Link to="/" className="vd-btn primary">Go to Home</Link>
            <Link to="/signup" className="vd-btn outline">Register as Vendor</Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Shop save ── */
  const saveShop = async () => {
    if (!shopForm.shopName.trim()) return alert('Shop name is required');
    setShopLoading(true);
    try {
      const method = shopExists ? 'PATCH' : 'POST';
      const url = shopExists ? `${API}/vendor/shop/${user.id}` : `${API}/vendor/shop`;
      const body = shopExists ? shopForm : { ...shopForm, vendorId: user.id };
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) return alert(data.message);
      if (data.shop) applyShopData(data.shop); else setShopExists(true);
      setShopSaved(true);
      setTimeout(() => setShopSaved(false), 3000);
    } catch { alert('Failed to save shop. Make sure backend is running.'); }
    finally { setShopLoading(false); }
  };

  const handleShopAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!shopExists) return alert('Please save your shop profile first before uploading an image.');
    const formData = new FormData();
    formData.append('avatar', file);
    setShopAvatarLoading(true);
    try {
      const res = await fetch(`${API}/vendor/shop/${user.id}/avatar`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${auth.token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) return alert(data.message);
      setShopAvatar(`${data.avatarUrl}?t=${Date.now()}`);
    } catch (e) {
      alert('Failed to upload shop image. Make sure backend is running.');
    } finally {
      setShopAvatarLoading(false);
      e.target.value = '';
    }
  };

  const openAddProductPage = () => navigate('/vendor/add-product');

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await fetch(`${API}/vendor/products/${id}`, { method: 'DELETE', headers });
    await fetchProducts();
    await fetchStats();
  };

  const handleEditClick = (p) => {
    setEditingProduct(p);
    setEditForm({
      name: p.name,
      price: p.price,
      discountPrice: p.discountPrice || '',
      stock: p.stock,
      unit: p.unit || 'kg',
      description: p.description || '',
      status: p.status || 'active'
    });
    setIsEditModalOpen(true);
  };

  const saveProductEdit = async () => {
    if (!editForm.name || !editForm.price || editForm.stock === '') return alert('Name, price and stock are required');
    setEditSaving(true);
    try {
      const body = {
        ...editForm,
        price: Number(editForm.price),
        discountPrice: editForm.discountPrice ? Number(editForm.discountPrice) : null,
        stock: Number(editForm.stock),
        discountPct: editForm.discountPrice ? Math.round(((Number(editForm.price) - Number(editForm.discountPrice)) / Number(editForm.price)) * 100) : 0
      };
      const res = await fetch(`${API}/vendor/products/${editingProduct._id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        fetchProducts();
        fetchStats();
      } else {
        const d = await res.json();
        alert(d.message || 'Update failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setEditSaving(false);
    }
  };

  const verifyUpi = async () => {
    if (!paymentForm.upiId.trim()) return;
    setUpiStatus({ checking: true });
    try {
      const res = await fetch(`${API}/vendor/verify-upi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upiId: paymentForm.upiId.trim() }),
      });
      const data = await res.json();
      setUpiStatus({ valid: data.valid, message: data.message, bank: data.bank });
    } catch (e) { setUpiStatus({ valid: false, message: 'Could not connect to server.' }); }
  };

  const savePayment = async () => {
    setPaymentError('');
    if (!paymentForm.upiId.trim()) { setPaymentError('UPI ID is required.'); return; }
    if (!paymentForm.accountHolder.trim()) { setPaymentError('Account holder name is required.'); return; }
    if (!paymentForm.bankName.trim())      { setPaymentError('Bank name is required.'); return; }
    if (!paymentExists && !paymentForm.accountNumber.trim()) { setPaymentError('Account number is required.'); return; }
    if (!paymentExists && !paymentForm.ifsc.trim())          { setPaymentError('IFSC code is required.'); return; }
    if (paymentForm.accountNumber && paymentForm.accountNumber !== paymentForm.confirmAccountNumber) {
      setPaymentError('Account numbers do not match.'); return;
    }
    if (paymentForm.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(paymentForm.ifsc.toUpperCase())) {
      setPaymentError('Invalid IFSC code format (e.g. SBIN0001234).'); return;
    }
    setPaymentLoading(true);
    try {
      const body = {
        upiId: paymentForm.upiId,
        accountHolder: paymentForm.accountHolder,
        bankName: paymentForm.bankName,
        ifsc: paymentForm.ifsc ? paymentForm.ifsc.toUpperCase() : undefined,
        accountType: paymentForm.accountType,
      };
      if (paymentForm.accountNumber) body.accountNumber = paymentForm.accountNumber;
      const method = paymentExists ? 'PATCH' : 'POST';
      const url = paymentExists ? `${API}/vendor/payment/${user.id}` : `${API}/vendor/payment`;
      if (!paymentExists) body.vendorId = user.id;
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setPaymentError(data.message || 'Failed to save.'); return; }
      setPaymentExists(true);
      setPaymentForm(f => ({ ...f, accountNumber: '', confirmAccountNumber: '' }));
      setPaymentSaved(true);
      setTimeout(() => setPaymentSaved(false), 3000);
    } catch { setPaymentError('Could not connect to server.'); }
    finally { setPaymentLoading(false); }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard',    icon: <FiGrid /> },
    { id: 'products',  label: 'My Products',  icon: <FiPackage /> },
    { id: 'reviews',   label: 'Customer Reviews', icon: <span style={{ fontSize: 16 }}>⭐</span> },
    { id: 'shop',      label: 'Shop Profile', icon: <FiShoppingBag /> },
    { id: 'payment',   label: 'Payment Details', icon: <FiCreditCard /> },
  ];

  return (
    <div className="vd-page">

      {/* ══ HERO ══ */}
      <section className="vd-hero">
        <div className="vd-hero-main">
          <div className="vd-hero-pattern" />
          <div className="vd-hero-content">
            <div className="vd-hero-badge">🏪 Seller Hub</div>
            <h1 className="vd-hero-title">
              {shopForm.shopName ? shopForm.shopName : `Welcome, ${user.name.split(' ')[0]}!`}
            </h1>
            <p className="vd-hero-sub">
              {shopForm.tagline || 'Manage your products, view sales, and update your shop profile.'}
            </p>
            <div className="vd-hero-actions">
              <button className="vd-btn-primary" onClick={openAddProductPage}><FiPlus /> Add Product</button>
              <Link to="/profile" className="vd-btn-outline"><FiUser /> My Profile</Link>
            </div>
          </div>
        </div>
        <div className="vd-hero-stats">
          {[
            { icon: <FiPackage />,     label: 'Total Products',  value: stats.totalProducts },
            { icon: <FiTrendingUp />,  label: 'Total Sales',     value: stats.totalSales },
            { icon: <FiDollarSign />,  label: 'Revenue',         value: `₹${stats.totalRevenue.toLocaleString()}`},
            { icon: <FiAlertCircle />, label: 'Out of Stock',    value: stats.outOfStock },
          ].map((s, i) => (
            <div className="vd-hstat" key={i}>
              <div className="vd-hstat-icon">{s.icon}</div>
              <div className="vd-hstat-num">{s.value}</div>
              <div className="vd-hstat-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ TABS ══ */}
      <div className="vd-tabs-wrap">
        <div className="vd-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`vd-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="vd-body">

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div className="vd-dashboard">
            <div className="vd-section-title">Quick Actions</div>
            <div className="vd-quick-grid">
              <button className="vd-quick-card green" onClick={openAddProductPage}>
                <FiPlus size={28} /><strong>Add New Product</strong><span>List a new item for sale</span>
              </button>
              <button className="vd-quick-card blue" onClick={() => setActiveTab('products')}>
                <FiPackage size={28} /><strong>Manage Products</strong><span>Edit, delete, update stock</span>
              </button>
              <button className="vd-quick-card purple" onClick={() => setActiveTab('shop')}>
                <FiShoppingBag size={28} /><strong>Shop Profile</strong><span>Update your store info</span>
              </button>
              <Link to="/products" className="vd-quick-card orange">
                <FiEye size={28} /><strong>View Marketplace</strong><span>See how buyers see your products</span>
              </Link>
            </div>

            {shopExists && (
              <div className="vd-shop-info-card">
                <div className="vd-shop-info-left">
                  <div className="vd-shop-info-avatar">
                  {shopAvatar
                    ? <img src={shopAvatar} alt="shop" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                    : shopForm.shopName.charAt(0).toUpperCase()}
                </div>
                  <div>
                    <strong>{shopForm.shopName}</strong>
                    {shopForm.tagline && <span>{shopForm.tagline}</span>}
                    <div className="vd-shop-info-meta">
                      {shopForm.city && <span><FiMapPin size={11} /> {shopForm.city}{shopForm.state ? `, ${shopForm.state}` : ''}</span>}
                      {shopForm.phone && <span><FiPhone size={11} /> {shopForm.phone}</span>}
                      {shopForm.email && <span><FiMail size={11} /> {shopForm.email}</span>}
                      {shopForm.website && <span><FiGlobe size={11} /> {shopForm.website}</span>}
                    </div>
                  </div>
                </div>
                <button className="vd-btn outline" onClick={() => setActiveTab('shop')}><FiEdit2 size={13} /> Edit Shop</button>
              </div>
            )}
            {!shopExists && (
              <div className="vd-shop-info-card vd-shop-info-empty">
                <FiShoppingBag size={28} />
                <div>
                  <strong>Shop profile not set up yet</strong>
                  <span>Add your shop name, contact details and address so buyers can find you.</span>
                </div>
                <button className="vd-btn primary" onClick={() => setActiveTab('shop')}><FiPlus size={13} /> Create Shop Profile</button>
              </div>
            )}

            {!paymentExists && (
              <div className="vd-shop-info-card vd-shop-info-empty" style={{ marginTop: 12 }}>
                <FiCreditCard size={28} />
                <div>
                  <strong>Payment details not set up</strong>
                  <span>Add your UPI ID or bank account so we can transfer your earnings.</span>
                </div>
                <button className="vd-btn primary" onClick={() => setActiveTab('payment')}><FiPlus size={13} /> Add Payment Details</button>
              </div>
            )}

            <div className="vd-section-title" style={{ marginTop: 32 }}>Top Performing Products</div>
            <div className="vd-top-products">
              {[...products].sort((a, b) => b.sales - a.sales).slice(0, 3).map(p => (
                <div className="vd-top-card" key={p._id}>
                  <div className="vd-top-emoji">
                    {p.image
                      ? <img src={imgUrl(p.image)} alt={p.name} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                      : null}
                    <span style={{ display: p.image ? 'none' : 'block' }}>{p.emoji}</span>
                  </div>
                  <div className="vd-top-info"><strong>{p.name}</strong><span>{p.category}</span></div>
                  <div className="vd-top-right">
                    <strong className="vd-top-sales">{p.sales} sold</strong>
                    <span className="vd-top-rev">₹{(p.price * p.sales).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {products.length === 0 && <p style={{ color: '#888', padding: '16px 0' }}>No products yet.</p>}
            </div>
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {activeTab === 'products' && (
          <div>
            <div className="vd-products-header">
              <div className="vd-section-title" style={{ margin: 0 }}>My Products ({productStats.length || products.length}) <span className="vd-live-badge">● LIVE</span></div>
              <div className="vd-products-actions">
                <div className="vd-view-toggle">
                  <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><FiGrid /></button>
                  <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><FiList /></button>
                </div>
                <button className="vd-btn primary" onClick={openAddProductPage}><FiPlus size={14} /> Add Product</button>
              </div>
            </div>

            {/* ── Summary strip ── */}
            {productStats.length > 0 && (
              <div className="vd-ps-summary">
                <div className="vd-ps-sum-card">
                  <span>📦</span>
                  <div><strong>{productStats.length}</strong><small>Total Products</small></div>
                </div>
                <div className="vd-ps-sum-card">
                  <span>🛒</span>
                  <div><strong>{productStats.reduce((s, p) => s + p.qtySold, 0)}</strong><small>Units Sold</small></div>
                </div>
                <div className="vd-ps-sum-card">
                  <span>💰</span>
                  <div><strong>₹{productStats.reduce((s, p) => s + p.revenue, 0).toLocaleString()}</strong><small>Total Earned</small></div>
                </div>
                <div className="vd-ps-sum-card">
                  <span>✅</span>
                  <div><strong>{productStats.filter(p => p.status === 'active').length}</strong><small>Active</small></div>
                </div>
                <div className="vd-ps-sum-card">
                  <span>⚠️</span>
                  <div><strong>{productStats.filter(p => p.stock === 0).length}</strong><small>Out of Stock</small></div>
                </div>
              </div>
            )}

            {productStats.length === 0 && products.length === 0 ? (
              <div className="vd-empty">
                <span>📦</span>
                <p>No products yet. Add your first product!</p>
                <button className="vd-btn primary" onClick={openAddProductPage}><FiPlus /> Add Product</button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="vd-products-grid">
                {productStats.map(p => {
                  const src = imgUrl(p.image);
                  return (
                  <div className={`vd-product-card ${realtimeFlash === p._id ? 'vd-rt-flash' : ''}`} key={p._id}>
                    <div className="vd-pc-top">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="vd-pc-img"
                            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                          />
                        : null}
                      <div className="vd-pc-emoji" style={p.image ? { display:'none' } : {}}>{p.emoji || '🛒'}</div>
                      <span className={`vd-status-badge ${p.status === 'active' ? 'active' : 'out'}`}>
                        {p.approvalStatus === 'pending' ? '⏳ Pending' : p.approvalStatus === 'rejected' ? '❌ Rejected' : p.status === 'active' ? 'Active' : 'Out of Stock'}
                      </span>
                      {p.approvalStatus === 'rejected' && p.rejectionNote && (
                        <span className="vd-rejected-note" title={p.rejectionNote}>ℹ️</span>
                      )}
                    </div>
                    <div className="vd-pc-body">
                      <h4>{p.name}</h4>
                      <span className="vd-pc-cat">{p.category}</span>
                      <div className="vd-pc-meta">
                        <div className="vd-pc-price-row">
                          {p.discountPrice ? (
                            <>
                              <span className="vd-pc-price">₹{p.discountPrice}</span>
                              <span className="vd-pc-original">₹{p.price}</span>
                              {p.discountPct > 0 && <span className="vd-pc-disc-badge">{p.discountPct}% OFF</span>}
                            </>
                          ) : (
                            <span className="vd-pc-price">₹{p.price}</span>
                          )}
                          {p.unit && <span className="vd-pc-unit">/ {p.unit}</span>}
                        </div>
                        <span className="vd-pc-stock">Stock: {p.stock}</span>
                      </div>
                      {p.description && <p className="vd-pc-desc">{p.description}</p>}

                      {/* ── Stats row ── */}
                      <div className="vd-pc-stats-row">
                        <div className="vd-pc-stat">
                          <strong>{p.qtySold}</strong>
                          <small>Sold</small>
                        </div>
                        <div className="vd-pc-stat">
                          <strong>₹{p.revenue.toLocaleString()}</strong>
                          <small>Earned</small>
                        </div>
                        <div className="vd-pc-stat">
                          <strong>{p.orderCount}</strong>
                          <small>Orders</small>
                        </div>
                      </div>
                    </div>
                    <div className="vd-pc-actions">
                      <button className="vd-icon-btn edit" onClick={() => handleEditClick(p)}><FiEdit2 size={14} /></button>
                      <button className="vd-icon-btn delete" onClick={() => deleteProduct(p._id)}><FiTrash2 size={14} /></button>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="vd-products-table">
                <div className="vd-table-head">
                  <span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Sold</span><span>Earned</span><span>Orders</span><span>Status</span><span></span>
                </div>
                {productStats.map(p => (
                  <div className="vd-table-row" key={p._id}>
                    <span className="vd-tr-name">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="vd-tr-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }} />
                        : null}
                      <span style={p.image ? { display:'none' } : {}}>{p.emoji}</span>
                      {p.name}
                    </span>
                    <span>{p.category}</span>
                    <span>
                      {p.discountPrice ? (
                        <><strong>₹{p.discountPrice}</strong> <s style={{color:'#aaa',fontSize:'0.85em'}}>₹{p.price}</s></>
                      ) : `₹${p.price}`}
                      {p.unit && <span style={{color:'#888',fontSize:'0.85em'}}> /{p.unit}</span>}
                    </span>
                    <span style={{color: p.stock === 0 ? '#D62828' : '#333'}}>{p.stock}</span>
                    <span className="vd-tr-sold">{p.qtySold} units</span>
                    <span className="vd-tr-earned">₹{p.revenue.toLocaleString()}</span>
                    <span>{p.orderCount}</span>
                    <span><span className={`vd-status-badge ${p.approvalStatus === 'pending' ? 'pending' : p.approvalStatus === 'rejected' ? 'out' : p.status === 'active' ? 'active' : 'out'}`}>
                      {p.approvalStatus === 'pending' ? '⏳ Pending' : p.approvalStatus === 'rejected' ? '❌ Rejected' : p.status === 'active' ? 'Active' : 'Out'}
                    </span></span>
                    <span className="vd-tr-actions">
                      <button className="vd-icon-btn edit" onClick={() => handleEditClick(p)} style={{ marginRight: 8 }}><FiEdit2 size={13} /></button>
                      <button className="vd-icon-btn delete" onClick={() => deleteProduct(p._id)}><FiTrash2 size={13} /></button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENT DETAILS ── */}
        {activeTab === 'payment' && (
          <div className="vd-card">
            <div className="vd-card-header"><FiCreditCard /> Payment Details</div>

            <div className="vd-payment-notice">
              <FiShield size={16} />
              <span>Your payment details are stored securely and used only for transferring earnings to your account.</span>
            </div>

            {/* UPI */}
            <div className="vd-form-section">UPI Details</div>
            <div className="vd-form-grid">
              <div className="vd-form-field vd-form-full">
                <label><span>📱</span> UPI ID</label>
                <div className="vd-upi-wrap">
                  <input
                    type="text"
                    placeholder="yourname@upi or 9876543210@paytm"
                    value={paymentForm.upiId}
                    onChange={e => { setPaymentForm(f => ({ ...f, upiId: e.target.value })); setUpiStatus(null); }}
                  />
                  <button
                    type="button"
                    className="vd-upi-verify-btn"
                    onClick={verifyUpi}
                    disabled={!paymentForm.upiId.trim() || upiStatus?.checking}
                  >
                    {upiStatus?.checking ? '...' : 'Verify'}
                  </button>
                </div>
                {upiStatus && !upiStatus.checking && (
                  <span className={`vd-upi-status ${upiStatus.valid ? 'valid' : 'invalid'}`}>
                    {upiStatus.valid ? '✅' : '❌'} {upiStatus.message}
                  </span>
                )}
                <span className="vd-field-hint">Payments under ₹1,00,000 will be sent directly to this UPI ID.</span>
              </div>
            </div>

            {/* Bank */}
            <div className="vd-form-section">Bank Account Details</div>
            <div className="vd-form-grid">
              <ShopField label="Account Holder Name" icon={<FiUser />}
                value={paymentForm.accountHolder}
                onChange={v => setPaymentForm(f => ({ ...f, accountHolder: v }))}
                placeholder="Full name as per bank records" />
              <ShopField label="Bank Name" icon={<FiShoppingBag />}
                value={paymentForm.bankName}
                onChange={v => setPaymentForm(f => ({ ...f, bankName: v }))}
                placeholder="e.g. State Bank of India" />
              <ShopField label="Account Number" icon={<FiCreditCard />}
                value={paymentForm.accountNumber}
                onChange={v => setPaymentForm(f => ({ ...f, accountNumber: v }))}
                placeholder="Enter account number" type="password" />
              <ShopField label="Confirm Account Number" icon={<FiCreditCard />}
                value={paymentForm.confirmAccountNumber}
                onChange={v => setPaymentForm(f => ({ ...f, confirmAccountNumber: v }))}
                placeholder="Re-enter account number" />
              <ShopField label="IFSC Code" icon={<FiInfo />}
                value={paymentForm.ifsc}
                onChange={v => setPaymentForm(f => ({ ...f, ifsc: v.toUpperCase() }))}
                placeholder="e.g. SBIN0001234" />
              <div className="vd-form-field">
                <label><FiCreditCard /> Account Type</label>
                <select
                  value={paymentForm.accountType}
                  onChange={e => setPaymentForm(f => ({ ...f, accountType: e.target.value }))}
                >
                  <option value="savings">Savings Account</option>
                  <option value="current">Current Account</option>
                </select>
              </div>
            </div>

            {paymentError && <div className="vd-payment-error"><FiAlertCircle size={14} /> {paymentError}</div>}

            <div className="vd-save-bar">
              {paymentSaved && <span className="vd-saved-note"><FiCheck /> Payment details saved!</span>}
              <button className="vd-btn primary large" onClick={savePayment} disabled={paymentLoading}>
                <FiCheck size={15} /> {paymentLoading ? 'Saving...' : paymentExists ? 'Update Payment Details' : 'Save Payment Details'}
              </button>
            </div>
          </div>
        )}

        {/* ── SHOP PROFILE ── */}
        {activeTab === 'shop' && (
          <div className="vd-card">
            <div className="vd-card-header"><FiShoppingBag /> Shop Profile</div>

            <div className="vd-shop-avatar-row">
              <div className="vd-shop-avatar">
                {shopAvatar
                  ? <img src={shopAvatar} alt="shop" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                  : shopForm.shopName ? shopForm.shopName.charAt(0).toUpperCase() : '🏪'}
              </div>
              <div>
                <strong>{shopForm.shopName || 'Your Shop Name'}</strong>
                <span>{shopForm.tagline || 'Add a tagline for your shop'}</span>
              </div>
              <input
                type="file" accept="image/*"
                ref={shopAvatarInputRef}
                style={{ display: 'none' }}
                onChange={handleShopAvatarChange}
              />
              <button
                className="vd-cam-btn"
                onClick={() => shopAvatarInputRef.current.click()}
                disabled={shopAvatarLoading}
                title={!shopExists ? 'Save shop profile first' : 'Change shop image'}
              >
                {shopAvatarLoading ? '...' : <FiCamera size={14} />}
              </button>
            </div>

            <div className="vd-form-section">Basic Information</div>
            <div className="vd-form-grid">
              <ShopField label="Shop Name *"   icon={<FiShoppingBag />} value={shopForm.shopName}    onChange={v => setShopForm(f => ({ ...f, shopName: v }))}    placeholder="e.g. Green Basket Store" />
              <ShopField label="Tagline"        icon={<FiInfo />}        value={shopForm.tagline}     onChange={v => setShopForm(f => ({ ...f, tagline: v }))}     placeholder="e.g. Fresh from the farm" />
              <ShopField label="Phone Number"   icon={<FiPhone />}       value={shopForm.phone}       onChange={v => setShopForm(f => ({ ...f, phone: v }))}       placeholder="+91 98765 43210" />
              <ShopField label="Business Email" icon={<FiMail />}        value={shopForm.email}       onChange={v => setShopForm(f => ({ ...f, email: v }))}       placeholder="shop@example.com" />
              <ShopField label="Website"        icon={<FiGlobe />}       value={shopForm.website}     onChange={v => setShopForm(f => ({ ...f, website: v }))}     placeholder="https://yourshop.com" />
            </div>

            <div className="vd-form-section">Shop Description</div>
            <div className="vd-form-field vd-form-full">
              <label><FiInfo /> Description</label>
              <textarea
                value={shopForm.description}
                onChange={e => setShopForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Tell buyers about your shop..."
                rows={4} maxLength={500}
              />
              <span className="vd-char-count">{shopForm.description.length}/500</span>
            </div>

            <div className="vd-form-section">Address</div>
            <div className="vd-form-grid">
              <ShopField label="Street Address" icon={<FiMapPin />} value={shopForm.address} onChange={v => setShopForm(f => ({ ...f, address: v }))} placeholder="Shop address" full />
              <ShopField label="City"    icon={<FiMapPin />} value={shopForm.city}    onChange={v => setShopForm(f => ({ ...f, city: v }))}    placeholder="City" />
              <ShopField label="State"   icon={<FiMapPin />} value={shopForm.state}   onChange={v => setShopForm(f => ({ ...f, state: v }))}   placeholder="State" />
              <ShopField label="Pincode" icon={<FiMapPin />} value={shopForm.pincode} onChange={v => setShopForm(f => ({ ...f, pincode: v }))} placeholder="Pincode" />
            </div>

            <div className="vd-save-bar">
              {shopSaved && <span className="vd-saved-note"><FiCheck /> Saved successfully!</span>}
              <button className="vd-btn primary large" onClick={saveShop} disabled={shopLoading}>
                {shopLoading ? 'Saving...' : shopExists ? 'Update Shop Profile' : 'Create Shop Profile'}
              </button>
            </div>
          </div>
        )}
        {/* ── REVIEWS ── */}
        {activeTab === 'reviews' && (
          <div className="vd-reviews-tab">
            <div className="vd-products-header">
              <div className="vd-section-title" style={{ margin: 0 }}>Customer Reviews ({reviews.length})</div>
            </div>

            {reviews.length > 0 && (
              <div className="vd-ps-summary" style={{ marginTop: 24 }}>
                <div className="vd-ps-sum-card">
                  <span>⭐</span>
                  <div>
                    <strong>{(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}</strong>
                    <small>Average Rating</small>
                  </div>
                </div>
                <div className="vd-ps-sum-card">
                  <span>💬</span>
                  <div>
                    <strong>{reviews.length}</strong>
                    <small>Total Feedback</small>
                  </div>
                </div>
                <div className="vd-ps-sum-card">
                  <span>📈</span>
                  <div>
                    <strong>{Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)}%</strong>
                    <small>Satisfaction</small>
                  </div>
                </div>
              </div>
            )}
            
            <div className="vd-reviews-list">
              {reviewsLoading ? (
                <div className="vd-loading-shim">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="vd-empty">
                  <span>💬</span>
                  <p>No customer reviews yet. Reviews will appear here as buyers rate your products.</p>
                </div>
              ) : (
                <div className="vd-reviews-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20, marginTop: 24 }}>
                  {reviews.map(r => (
                    <div className="vd-review-card" key={r._id} style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          {r.productId?.image ? (
                            <img src={imgUrl(r.productId.image)} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, background: '#f8f9fa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{r.productId?.emoji || '🛒'}</div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{r.productId?.name || 'Deleted Product'}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{new Date(r.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 2, color: 'var(--amber)', fontSize: 14 }}>
                          {[1,2,3,4,5].map(s => <span key={s}>{s <= r.rating ? '★' : '☆'}</span>)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f8f9fa' }}>
                        {r.userAvatar ? (
                          <img src={`http://localhost:5000${r.userAvatar}`} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green-100)', color: 'var(--green-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                            {r.userName?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.userName}</div>
                      </div>
                      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.5, marginTop: 10, marginBottom: 0 }}>"{r.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ EDIT PRODUCT MODAL ══ */}
      {isEditModalOpen && (
        <div className="vd-modal-overlay">
          <div className="vd-modal-card">
            <div className="vd-modal-header">
              <h3><FiEdit2 /> Edit Product</h3>
              <button className="vd-modal-close" onClick={() => setIsEditModalOpen(false)}><FiX /></button>
            </div>
            <div className="vd-modal-body">
              <div className="vd-form-grid">
                <div className="vd-form-field vd-form-full">
                  <label>Product Name</label>
                  <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="vd-form-field">
                  <label>Original Price (₹)</label>
                  <input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} />
                </div>
                <div className="vd-form-field">
                  <label>Selling Price (₹)</label>
                  <input type="number" value={editForm.discountPrice} onChange={e => setEditForm({ ...editForm, discountPrice: e.target.value })} />
                </div>
                <div className="vd-form-field">
                  <label>Stock / Quantity</label>
                  <input type="number" value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })} />
                </div>
                <div className="vd-form-field">
                  <label>Unit (kg, g, pc)</label>
                  <input value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })} />
                </div>
                <div className="vd-form-field vd-form-full">
                  <label>Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="out">Out of Stock</option>
                  </select>
                </div>
                <div className="vd-form-field vd-form-full">
                  <label>Description</label>
                  <textarea rows={3} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="vd-modal-footer">
              <button className="vd-btn outline" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
              <button className="vd-btn primary" onClick={saveProductEdit} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ShopField({ label, icon, value, onChange, placeholder, full, type = 'text' }) {
  return (
    <div className={`vd-form-field ${full ? 'vd-form-full' : ''}`}>
      <label>{icon} {label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function FiX() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
