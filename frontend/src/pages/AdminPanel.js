import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { FiCheck, FiX, FiPackage, FiClock, FiAlertCircle, FiUser, FiTag, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import API from '../api';
import './AdminPanel.css';

const BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
const imgUrl = (src) => !src ? '' : src.startsWith('http') ? src : `${BASE_URL}${src}`;

export default function AdminPanel() {
  const { auth, authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Coupons state
  const [activeTab, setActiveTab]       = useState('approvals');
  const [coupons, setCoupons]           = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponForm, setCouponForm]     = useState({
    code: '', discountType: 'percent', discountValue: '',
    minOrder: '', maxUses: '', expiresAt: ''
  });
  const [couponError, setCouponError]   = useState('');
  const [couponSaving, setCouponSaving] = useState(false);

  // Users state
  const [users, setUsers]               = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);
  const [showAddUser, setShowAddUser]   = useState(false);
  const [newUser, setNewUser]           = useState({ name: '', email: '', password: '', roles: ['buyer'] });

  const headers = { Authorization: `Bearer ${auth?.token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!authLoading && (!auth || (!auth.user.roles?.includes('admin') && auth.user.role !== 'admin'))) navigate('/');
  }, [auth, authLoading, navigate]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/pending-products`, { headers });
      if (res.ok) setPendingProducts(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { if (auth?.user?.roles?.includes('admin') || auth?.user?.role === 'admin') fetchPending(); }, [auth]);

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      const res = await fetch(`${API}/admin/coupons`, { headers });
      if (res.ok) setCoupons(await res.json());
    } catch {}
    finally { setCouponsLoading(false); }
  };

  useEffect(() => {
    const isAdmin = auth?.user?.roles?.includes('admin') || auth?.user?.role === 'admin';
    if (isAdmin && activeTab === 'coupons') fetchCoupons();
    if (isAdmin && activeTab === 'users') fetchUsers();
  }, [auth, activeTab]); // eslint-disable-line

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${API}/admin/users`, { headers });
      if (res.ok) setUsers(await res.json());
    } catch {}
    finally { setUsersLoading(false); }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setCouponError('');
    if (!couponForm.code.trim()) return setCouponError('Coupon code is required.');
    if (!couponForm.discountValue) return setCouponError('Discount value is required.');
    if (!couponForm.expiresAt) return setCouponError('Expiry date is required.');
    setCouponSaving(true);
    try {
      const res = await fetch(`${API}/admin/coupons`, {
        method: 'POST', headers,
        body: JSON.stringify({
          code: couponForm.code.trim().toUpperCase(),
          discountType: couponForm.discountType,
          discountValue: Number(couponForm.discountValue),
          minOrder: Number(couponForm.minOrder) || 0,
          maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : null,
          expiresAt: couponForm.expiresAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setCouponError(data.message || 'Failed to create coupon.');
      setCoupons(prev => [data, ...prev]);
      setCouponForm({ code: '', discountType: 'percent', discountValue: '', minOrder: '', maxUses: '', expiresAt: '' });
      showToast('Coupon created successfully!');
    } catch { setCouponError('Server error.'); }
    finally { setCouponSaving(false); }
  };

  const toggleCoupon = async (id, active) => {
    try {
      const res = await fetch(`${API}/admin/coupons/${id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ active: !active }),
      });
      if (res.ok) setCoupons(prev => prev.map(c => c._id === id ? { ...c, active: !active } : c));
    } catch {}
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      const res = await fetch(`${API}/admin/coupons/${id}`, { method: 'DELETE', headers });
      if (res.ok) { setCoupons(prev => prev.filter(c => c._id !== id)); showToast('Coupon deleted.'); }
    } catch {}
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (id, action, note = '') => {
    setActionLoading(id + action);
    try {
      const res = await fetch(`${API}/admin/pending-products/${id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ action, rejectionNote: note }),
      });
      if (res.ok) {
        setPendingProducts(prev => prev.filter(p => p._id !== id));
        showToast(action === 'approve' ? 'Product approved and published!' : 'Product rejected.');
        setRejectingId(null);
        setRejectionNote('');
      } else {
        const d = await res.json();
        showToast(d.message || 'Failed', 'error');
      }
    } catch { showToast('Server error', 'error'); }
    finally { setActionLoading(null); }
  };

  if (authLoading || !auth) return null;
  if (auth.user.roles && !auth.user.roles.includes('admin') && auth.user.role !== 'admin') return null;
  if (!auth.user.roles && auth.user.role !== 'admin') return null;

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) return showToast('All fields are required', 'error');
    if (newUser.roles.length === 0) return showToast('Select at least one role', 'error');
    try {
      const res = await fetch(`${API}/admin/users`, {
        method: 'POST', headers,
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.message || 'Failed to create user', 'error');
      setUsers(prev => [data.user || data, ...prev]);
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '', roles: ['buyer'] });
      showToast('User created successfully!');
    } catch { showToast('Failed to create user', 'error'); }
  };

  return (
    <div className="adm-page">
      {toast && (
        <div className={`adm-toast ${toast.type}`}>
          {toast.type === 'success' ? <FiCheck /> : <FiAlertCircle />} {toast.msg}
        </div>
      )}

      <div className="adm-hero">
        <h1>🛡️ Admin Panel</h1>
        <p>Manage vendor product approvals and platform settings</p>
      </div>

      {/* ── Tabs ── */}
      <div className="adm-tabs-wrap">
        <div className="adm-tabs">
          <button className={`adm-tab ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>
            <FiClock size={15} /> Pending Approvals
            {pendingProducts.length > 0 && <span className="adm-tab-badge">{pendingProducts.length}</span>}
          </button>
          <button className={`adm-tab ${activeTab === 'coupons' ? 'active' : ''}`} onClick={() => setActiveTab('coupons')}>
            <FiTag size={15} /> Coupons
          </button>
          <button className={`adm-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <FiUser size={15} /> Users
          </button>
        </div>
      </div>

      <div className="adm-container">

        {/* ── Pending Products ── */}
        {activeTab === 'approvals' && (
        <div className="adm-section">
          <div className="adm-section-header">
            <FiClock size={18} />
            <h2>Pending Product Approvals</h2>
            <span className="adm-count">{pendingProducts.length}</span>
          </div>

          {loading ? (
            <div className="adm-empty"><span>⏳</span><p>Loading...</p></div>
          ) : pendingProducts.length === 0 ? (
            <div className="adm-empty">
              <span>✅</span>
              <p>No pending approvals — all caught up!</p>
            </div>
          ) : (
            <div className="adm-product-list">
              {pendingProducts.map(p => (
                <div className="adm-product-card" key={p._id}>
                  <div className="adm-product-img">
                    {p.image
                      ? <img src={imgUrl(p.image)} alt={p.name} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                      : null}
                    <span style={{ display: p.image ? 'none' : 'flex' }}>{p.emoji || '🛒'}</span>
                  </div>
                  <div className="adm-product-info">
                    <div className="adm-product-name">{p.name}</div>
                    <div className="adm-product-meta">
                      <span className="adm-cat">{p.category}</span>
                      <span>₹{p.discountPrice || p.price} / {p.unit}</span>
                      <span>Stock: {p.stock}</span>
                    </div>
                    {p.description && <div className="adm-product-desc">{p.description}</div>}
                    <div className="adm-vendor-info">
                      <FiUser size={12} />
                      <span>{p.vendorId?.name || 'Unknown Vendor'}</span>
                      <span className="adm-vendor-email">{p.vendorId?.email}</span>
                    </div>
                    <div className="adm-submitted">
                      Submitted: {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="adm-product-actions">
                    <button
                      className="adm-btn approve"
                      disabled={actionLoading === p._id + 'approve'}
                      onClick={() => handleAction(p._id, 'approve')}
                    >
                      <FiCheck size={14} /> {actionLoading === p._id + 'approve' ? '...' : 'Approve'}
                    </button>
                    {rejectingId === p._id ? (
                      <div className="adm-reject-form">
                        <input
                          placeholder="Reason (optional)"
                          value={rejectionNote}
                          onChange={e => setRejectionNote(e.target.value)}
                          className="adm-reject-input"
                        />
                        <div className="adm-reject-btns">
                          <button className="adm-btn reject"
                            disabled={actionLoading === p._id + 'reject'}
                            onClick={() => handleAction(p._id, 'reject', rejectionNote)}>
                            <FiX size={13} /> {actionLoading === p._id + 'reject' ? '...' : 'Confirm Reject'}
                          </button>
                          <button className="adm-btn cancel" onClick={() => { setRejectingId(null); setRejectionNote(''); }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button className="adm-btn reject" onClick={() => setRejectingId(p._id)}>
                        <FiX size={14} /> Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* ── Coupons ── */}
        {activeTab === 'coupons' && (
          <div className="adm-section">
            <div className="adm-section-header">
              <FiTag size={18} />
              <h2>Coupon Management</h2>
            </div>

            {/* Create form */}
            <form className="adm-coupon-form" onSubmit={handleCreateCoupon}>
              <div className="adm-coupon-form-title"><FiPlus size={14} /> Create New Coupon</div>
              <div className="adm-coupon-grid">
                <div className="adm-cf">
                  <label>Code *</label>
                  <input placeholder="e.g. FRESH20" value={couponForm.code}
                    onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                </div>
                <div className="adm-cf">
                  <label>Discount Type</label>
                  <select value={couponForm.discountType} onChange={e => setCouponForm(f => ({ ...f, discountType: e.target.value }))}>
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div className="adm-cf">
                  <label>Discount Value *</label>
                  <input type="number" min="1" placeholder={couponForm.discountType === 'percent' ? 'e.g. 20' : 'e.g. 100'}
                    value={couponForm.discountValue}
                    onChange={e => setCouponForm(f => ({ ...f, discountValue: e.target.value }))} />
                </div>
                <div className="adm-cf">
                  <label>Min Order (₹)</label>
                  <input type="number" min="0" placeholder="0 = no minimum"
                    value={couponForm.minOrder}
                    onChange={e => setCouponForm(f => ({ ...f, minOrder: e.target.value }))} />
                </div>
                <div className="adm-cf">
                  <label>Max Uses</label>
                  <input type="number" min="1" placeholder="Leave blank = unlimited"
                    value={couponForm.maxUses}
                    onChange={e => setCouponForm(f => ({ ...f, maxUses: e.target.value }))} />
                </div>
                <div className="adm-cf">
                  <label>Expires At *</label>
                  <input type="date" value={couponForm.expiresAt}
                    onChange={e => setCouponForm(f => ({ ...f, expiresAt: e.target.value }))} />
                </div>
              </div>
              {couponError && <p className="adm-coupon-error">{couponError}</p>}
              <button type="submit" className="adm-btn approve" disabled={couponSaving} style={{ marginTop: 12, alignSelf: 'flex-start', padding: '10px 24px' }}>
                <FiPlus size={14} /> {couponSaving ? 'Creating...' : 'Create Coupon'}
              </button>
            </form>

            {/* Coupon list */}
            <div className="adm-coupon-list">
              {couponsLoading ? (
                <div className="adm-empty"><span>⏳</span><p>Loading coupons...</p></div>
              ) : coupons.length === 0 ? (
                <div className="adm-empty"><span>🎟️</span><p>No coupons yet. Create one above.</p></div>
              ) : (
                coupons.map(c => (
                  <div className={`adm-coupon-card ${!c.active ? 'inactive' : ''}`} key={c._id}>
                    <div className="adm-coupon-code">
                      <span className="adm-coupon-tag">🎟️ {c.code}</span>
                      <span className={`adm-coupon-status ${c.active ? 'active' : 'off'}`}>
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="adm-coupon-details">
                      <span className="adm-coupon-val">
                        {c.discountType === 'percent' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                      </span>
                      {c.minOrder > 0 && <span>Min ₹{c.minOrder}</span>}
                      <span>{c.maxUses ? `${c.usedCount}/${c.maxUses} used` : `${c.usedCount} used`}</span>
                      <span>Expires: {new Date(c.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="adm-coupon-actions">
                      <button className={`adm-btn ${c.active ? 'reject' : 'approve'}`} onClick={() => toggleCoupon(c._id, c.active)} style={{ padding: '6px 14px', fontSize: 12 }}>
                        {c.active ? <><FiToggleRight size={13} /> Disable</> : <><FiToggleLeft size={13} /> Enable</>}
                      </button>
                      <button className="adm-btn cancel" onClick={() => deleteCoupon(c._id)} style={{ padding: '6px 12px', fontSize: 12 }}>
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {activeTab === 'users' && (
          <div className="adm-section">
            <div className="adm-section-header">
              <FiUser size={18} />
              <h2>All Users</h2>
              <button className="adm-btn approve" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setShowAddUser(true)}>
                <FiPlus size={14} /> Add User
              </button>
              <span className="adm-count" style={{ marginLeft: '10px' }}>{users.length}</span>
            </div>
            {usersLoading ? (
              <div className="adm-empty"><span>⏳</span><p>Loading users...</p></div>
            ) : users.length === 0 ? (
              <div className="adm-empty"><span>👥</span><p>No users found.</p></div>
            ) : (
              <div className="adm-user-list">
                {users.map(u => (
                  <div className="adm-user-card" key={u._id}>
                    <div className="adm-user-row" onClick={() => setExpandedUser(expandedUser === u._id ? null : u._id)}>
                      <div className="adm-user-avatar">
                        {u.avatar
                          ? <img src={u.avatar.startsWith('http') ? u.avatar : `${BASE_URL}${u.avatar}`} alt={u.name} onError={e => e.target.style.display='none'} />
                          : <span>{u.name?.[0]?.toUpperCase() || '?'}</span>}
                      </div>
                      <div className="adm-user-info">
                        <strong>{u.name}</strong>
                        <span>{u.email}</span>
                      </div>
                      <div className="adm-user-meta">
                        <div className="adm-roles-list">
                          {u.roles?.map(r => (
                            <span key={r} className={`adm-role-badge ${r}`}>{r}</span>
                          )) || <span className={`adm-role-badge ${u.role}`}>{u.role}</span>}
                        </div>
                        <span className="adm-user-date">{new Date(u.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                      </div>
                      <span className="adm-user-chevron">{expandedUser === u._id ? '▲' : '▼'}</span>
                    </div>
                    {expandedUser === u._id && (
                      <div className="adm-user-details">
                        {[
                          ['Phone',    u.phone],
                          ['Gender',   u.gender],
                          ['DOB',      u.dob],
                          ['Bio',      u.bio],
                          ['Address',  u.address],
                          ['City',     u.city],
                          ['State',    u.state],
                          ['Pincode',  u.pincode],
                          ['Country',  u.country],
                        ].filter(([, v]) => v).map(([label, value]) => (
                          <div className="adm-user-detail-row" key={label}>
                            <span className="adm-detail-label">{label}</span>
                            <span className="adm-detail-value">{value}</span>
                          </div>
                        ))}
                        {!u.phone && !u.address && !u.city && (
                          <p className="adm-no-details">No additional profile info added yet.</p>
                        )}

                        <div className="adm-manage-roles">
                          <div className="adm-detail-label">Manage Roles</div>
                          <div className="adm-role-checks">
                            {['buyer', 'vendor', 'admin'].map(r => (
                              <label key={r} className="adm-role-check">
                                <input
                                  type="checkbox"
                                  checked={(u.roles || [u.role]).includes(r)}
                                  onChange={async (e) => {
                                    const currentRoles = u.roles?.length ? u.roles : [u.role];
                                    const newRoles = e.target.checked
                                      ? [...new Set([...currentRoles, r])]
                                      : currentRoles.filter(x => x !== r);
                                    if (newRoles.length === 0) return showToast('User must have at least one role', 'error');
                                    
                                    try {
                                      const res = await fetch(`${API}/admin/users/${u._id}`, {
                                        method: 'PATCH',
                                        headers,
                                        body: JSON.stringify({ roles: newRoles })
                                      });
                                      if (res.ok) {
                                        setUsers(prev => prev.map(user => user._id === u._id ? { ...user, roles: newRoles } : user));
                                        showToast(`Roles updated for ${u.name}`);
                                      }
                                    } catch { showToast('Failed to update roles', 'error'); }
                                  }}
                                />
                                <span>{r}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showAddUser && (
          <div className="adm-modal-overlay" onClick={() => setShowAddUser(false)}>
            <div className="adm-modal" onClick={e => e.stopPropagation()}>
              <div className="adm-modal-header">
                <h3>Add New User</h3>
                <button className="adm-btn-close" onClick={() => setShowAddUser(false)}><FiX size={20} /></button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="adm-modal-body">
                  <div className="adm-form-group">
                    <label>Full Name</label>
                    <input className="adm-input" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div className="adm-form-group">
                    <label>Email Address</label>
                    <input className="adm-input" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="john@example.com" />
                  </div>
                  <div className="adm-form-group">
                    <label>Password</label>
                    <input className="adm-input" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••••" />
                  </div>
                  <div className="adm-form-group">
                    <label>Assign Roles (Select multiple)</label>
                    <div className="adm-role-checks" style={{ marginTop: '8px' }}>
                      {['buyer', 'vendor', 'admin'].map(r => (
                        <label key={r} className="adm-role-check">
                          <input
                            type="checkbox"
                            checked={newUser.roles.includes(r)}
                            onChange={e => {
                              const roles = e.target.checked
                                ? [...newUser.roles, r]
                                : newUser.roles.filter(x => x !== r);
                              setNewUser({ ...newUser, roles });
                            }}
                          />
                          <span style={{ textTransform: 'capitalize' }}>{r}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="adm-modal-footer">
                  <button type="button" className="adm-btn cancel" onClick={() => setShowAddUser(false)}>Cancel</button>
                  <button type="submit" className="adm-btn approve">Create User</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
