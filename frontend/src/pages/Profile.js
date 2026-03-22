import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext, FavoritesContext, CartContext } from '../App';
import {
  FiUser, FiMail, FiHeart, FiShoppingCart, FiPhone,
  FiMapPin, FiLogOut, FiEdit2, FiTrash2, FiCamera,
  FiCheck, FiX, FiAlertTriangle, FiPackage, FiSettings,
  FiSave, FiCalendar, FiHome, FiGlobe
} from 'react-icons/fi';
import './Profile.css';

export default function Profile() {
  const { auth, authLoading, logout, login } = useContext(AuthContext);
  const { favorites } = useContext(FavoritesContext);
  const { cartItems } = useContext(CartContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [avatar, setAvatar] = useState(() => localStorage.getItem(`avatar_${auth?.user?.id}`) || null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [memberSince, setMemberSince] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }
  const [hasChanges, setHasChanges] = useState(false);
  const fileRef = useRef();

  const user = auth?.user;
  const token = auth?.token;
  const avatarKey = `avatar_${user?.id}`;
  const extraKey = `extra_${user?.id}`;

  // Load saved extra info from backend
  const [form, setForm] = useState({
    name:    user?.name  || '',
    email:   user?.email || '',
    phone: '', gender: '', dob: '', bio: '',
    address: '', city: '', state: '', pincode: '', country: 'India',
  });

  useEffect(() => {
    if (!user?.id) return;
    fetch(`http://localhost:5000/api/users/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setForm(f => ({
          ...f,
          name:    data.name    || f.name,
          phone:   data.phone   || '',
          gender:  data.gender  || '',
          dob:     data.dob     || '',
          bio:     data.bio     || '',
          address: data.address || '',
          city:    data.city    || '',
          state:   data.state   || '',
          pincode: data.pincode || '',
          country: data.country || 'India',
        }));
        if (data.createdAt) {
          setMemberSince(new Date(data.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
        }
      })
      .catch(() => {});
  }, [user?.id]); // eslint-disable-line

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Fetch orders for Activity tab
  useEffect(() => {
    if (!auth || activeTab !== 'activity') return;
    setOrdersLoading(true);
    fetch(`http://localhost:5000/api/orders?userId=${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [activeTab, auth]);

  useEffect(() => {
    if (!authLoading && !auth) navigate('/login');
  }, [auth, authLoading, navigate]);

  if (authLoading) return null;
  if (!auth) return null;

  /* ── Avatar ── */
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('avatar', file);
    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}/avatar`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (data.avatarUrl) {
        const bustedUrl = `${data.avatarUrl}?t=${Date.now()}`;
        setAvatar(bustedUrl);
        localStorage.setItem(avatarKey, bustedUrl);
        window.dispatchEvent(new Event('avatarUpdated'));
        showToast('success', 'Profile picture updated!');
      } else {
        showToast('error', 'Upload failed. Try again.');
      }
    } catch {
      showToast('error', 'Server error. Make sure backend is running.');
    }
  };

  const removeAvatar = () => {
    localStorage.removeItem(avatarKey);
    setAvatar(null);
    window.dispatchEvent(new Event('avatarUpdated'));
    showToast('success', 'Profile picture removed.');
  };

  /* ── Save all changes ── */
  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'Name cannot be empty.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name:    form.name.trim(),
          phone:   form.phone,
          gender:  form.gender,
          dob:     form.dob,
          bio:     form.bio,
          address: form.address,
          city:    form.city,
          state:   form.state,
          pincode: form.pincode,
          country: form.country,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast('error', data.message || 'Failed to save.'); return; }

      // Update auth context + localStorage with latest name
      const updatedUser = { ...user, name: data.user.name };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      login(token, updatedUser);

      setHasChanges(false);
      showToast('success', 'Profile saved successfully!');
    } catch {
      showToast('error', 'Server error. Make sure backend is running.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete account ── */
  const handleDelete = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('success', 'Account deleted successfully.');
        setTimeout(() => {
          logout();
          localStorage.clear();
          navigate('/');
        }, 1500);
      } else {
        const d = await res.json();
        showToast('error', d.message || 'Deletion failed.');
      }
    } catch {
      showToast('error', 'Server error. Could not delete account.');
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setDeleteInput('');
    }
  };

  const cartQty   = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  const tabs = [
    { id: 'overview', label: 'Overview',  icon: <FiUser /> },
    { id: 'edit',     label: 'Edit Profile', icon: <FiEdit2 /> },
    { id: 'activity', label: 'Orders',    icon: <FiPackage /> },
    { id: 'settings', label: 'Settings',  icon: <FiSettings /> },
  ];

  return (
    <div className="pp-page">

      {/* ══ TOAST ══ */}
      {toast && (
        <div className={`pp-toast ${toast.type}`}>
          {toast.type === 'success' ? <FiCheck /> : <FiX />}
          {toast.msg}
        </div>
      )}

      {/* ══ HERO ══ */}
      <div className="pp-hero">
        <div className="pp-hero-inner">
          <div className="pp-avatar-wrap">
            <div className="pp-avatar">
              {avatar
                ? <img src={avatar} alt="avatar" />
                : <span>{form.name.charAt(0).toUpperCase()}</span>}
            </div>
            <button className="pp-cam-btn" onClick={() => fileRef.current.click()} title="Change photo">
              <FiCamera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          </div>
          <div className="pp-hero-info">
            <h1 className="pp-name">{form.name}</h1>
            <p className="pp-email"><FiMail size={13} /> {user.email}</p>
            <div className="pp-hero-badges">
              {user.roles?.map(r => (
                <span key={r} className={`pp-role-badge ${r}`}>{r}</span>
              )) || <span className={`pp-role-badge ${user.role}`}>{user.role}</span>}
              {memberSince && <span className="pp-since-badge"><FiCalendar size={11} /> Member since {memberSince}</span>}
            </div>
          </div>
          <div className="pp-hero-actions">
            <button className="pp-btn outline" onClick={() => setActiveTab('settings')}><FiSettings /> Settings</button>
            <button className="pp-btn danger-outline" onClick={() => { logout(); navigate('/'); }}><FiLogOut /> Logout</button>
          </div>
        </div>
      </div>

      {/* ══ TABS ══ */}
      <div className="pp-tabs-wrap">
        <div className="pp-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`pp-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.icon} {t.label}
              {t.id === 'edit' && hasChanges && <span className="pp-tab-dot" />}
            </button>
          ))}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="pp-body">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="pp-grid">
            <div className="pp-card">
              <div className="pp-card-header"><FiUser /> Personal Info</div>
              <InfoRow label="Full Name"    value={form.name} />
              <InfoRow label="Email"        value={user.email} />
              <InfoRow label="Phone"        value={form.phone    || <Placeholder />} />
              <InfoRow label="Gender"       value={form.gender   || <Placeholder />} />
              <InfoRow label="Date of Birth" value={form.dob    || <Placeholder />} />
              <InfoRow label="Bio"          value={form.bio      || <Placeholder />} />
              <button className="pp-edit-tab-btn" onClick={() => setActiveTab('edit')}>
                <FiEdit2 size={13} /> Edit Profile
              </button>
            </div>

            <div className="pp-card">
              <div className="pp-card-header"><FiHome /> Address</div>
              <InfoRow label="Address"  value={form.address || <Placeholder />} />
              <InfoRow label="City"     value={form.city    || <Placeholder />} />
              <InfoRow label="State"    value={form.state   || <Placeholder />} />
              <InfoRow label="Pincode"  value={form.pincode || <Placeholder />} />
              <InfoRow label="Country"  value={form.country || <Placeholder />} />
              <button className="pp-edit-tab-btn" onClick={() => setActiveTab('edit')}>
                <FiEdit2 size={13} /> Edit Address
              </button>
            </div>

            <div className="pp-card pp-span2">
              <div className="pp-card-header"><FiShoppingCart /> Quick Actions</div>
              <div className="pp-quick-actions">
                <Link to="/cart" className="pp-action-tile green">
                  <FiShoppingCart size={22} /><strong>{cartQty}</strong><span>View Cart</span>
                </Link>
                <Link to="/favorites" className="pp-action-tile red">
                  <FiHeart size={22} /><strong>{favorites.length}</strong><span>Favorites</span>
                </Link>
                <Link to="/products" className="pp-action-tile blue">
                  <FiPackage size={22} /><strong>34</strong><span>Products</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT PROFILE ── */}
        {activeTab === 'edit' && (
          <div className="pp-card pp-full">
            <div className="pp-card-header"><FiEdit2 /> Edit Profile</div>

            <div className="pp-form-section-title">Personal Information</div>
            <div className="pp-form-grid">
              <FormField label="Full Name *" icon={<FiUser />}>
                <input value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Your full name" />
              </FormField>
              <FormField label="Email Address" icon={<FiMail />}>
                <input value={form.email} disabled placeholder="Email" className="pp-disabled" />
              </FormField>
              <FormField label="Phone Number" icon={<FiPhone />}>
                <input value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+91 98765 43210" maxLength={15} />
              </FormField>
              <FormField label="Gender" icon={<FiUser />}>
                <select value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </FormField>
              <FormField label="Date of Birth" icon={<FiCalendar />}>
                <input type="date" value={form.dob} onChange={e => handleChange('dob', e.target.value)} />
              </FormField>
              <FormField label="Account Roles" icon={<FiShield />}>
                <input value={user.roles?.join(', ') || user.role} disabled className="pp-disabled" style={{ textTransform: 'capitalize' }} />
              </FormField>
            </div>

            <FormField label="Bio / About Me" icon={<FiUser />} full>
              <textarea
                value={form.bio}
                onChange={e => handleChange('bio', e.target.value)}
                placeholder="Write a short bio about yourself..."
                rows={3}
                maxLength={200}
              />
              <span className="pp-char-count">{form.bio.length}/200</span>
            </FormField>

            <div className="pp-form-divider" />
            <div className="pp-form-section-title">Address Information</div>
            <div className="pp-form-grid">
              <FormField label="Street Address" icon={<FiHome />} full>
                <input value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="House no., Street, Area" />
              </FormField>
              <FormField label="City" icon={<FiMapPin />}>
                <input value={form.city} onChange={e => handleChange('city', e.target.value)} placeholder="City" />
              </FormField>
              <FormField label="State" icon={<FiMapPin />}>
                <input value={form.state} onChange={e => handleChange('state', e.target.value)} placeholder="State" />
              </FormField>
              <FormField label="Pincode" icon={<FiMapPin />}>
                <input value={form.pincode} onChange={e => handleChange('pincode', e.target.value)} placeholder="Pincode" maxLength={6} />
              </FormField>
              <FormField label="Country" icon={<FiGlobe />}>
                <input value={form.country} onChange={e => handleChange('country', e.target.value)} placeholder="Country" />
              </FormField>
            </div>

            {/* Save Button */}
            <div className="pp-save-bar">
              {hasChanges && <span className="pp-unsaved-note">⚠ You have unsaved changes</span>}
              <button
                className={`pp-save-btn ${saving ? 'loading' : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <><span className="pp-spinner" /> Saving...</>
                ) : (
                  <><FiSave size={16} /> Save Changes</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {activeTab === 'activity' && (
          <div className="pp-card pp-full">
            <div className="pp-card-header">
              <FiPackage /> Order History
              {orders.length > 0 && <span className="pp-order-count">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>}
            </div>
            {ordersLoading ? (
              <div className="pp-empty"><span className="pp-spinner" style={{width:32,height:32,borderWidth:3}} /><p>Loading orders...</p></div>
            ) : orders.length > 0 ? (
              <div className="pp-order-list">
                {orders.map(order => (
                  <div className="pp-order-card" key={order._id}>

                    {/* Head */}
                    <div className="pp-order-head">
                      <div className="pp-order-id">
                        <span className="pp-order-icon">🧾</span>
                        <div>
                          <strong>{order.orderId || `#${order._id?.slice(-8).toUpperCase()}`}</strong>
                          <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                        </div>
                      </div>
                      <div className="pp-order-meta">
                        {order.coupon && <span className="pp-coupon">🏷️ {order.coupon}</span>}
                        {order.payMode && <span className="pp-order-pay">{order.payMode === 'cod' ? '💵 Cash on Delivery' : '📱 Online Payment'}</span>}
                        <span className="pp-order-total">₹{order.total}</span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="pp-order-items">
                      {order.items?.map((item, i) => {
                        const imgSrc = item.image || '';
                        return (
                          <div className="pp-order-item" key={i}>
                            <div className="pp-oi-img">
                              {imgSrc
                                ? <img src={imgSrc} alt={item.name} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                                : null}
                              <span className="pp-oi-emoji" style={{ display: imgSrc ? 'none' : 'flex' }}>{item.emoji || '🛒'}</span>
                            </div>
                            <div className="pp-oi-info">
                              <span className="pp-oi-name">{item.name || `Item ${i + 1}`}</span>
                              {item.unit && <span className="pp-oi-unit">{item.unit}</span>}
                            </div>
                            <div className="pp-oi-right">
                              <span className="pp-oi-qty">×{item.qty}</span>
                              <span className="pp-oi-price">₹{item.price * item.qty}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="pp-order-foot">
                      <div className="pp-order-foot-left">
                        {order.address && (
                          <span className="pp-order-addr">
                            📍 {order.address.line1}, {order.address.city} — {order.address.pincode}
                          </span>
                        )}
                      </div>
                      <div className="pp-order-foot-right">
                        <span>Subtotal ₹{order.subtotal}</span>
                        {order.discount > 0 && <span className="pp-order-disc">−₹{order.discount} saved</span>}
                        <span>{order.delivery === 0 ? '🚚 Free delivery' : `+₹${order.delivery} delivery`}</span>
                        <strong className="pp-order-grand">₹{order.total}</strong>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="pp-empty">
                <span>🛒</span>
                <p>No orders placed yet.</p>
                <Link to="/products" className="pp-link-btn">Browse Products</Link>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === 'settings' && (
          <div className="pp-card pp-full">
            <div className="pp-card-header"><FiSettings /> Account Settings</div>

            <div className="pp-setting-row">
              <div className="pp-setting-info">
                <strong>Profile Picture</strong>
                <span>Upload a photo to personalize your account</span>
              </div>
              <div className="pp-setting-actions">
                <button className="pp-btn outline" onClick={() => fileRef.current.click()}>
                  <FiCamera size={14} /> Upload Photo
                </button>
                {avatar && (
                  <button className="pp-btn danger-outline" onClick={removeAvatar}>
                    <FiX size={14} /> Remove
                  </button>
                )}
              </div>
            </div>

            <div className="pp-divider" />

            <div className="pp-setting-row">
              <div className="pp-setting-info">
                <strong>Edit Profile Info</strong>
                <span>Update your name, phone, address and more</span>
              </div>
              <button className="pp-btn outline" onClick={() => setActiveTab('edit')}>
                <FiEdit2 size={14} /> Edit Profile
              </button>
            </div>

            <div className="pp-divider" />

            <div className="pp-setting-row">
              <div className="pp-setting-info">
                <strong>Sign Out</strong>
                <span>Log out from your current session</span>
              </div>
              <button className="pp-btn danger-outline" onClick={() => { logout(); navigate('/'); }}>
                <FiLogOut size={14} /> Logout
              </button>
            </div>

            <div className="pp-divider" />

            <div className="pp-setting-row danger-zone">
              <div className="pp-setting-info">
                <strong>Delete Account</strong>
                <span>Permanently remove your account and all data. This cannot be undone.</span>
              </div>
              <button className="pp-btn danger" onClick={() => setShowDeleteModal(true)}>
                <FiTrash2 size={14} /> Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ DELETE MODAL ══ */}
      {showDeleteModal && (
        <div className="pp-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="pp-modal" onClick={e => e.stopPropagation()}>
            <div className="pp-modal-icon"><FiAlertTriangle /></div>
            <h3>Delete Account?</h3>
            <p>This will permanently delete your account and all data. Type <strong>DELETE</strong> to confirm.</p>
            <input
              className="pp-modal-input"
              placeholder="Type DELETE to confirm"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
            />
            <div className="pp-modal-btns">
              <button className="pp-btn outline" onClick={() => { setShowDeleteModal(false); setDeleteInput(''); }}>Cancel</button>
              <button className="pp-btn danger" disabled={deleteInput !== 'DELETE'} onClick={handleDelete}>
                <FiTrash2 size={14} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Small helper components ── */
function InfoRow({ label, value }) {
  return (
    <div className="pp-field">
      <label>{label}</label>
      <div className="pp-field-val">{value}</div>
    </div>
  );
}

function Placeholder() {
  return <span className="pp-placeholder">Not added yet</span>;
}

function FiShield() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function FormField({ label, icon, children, full }) {
  return (
    <div className={`pp-form-field ${full ? 'pp-form-full' : ''}`}>
      <label>{icon} {label}</label>
      {children}
    </div>
  );
}
