import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import API from '../api';
import Lenis from 'lenis';
import { CATEGORY_META } from '../defaultProducts';
import {
  FiUsers, FiPackage, FiShoppingBag, FiShoppingCart,
  FiBarChart2, FiTrash2, FiEdit2, FiCheck, FiX,
  FiLogOut, FiRefreshCw, FiBook, FiDollarSign,
  FiSearch, FiPlus, FiCreditCard, FiGrid, FiMenu, FiTag, FiCopy, FiClock
} from 'react-icons/fi';
import './Dashboard.css';

const TABS = [
  { id: 'stats',           label: 'Overview',         icon: <FiBarChart2 /> },
  { id: 'users',           label: 'Users',            icon: <FiUsers /> },
  { id: 'vendors',         label: 'Vendor Payments',  icon: <FiCreditCard /> },
  { id: 'products',        label: 'Products',         icon: <FiPackage /> },
  { id: 'shops',           label: 'Shops',            icon: <FiShoppingBag /> },
  { id: 'orders',          label: 'Orders',           icon: <FiShoppingCart /> },
  { id: 'catalog',         label: 'Catalog',          icon: <FiBook /> },
  { id: 'categories',      label: 'Categories',       icon: <FiGrid /> },
  { id: 'navbar',          label: 'Navbar',           icon: <FiMenu /> },
  { id: 'coupons',         label: 'Coupons',          icon: <FiTag /> },
  { id: 'approvals',        label: 'Approvals',         icon: <FiClock /> },
];

const ROLES    = ['buyer', 'vendor', 'admin'];
const STATUSES = ['active', 'out'];

function ApprovalCard({ p, onAction }) {
  const imgSrc = p.image ? (p.image.startsWith('http') ? p.image : `http://localhost:5000${p.image}`) : '';
  return (
    <div className="ad-approval-card">
      <div className="ad-approval-img">
        {imgSrc ? <img src={imgSrc} alt={p.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} /> : null}
        <span style={{display:imgSrc?'none':'flex',fontSize:36}}>{p.emoji||'🛒'}</span>
      </div>
      <div className="ad-approval-body">
        <div className="ad-approval-name">{p.name}</div>
        <div className="ad-approval-cat">{p.category}</div>
        <div className="ad-approval-meta"><span>₹{p.discountPrice||p.price}{p.unit?` / ${p.unit}`:''}</span><span>Stock: {p.stock}</span></div>
        <div className="ad-approval-vendor"><span>🏪 {p.vendorId?.name||'—'}</span><span style={{fontSize:11,color:'#999'}}>{p.vendorId?.email}</span></div>
        <div className="ad-approval-date">Submitted: {new Date(p.createdAt).toLocaleDateString()}</div>
        {p.description && <p className="ad-approval-desc">{p.description}</p>}
      </div>
      <div className="ad-approval-actions">
        <button className="ad-approval-btn approve" onClick={() => onAction(p._id, 'approve')}><FiCheck size={14}/> Approve</button>
        <button className="ad-approval-btn reject" onClick={() => onAction(p._id, 'reject')}><FiX size={14}/> Reject</button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { auth, authLoading, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !auth) navigate('/login');
    if (!authLoading && auth && !auth.user?.roles?.includes('admin') && auth.user?.role !== 'admin') navigate('/');
  }, [auth, authLoading, navigate]);

  const h = { Authorization: `Bearer ${auth?.token}`, 'Content-Type': 'application/json' };

  const [tab, setTab]           = useState('stats');
  const [stats, setStats]       = useState(null);
  const [users, setUsers]       = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser]   = useState({ name:'', email:'', password:'', roles:['buyer'], role:'buyer' });
  const [products, setProducts] = useState([]);
  const [shops, setShops]       = useState([]);
  const [orders, setOrders]     = useState([]);
  const [vendors, setVendors]   = useState([]);
  const [editShop, setEditShop]       = useState(null); // full shop object being edited
  const [shopAvatarFile, setShopAvatarFile] = useState(null);
  const [shopAvatarPreview, setShopAvatarPreview] = useState('');
  const [addProductFor, setAddProductFor] = useState(null); // vendorId
  const [newProd, setNewProd] = useState({ name:'', category:'', price:'', discountPrice:'', stock:'', unit:'', emoji:'🛒', description:'', status:'active' });
  const shopAvatarRef = React.useRef();
  const [catalog, setCatalog]   = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [editUser, setEditUser]       = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [editCat, setEditCat]         = useState(null);
  const [localDefaults, setLocalDefaults] = useState([]);
  const [editDp, setEditDp]               = useState(null);
  const [editDpImageFile, setEditDpImageFile]       = useState(null);
  const [editDpImagePreview, setEditDpImagePreview] = useState('');
  const [showAddDp, setShowAddDp]         = useState(false);
  const [newDp, setNewDp]                 = useState({ name:'', category:'', price:'', unit:'', badge:'', emoji:'🛒', desc:'', rating:'', reviews:'' });
  const [dpCatFilter, setDpCatFilter]     = useState('all');
  const [newDpImageFile, setNewDpImageFile]         = useState(null);
  const [newDpImagePreview, setNewDpImagePreview]   = useState('');

  // coupons
  const [coupons, setCoupons]   = useState([]);
  const [editCoupon, setEditCoupon] = useState(null);
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code:'', discountType:'percent', discountValue:'', minOrder:'', maxUses:'', expiresAt:'' });

  // approvals
  const [pendingProducts, setPendingProducts] = useState([]);
  const [approvedProducts, setApprovedProducts] = useState([]);
  const [rejectedProducts, setRejectedProducts] = useState([]);
  const [approvalTab, setApprovalTab] = useState('pending');

  // front categories
  const [frontCats, setFrontCats]     = useState([]);
  const [showAddFc, setShowAddFc]     = useState(false);
  const [editFc, setEditFc]           = useState(null);
  const [newFc, setNewFc]             = useState({ name:'', icon:'🏷️', color:'#51cf66', bg:'#f4fce3' });
  const [newFcImg, setNewFcImg]       = useState(null);
  const [newFcPrev, setNewFcPrev]     = useState('');
  const [editFcImg, setEditFcImg]     = useState(null);
  const [editFcPrev, setEditFcPrev]   = useState('');
  const newFcImgRef  = React.useRef();
  const editFcImgRef = React.useRef();

  // navbar config
  const [navbarCfg, setNavbarCfg]   = useState({ ticker: [], navCategories: [] });
  const [nbSaving, setNbSaving]     = useState(false);

  // catalog form
  const [newCatName, setNewCatName]     = useState('');
  const [newCatEmoji, setNewCatEmoji]   = useState('🛒');
  const [newCatImage, setNewCatImage]   = useState(null);
  const [newCatPreview, setNewCatPreview] = useState('');
  const [newItemCat, setNewItemCat]     = useState('');
  const [newItemName, setNewItemName]   = useState('');
  const [newItemUnit, setNewItemUnit]   = useState('kg');
  const [newItemImage, setNewItemImage] = useState(null);
  const [newItemPreview, setNewItemPreview] = useState('');
  const [addingItemTo, setAddingItemTo] = useState(null);
  const [editItem, setEditItem]         = useState(null); // { catId, itemId, name, unit }
  const catImageRef  = React.useRef();
  const itemImageRef = React.useRef();
  const itemUnitRef  = React.useRef();
  const topItemImgRef = React.useRef();
  // top-level add item form
  const [topItemCat,     setTopItemCat]     = useState('');
  const [topItemName,    setTopItemName]    = useState('');
  const [topItemUnit,    setTopItemUnit]    = useState('');
  const [topItemImage,   setTopItemImage]   = useState(null);
  const [topItemPreview, setTopItemPreview] = useState('');
  const topItemUnitRef = React.useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async (endpoint, setter) => {
    if (!auth?.token) return;
    const headers = { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' };
    const r = await fetch(`${API}/admin/${endpoint}`, { headers });
    if (r.ok) setter(await r.json());
    else if (r.status === 401) showToast('Session expired — please log in again');
    else showToast(`Error loading ${endpoint}`);
  }, [auth?.token]); // eslint-disable-line

  const fetchers = {
    stats:           useCallback(() => load('stats',            setStats),          [load]),
    users:           useCallback(() => load('users',            setUsers),          [load]),
    vendors:         useCallback(() => load('vendors',          setVendors),        [load]),
    products:        useCallback(() => load('products',         setProducts),       [load]),
    defaultproducts: useCallback(() => load('default-products', setLocalDefaults),  [load]),
    shops:           useCallback(() => load('shops',            setShops),          [load]),
    orders:          useCallback(() => load('orders',           setOrders),         [load]),
    catalog:         useCallback(() => load('catalog',          setCatalog),        [load]),
    categories:      useCallback(() => load('front-categories',  setFrontCats),      [load]),
    coupons:         useCallback(() => load('coupons',            setCoupons),        [load]),
    approvals:       useCallback(async () => {
      if (!auth?.token) return;
      const h2 = { Authorization: `Bearer ${auth.token}` };
      const [r1, r2, r3] = await Promise.all([
        fetch(`${API}/admin/pending-products?status=pending`,  { headers: h2 }),
        fetch(`${API}/admin/pending-products?status=approved`, { headers: h2 }),
        fetch(`${API}/admin/pending-products?status=rejected`, { headers: h2 }),
      ]);
      if (r1.ok) setPendingProducts(await r1.json());
      if (r2.ok) setApprovedProducts(await r2.json());
      if (r3.ok) setRejectedProducts(await r3.json());
    }, [auth?.token]), // eslint-disable-line
    navbar:          useCallback(async () => {
      if (!auth?.token) return;
      const headers = { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' };
      const [r1, r2] = await Promise.all([
        fetch(`${API}/admin/navbar-config`, { headers }),
        fetch(`${API}/admin/front-categories`, { headers }),
      ]);
      if (r1.ok) { const d = await r1.json(); setNavbarCfg({ ticker: d.ticker || [], navCategories: d.navCategories || [] }); }
      if (r2.ok) setFrontCats(await r2.json());
    }, [auth?.token]), // eslint-disable-line
  };

  const refresh = useCallback(() => {
    setLoading(true);
    fetchers[tab]?.().finally(() => setLoading(false));
  }, [tab, fetchers[tab]]); // eslint-disable-line

  useEffect(() => { setSearch(''); setRoleFilter('all'); refresh(); }, [tab]); // eslint-disable-line

  /* ── Users ── */
  const addUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) return showToast('Name, Email, and Password required');
    const r = await fetch(`${API}/admin/users`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ ...newUser, roles: newUser.roles || [newUser.role], role: newUser.role }),
    });
    if (r.ok) {
      showToast('User created'); fetchers.users(); setShowAddUser(false);
      setNewUser({ name:'', email:'', password:'', roles:['buyer'], role:'buyer' });
    } else { const d = await r.json(); showToast(d.message); }
  };

  const saveUser = async () => {
    const r = await fetch(`${API}/admin/users/${editUser._id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ name: editUser.name, roles: editUser.roles, role: editUser.role }),
    });
    if (r.ok) { showToast('User updated'); fetchers.users(); setEditUser(null); }
    else { const d = await r.json(); showToast(d.message); }
  };
  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    const r = await fetch(`${API}/admin/users/${id}`, { method: 'DELETE', headers: h });
    if (r.ok) { showToast('User deleted'); fetchers.users(); }
  };

  /* ── Products ── */
  const saveProduct = async () => {
    const r = await fetch(`${API}/admin/products/${editProduct._id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({
        name: editProduct.name, category: editProduct.category,
        price: Number(editProduct.price),
        discountPrice: editProduct.discountPrice ? Number(editProduct.discountPrice) : null,
        stock: Number(editProduct.stock), unit: editProduct.unit,
        status: editProduct.status, emoji: editProduct.emoji,
      }),
    });
    if (r.ok) { showToast('Product updated'); fetchers.products(); setEditProduct(null); }
    else { const d = await r.json(); showToast(d.message); }
  };
  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    const r = await fetch(`${API}/admin/products/${id}`, { method: 'DELETE', headers: h });
    if (r.ok) { showToast('Product deleted'); fetchers.products(); }
  };

  /* ── Shops ── */
  const saveShop = async () => {
    const fields = ['shopName','tagline','phone','email','website','description','address','city','state','pincode'];
    const body = {};
    fields.forEach(f => { body[f] = editShop[f] || ''; });
    const r = await fetch(`${API}/admin/shops/${editShop._id}`, { method:'PATCH', headers:h, body:JSON.stringify(body) });
    if (r.ok) {
      // upload avatar if changed
      if (shopAvatarFile) {
        const fd = new FormData(); fd.append('avatar', shopAvatarFile);
        await fetch(`${API}/admin/shops/${editShop._id}/avatar`, { method:'PATCH', headers:{ Authorization:`Bearer ${auth.token}` }, body:fd });
      }
      showToast('Shop updated'); fetchers.shops(); setEditShop(null); setShopAvatarFile(null); setShopAvatarPreview('');
      if (shopAvatarRef.current) shopAvatarRef.current.value = '';
    } else { const d = await r.json(); showToast(d.message); }
  };
  const deleteShop = async (id) => {
    if (!window.confirm('Delete this shop?')) return;
    const r = await fetch(`${API}/admin/shops/${id}`, { method: 'DELETE', headers: h });
    if (r.ok) { showToast('Shop deleted'); fetchers.shops(); }
  };
  const saveNewProduct = async () => {
    if (!newProd.name.trim() || !newProd.price || !newProd.stock) return showToast('Name, price and stock required');
    const body = { ...newProd, vendorId: addProductFor, price: Number(newProd.price), stock: Number(newProd.stock), discountPrice: newProd.discountPrice ? Number(newProd.discountPrice) : null };
    const r = await fetch(`${API}/admin/products/vendor`, { method:'POST', headers:h, body:JSON.stringify(body) });
    if (r.ok) { showToast('Product added'); setAddProductFor(null); setNewProd({ name:'', category:'', price:'', discountPrice:'', stock:'', unit:'', emoji:'🛒', description:'', status:'active' }); }
    else { const d = await r.json(); showToast(d.message); }
  };

  const saveDp = async () => {
    const fd = new FormData();
    ['name', 'category', 'unit', 'badge', 'emoji', 'desc'].forEach(f => fd.append(f, editDp[f] || ''));
    fd.append('price', Number(editDp.price));
    if (editDp.rating !== undefined && editDp.rating !== '') fd.append('rating', Number(editDp.rating));
    if (editDp.reviews !== undefined && editDp.reviews !== '') fd.append('reviews', Number(editDp.reviews));
    if (editDpImageFile) fd.append('image', editDpImageFile);
    const r = await fetch(`${API}/admin/default-products/${editDp._id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${auth.token}` },
      body: fd,
    });
    if (r.ok) {
      showToast('Product updated'); fetchers.defaultproducts();
      setEditDp(null); setEditDpImageFile(null); setEditDpImagePreview('');
    } else { const d = await r.json(); showToast(d.message); }
  };

  const addDp = async () => {
    if (!newDp.name.trim() || !newDp.price) return showToast('Name and price are required');
    const fd = new FormData();
    ['name', 'category', 'unit', 'badge', 'emoji', 'desc'].forEach(f => fd.append(f, newDp[f] || ''));
    fd.append('price', Number(newDp.price));
    if (newDp.rating) fd.append('rating', Number(newDp.rating));
    if (newDp.reviews) fd.append('reviews', Number(newDp.reviews));
    if (newDpImageFile) fd.append('image', newDpImageFile);
    const r = await fetch(`${API}/admin/default-products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
      body: fd,
    });
    if (r.ok) {
      showToast('Product added'); fetchers.defaultproducts();
      setShowAddDp(false);
      setNewDp({ name:'', category:'', price:'', unit:'', badge:'', emoji:'🛒', desc:'', rating:'', reviews:'' });
      setNewDpImageFile(null); setNewDpImagePreview('');
    } else { const d = await r.json(); showToast(d.message); }
  };

  const deleteDp = async (id) => {    if (!window.confirm('Delete this product?')) return;
    const r = await fetch(`${API}/admin/default-products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (r.ok) { showToast('Product deleted'); fetchers.defaultproducts(); }
    else { const d = await r.json(); showToast(d.message); }
  };

  /* ── Coupons ── */
  const genCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };
  const addCoupon = async () => {
    if (!newCoupon.code.trim() || !newCoupon.discountValue || !newCoupon.expiresAt)
      return showToast('Code, discount value and expiry are required');
    const r = await fetch(`${API}/admin/coupons`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ ...newCoupon, discountValue: Number(newCoupon.discountValue), minOrder: Number(newCoupon.minOrder || 0), maxUses: newCoupon.maxUses ? Number(newCoupon.maxUses) : null }),
    });
    if (r.ok) { showToast('Coupon created'); fetchers.coupons(); setShowAddCoupon(false); setNewCoupon({ code:'', discountType:'percent', discountValue:'', minOrder:'', maxUses:'', expiresAt:'' }); }
    else { const d = await r.json(); showToast(d.message); }
  };
  const saveCoupon = async () => {
    const r = await fetch(`${API}/admin/coupons/${editCoupon._id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ discountType: editCoupon.discountType, discountValue: Number(editCoupon.discountValue), minOrder: Number(editCoupon.minOrder || 0), maxUses: editCoupon.maxUses ? Number(editCoupon.maxUses) : null, expiresAt: editCoupon.expiresAt, active: editCoupon.active }),
    });
    if (r.ok) { showToast('Coupon updated'); fetchers.coupons(); setEditCoupon(null); }
    else { const d = await r.json(); showToast(d.message); }
  };
  const deleteCoupon = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    const r = await fetch(`${API}/admin/coupons/${id}`, { method: 'DELETE', headers: h });
    if (r.ok) { showToast('Coupon deleted'); fetchers.coupons(); }
  };

  /* ── Approvals ── */
  const handleApproval = async (id, action, rejectionNote = '') => {
    const r = await fetch(`${API}/admin/pending-products/${id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ action, rejectionNote }),
    });
    if (r.ok) { showToast(action === 'approve' ? '✅ Product approved & live!' : '❌ Product rejected'); fetchers.approvals(); }
    else { const d = await r.json(); showToast(d.message); }
  };

  const saveNavbarCfg = async (cfg) => {
    const payload = cfg || navbarCfg;
    setNbSaving(true);
    const r = await fetch(`${API}/admin/navbar-config`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setNbSaving(false);
    if (r.ok) showToast('Navbar updated');
    else { const d = await r.json(); showToast(d.message); }
  };

  /* ── Front Categories ── */
  const addFrontCat = async () => {
    if (!newFc.name.trim()) return showToast('Name is required');
    const fd = new FormData();
    ['name', 'icon', 'color', 'bg'].forEach(f => fd.append(f, newFc[f] || ''));
    if (newFcImg) fd.append('image', newFcImg);
    const r = await fetch(`${API}/admin/front-categories`, {
      method: 'POST', headers: { Authorization: `Bearer ${auth.token}` }, body: fd,
    });
    if (r.ok) {
      showToast('Category added'); fetchers.categories();
      setShowAddFc(false);
      setNewFc({ name:'', icon:'🏷️', color:'#51cf66', bg:'#f4fce3' });
      setNewFcImg(null); setNewFcPrev('');
      if (newFcImgRef.current) newFcImgRef.current.value = '';
    } else { const d = await r.json(); showToast(d.message); }
  };

  const saveFrontCat = async () => {
    const fd = new FormData();
    ['name', 'icon', 'color', 'bg'].forEach(f => fd.append(f, editFc[f] || ''));
    if (editFcImg) fd.append('image', editFcImg);
    const r = await fetch(`${API}/admin/front-categories/${editFc._id}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${auth.token}` }, body: fd,
    });
    if (r.ok) {
      showToast('Category updated'); fetchers.categories();
      setEditFc(null); setEditFcImg(null); setEditFcPrev('');
    } else { const d = await r.json(); showToast(d.message); }
  };

  const deleteFrontCat = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    const r = await fetch(`${API}/admin/front-categories/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (r.ok) { showToast('Category deleted'); fetchers.categories(); }
    else { const d = await r.json(); showToast(d.message); }
  };

  /* ── Catalog ── */
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const fd = new FormData();
    fd.append('name', newCatName.trim());
    fd.append('emoji', newCatEmoji);
    if (newCatImage) fd.append('image', newCatImage);
    const r = await fetch(`${API}/admin/catalog`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
      body: fd,
    });
    if (r.ok) {
      showToast('Category added'); fetchers.catalog();
      setNewCatName(''); setNewCatEmoji('🛒');
      setNewCatImage(null); setNewCatPreview('');
      if (catImageRef.current) catImageRef.current.value = '';
    } else { const d = await r.json(); showToast(d.message); }
  };

  const saveCat = async () => {
    const r = await fetch(`${API}/admin/catalog/${editCat._id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ name: editCat.name, emoji: editCat.emoji }),
    });
    if (r.ok) { showToast('Category updated'); fetchers.catalog(); setEditCat(null); }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category and all its items?')) return;
    const r = await fetch(`${API}/admin/catalog/${id}`, { method: 'DELETE', headers: h });
    if (r.ok) { showToast('Category deleted'); fetchers.catalog(); }
  };

  const openAddItem = (catId) => {
    setAddingItemTo(catId); setNewItemCat(catId);
    setNewItemName(''); setNewItemUnit('kg');
    setNewItemImage(null); setNewItemPreview('');
  };

  const addItem = async () => {
    if (!newItemName.trim() || !newItemCat) return;
    const fd = new FormData();
    fd.append('name', newItemName.trim());
    fd.append('unit', newItemUnit);
    if (newItemImage) fd.append('image', newItemImage);
    const r = await fetch(`${API}/admin/catalog/${newItemCat}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
      body: fd,
    });
    if (r.ok) {
      showToast('Item added'); fetchers.catalog();
      setAddingItemTo(null); setNewItemCat('');
      setNewItemName(''); setNewItemUnit('kg');
      setNewItemImage(null); setNewItemPreview('');
      if (itemImageRef.current) itemImageRef.current.value = '';
    } else { const d = await r.json(); showToast(d.message); }
  };

  const deleteItem = async (catId, itemId) => {
    const r = await fetch(`${API}/admin/catalog/${catId}/items/${itemId}`, { method: 'DELETE', headers: h });
    if (r.ok) { showToast('Item deleted'); fetchers.catalog(); }
  };

  const saveItem = async () => {
    if (!editItem) return;
    const r = await fetch(`${API}/admin/catalog/${editItem.catId}/items/${editItem.itemId}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ name: editItem.name, unit: editItem.unit }),
    });
    if (r.ok) { showToast('Item updated'); fetchers.catalog(); setEditItem(null); }
    else { const d = await r.json(); showToast(d.message); }
  };

  const addTopItem = async () => {
    if (!topItemName.trim() || !topItemCat) return;
    const fd = new FormData();
    fd.append('name', topItemName.trim());
    fd.append('unit', topItemUnit || 'kg');
    if (topItemImage) fd.append('image', topItemImage);
    const r = await fetch(`${API}/admin/catalog/${topItemCat}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
      body: fd,
    });
    if (r.ok) {
      showToast('Item added'); fetchers.catalog();
      setTopItemCat(''); setTopItemName(''); setTopItemUnit('');
      setTopItemImage(null); setTopItemPreview('');
      if (topItemImgRef.current) topItemImgRef.current.value = '';
    } else { const d = await r.json(); showToast(d.message); }
  };

  const UNIT_SUGGESTIONS = ['Kg', 'Gram', 'Bundle', 'Piece', 'Litre', 'Dozen', 'Pack',
    ...new Set(catalog.flatMap(c => c.items.map(i => i.unit)).filter(Boolean))
  ].filter((v, i, a) => a.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i);

  /* ── Filter ── */
  const q = search.toLowerCase();
  const filteredUsers    = users
    .filter(u => roleFilter === 'all' || (u.roles?.includes(roleFilter) || u.role === roleFilter))
    .filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
  const filteredDefault  = localDefaults
    .filter(p => dpCatFilter === 'all' || p.category === dpCatFilter)
    .filter(p => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
  const filteredShops    = shops.filter(s => s.shopName?.toLowerCase().includes(q) || s.vendorId?.name?.toLowerCase().includes(q) || s.vendorId?.email?.toLowerCase().includes(q));
  const filteredVendors  = vendors.filter(v => v.name?.toLowerCase().includes(q) || v.email?.toLowerCase().includes(q) || v.shop?.shopName?.toLowerCase().includes(q));
  const filteredOrders   = orders.filter(o => o._id?.includes(q) || o.userId?.name?.toLowerCase().includes(q));
  const filteredFrontCats = frontCats.filter(c => c.name?.toLowerCase().includes(q));

  // Auth guard — AFTER all hooks
  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f0f2f5', flexDirection:'column', gap:12 }}>
      <div style={{ width:40, height:40, border:'3px solid #e0e0e0', borderTopColor:'#1B4332', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color:'#888', fontSize:14 }}>Loading admin panel...</p>
    </div>
  );
  if (!auth || auth.user?.role !== 'admin') return null;

  return (
    <div className="ad-layout">

      {/* SIDEBAR */}
      <aside className="ad-sidebar">
        <div className="ad-sidebar-logo">⚙️ FreshMart<span>Admin</span></div>
        <nav className="ad-nav">
          {TABS.map(t => (
            <button key={t.id} className={`ad-nav-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
        <div className="ad-sidebar-footer">
          <div className="ad-admin-info">
            <div className="ad-admin-avatar">{auth.user.name?.[0]?.toUpperCase()}</div>
            <div>
              <strong>{auth.user.name || 'Admin'}</strong>
              <span>{auth.user.email || ''}</span>
            </div>
          </div>
          <button className="ad-logout-btn" onClick={logout}><FiLogOut size={15} /> Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ad-main">
        <div className="ad-topbar">
          <div>
            <h1 className="ad-page-title">{TABS.find(t => t.id === tab)?.label}</h1>
            <p className="ad-page-sub">FreshMart Admin Panel</p>
          </div>
          <div className="ad-topbar-right">
            {tab !== 'stats' && tab !== 'catalog' && (
              <div className="ad-search-wrap">
                <FiSearch size={14} />
                <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            )}
            <button className="ad-refresh-btn" onClick={refresh}><FiRefreshCw size={14} /></button>
          </div>
        </div>

        {loading && <div className="ad-loading">Loading...</div>}

        {/* STATS */}
        {tab === 'stats' && stats && (
          <div className="ad-stat-grid">
            {[
              { label: 'Buyers',   value: stats.totalUsers,    icon: <FiUsers />,        color: '#3b82f6' },
              { label: 'Vendors',  value: stats.totalVendors,  icon: <FiShoppingBag />,  color: '#8b5cf6' },
              { label: 'Products', value: stats.totalProducts, icon: <FiPackage />,      color: '#10b981' },
              { label: 'Orders',   value: stats.totalOrders,   icon: <FiShoppingCart />, color: '#f59e0b' },
              { label: 'Revenue',  value: `₹${stats.totalRevenue?.toLocaleString()}`, icon: <FiDollarSign />, color: '#ef4444' },
            ].map((s, i) => (
              <div className="ad-stat-card" key={i} style={{ '--accent': s.color }}>
                <div className="ad-stat-icon">{s.icon}</div>
                <div className="ad-stat-val">{s.value}</div>
                <div className="ad-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div>
          <div className="ad-role-filters">
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'buyer', 'vendor', 'admin'].map(r => (
                <button
                  key={r}
                  className={`ad-role-pill ${roleFilter === r ? 'active' : ''} ${r}`}
                  onClick={() => setRoleFilter(r)}
                >
                  {r === 'all' ? `All (${users.length})` : `${r.charAt(0).toUpperCase() + r.slice(1)}s (${users.filter(u => u.roles?.includes(r) || u.role === r).length})`}
                </button>
              ))}
            </div>
            <button className="ad-btn-primary" onClick={() => setShowAddUser(true)}><FiPlus size={14}/> Add User</button>
          </div>

          {showAddUser && (
            <div className="ad-modal">
              <div className="ad-modal-content" style={{maxWidth: 400}}>
                <div className="ad-modal-header">
                  <h3>Add New User</h3>
                  <button className="ad-btn-icon cancel" onClick={() => setShowAddUser(false)}><FiX size={16}/></button>
                </div>
                <div className="ad-modal-body">
                  <label>Name</label>
                  <input className="ad-input" value={newUser.name} onChange={e => setNewUser(v => ({...v, name: e.target.value}))} />
                  <label>Email</label>
                  <input className="ad-input" type="email" value={newUser.email} onChange={e => setNewUser(v => ({...v, email: e.target.value}))} />
                  <label>Password</label>
                  <input className="ad-input" type="password" value={newUser.password} onChange={e => setNewUser(v => ({...v, password: e.target.value}))} />
                  <label>Roles</label>
                  <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                    {ROLES.map(r => (
                      <label key={r} style={{ display:'flex', alignItems:'center', gap:4, fontSize:13 }}>
                        <input
                          type="checkbox"
                          checked={newUser.roles?.includes(r) || newUser.role === r}
                          onChange={e => {
                            const currentRoles = newUser.roles || [newUser.role];
                            const nextRoles = e.target.checked ? [...currentRoles, r] : currentRoles.filter(x => x !== r);
                            setNewUser(v => ({ ...v, roles: [...new Set(nextRoles)], role: nextRoles[0] || 'buyer' }));
                          }}
                        /> {r}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-btn-outline" onClick={() => setShowAddUser(false)}>Cancel</button>
                  <button className="ad-btn-primary" onClick={addUser}>Create User</button>
                </div>
              </div>
            </div>
          )}

          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u._id}>
                    {editUser?._id === u._id ? (
                      <>
                        <td><input className="ad-inline-input" value={editUser.name} onChange={e => setEditUser(v => ({ ...v, name: e.target.value }))} /></td>
                        <td>{u.email}</td>
                        <td>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                            {ROLES.map(r => (
                              <label key={r} style={{ display:'flex', alignItems:'center', gap:2, fontSize:11 }}>
                                <input
                                  type="checkbox"
                                  checked={editUser.roles?.includes(r) || editUser.role === r}
                                  onChange={e => {
                                    const currentRoles = editUser.roles || [editUser.role];
                                    const nextRoles = e.target.checked ? [...currentRoles, r] : currentRoles.filter(x => x !== r);
                                    setEditUser(v => ({ ...v, roles: [...new Set(nextRoles)], role: nextRoles[0] || 'buyer' }));
                                  }}
                                /> {r}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="ad-actions">
                          <button className="ad-btn-icon save" onClick={saveUser}><FiCheck size={13} /></button>
                          <button className="ad-btn-icon cancel" onClick={() => setEditUser(null)}><FiX size={13} /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="ad-td-name"><div className="ad-avatar">{u.name?.[0]?.toUpperCase()}</div>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                            {u.roles?.map(r => (
                              <span key={r} className={`ad-role-badge ${r}`}>{r}</span>
                            )) || <span className={`ad-role-badge ${u.role}`}>{u.role}</span>}
                          </div>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="ad-actions">
                          <button className="ad-btn-icon edit" onClick={() => setEditUser({ ...u })}><FiEdit2 size={13} /></button>
                          <button className="ad-btn-icon delete" onClick={() => deleteUser(u._id)}><FiTrash2 size={13} /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredUsers.length === 0 && <div className="ad-empty">No users found.</div>}
          </div>
          </div>
        )}

        {/* PRODUCTS */}
        {tab === 'products' && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Product</th><th>Vendor</th><th>Category</th><th>Price</th><th>Discount</th><th>Stock</th><th>Unit</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p._id}>
                    {editProduct?._id === p._id ? (
                      <>
                        <td>
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            <input className="ad-inline-input" style={{ width:36 }} value={editProduct.emoji} onChange={e => setEditProduct(v => ({ ...v, emoji: e.target.value }))} />
                            <input className="ad-inline-input" value={editProduct.name} onChange={e => setEditProduct(v => ({ ...v, name: e.target.value }))} />
                          </div>
                        </td>
                        <td>{p.vendorId?.name || '—'}</td>
                        <td><input className="ad-inline-input" value={editProduct.category} onChange={e => setEditProduct(v => ({ ...v, category: e.target.value }))} /></td>
                        <td><input className="ad-inline-input" style={{ width:70 }} type="number" value={editProduct.price} onChange={e => setEditProduct(v => ({ ...v, price: e.target.value }))} /></td>
                        <td><input className="ad-inline-input" style={{ width:70 }} type="number" value={editProduct.discountPrice || ''} placeholder="—" onChange={e => setEditProduct(v => ({ ...v, discountPrice: e.target.value }))} /></td>
                        <td><input className="ad-inline-input" style={{ width:60 }} type="number" value={editProduct.stock} onChange={e => setEditProduct(v => ({ ...v, stock: e.target.value }))} /></td>
                        <td><input className="ad-inline-input" style={{ width:60 }} value={editProduct.unit} onChange={e => setEditProduct(v => ({ ...v, unit: e.target.value }))} /></td>
                        <td>
                          <select className="ad-inline-select" value={editProduct.status} onChange={e => setEditProduct(v => ({ ...v, status: e.target.value }))}>
                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="ad-actions">
                          <button className="ad-btn-icon save" onClick={saveProduct}><FiCheck size={13} /></button>
                          <button className="ad-btn-icon cancel" onClick={() => setEditProduct(null)}><FiX size={13} /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="ad-td-name"><span style={{ fontSize:'1.3rem' }}>{p.emoji}</span>{p.name}</td>
                        <td>{p.vendorId?.name || '—'}</td>
                        <td>{p.category}</td>
                        <td>₹{p.price}</td>
                        <td>{p.discountPrice ? `₹${p.discountPrice}` : '—'}</td>
                        <td>{p.stock}</td>
                        <td>{p.unit}</td>
                        <td><span className={`ad-status-badge ${p.status}`}>{p.status}</span></td>
                        <td className="ad-actions">
                          <button className="ad-btn-icon edit" onClick={() => setEditProduct({ ...p })}><FiEdit2 size={13} /></button>
                          <button className="ad-btn-icon delete" onClick={() => deleteProduct(p._id)}><FiTrash2 size={13} /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredProducts.length === 0 && <div className="ad-empty">No products found.</div>}
          </div>
        )}

        {/* VENDOR PAYMENTS */}
        {tab === 'vendors' && (
          <div>
            <div className="ad-vp-summary">
              <span className="ad-vbadge payment"><FiCreditCard size={11} /> {vendors.filter(v => v.payment).length} filled</span>
              <span className="ad-vbadge nopay">{vendors.filter(v => !v.payment).length} pending</span>
            </div>
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vendor</th>
                    <th>UPI ID</th>
                    <th>Account Holder</th>
                    <th>Bank</th>
                    <th>Account No.</th>
                    <th>IFSC</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((v, i) => (
                    <tr key={v._id} className={!v.payment ? 'ad-vp-pending-row' : ''}>
                      <td style={{color:'#bbb',fontSize:12}}>{i + 1}</td>
                      <td>
                        <div className="ad-td-name">
                          <div className="ad-avatar">
                            {v.shop?.avatar
                              ? <img src={v.shop.avatar.startsWith('http') ? v.shop.avatar : `http://localhost:5000${v.shop.avatar}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />
                              : v.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{fontWeight:600}}>{v.name}</div>
                            <div style={{fontSize:11,color:'#999',fontWeight:400}}>{v.email}</div>
                          </div>
                        </div>
                      </td>
                      {v.payment ? (
                        <>
                          <td>{v.payment.upiId || <span className="ad-vp-empty">—</span>}</td>
                          <td>{v.payment.accountHolder || <span className="ad-vp-empty">—</span>}</td>
                          <td>{v.payment.bankName || <span className="ad-vp-empty">—</span>}</td>
                          <td><span className="ad-masked">{v.payment.accountNumber || <span className="ad-vp-empty">—</span>}</span></td>
                          <td style={{fontFamily:'monospace',fontSize:12}}>{v.payment.ifsc || <span className="ad-vp-empty">—</span>}</td>
                          <td>{v.payment.accountType ? <span className="ad-vp-type">{v.payment.accountType}</span> : <span className="ad-vp-empty">—</span>}</td>
                          <td><span className="ad-vbadge payment"><FiCreditCard size={10} /> Filled</span></td>
                        </>
                      ) : (
                        <td colSpan={7} className="ad-vp-pending-cell">
                          <span className="ad-vbadge nopay">⏳ Pending — payment details not filled</span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && filteredVendors.length === 0 && <div className="ad-empty">No vendors found.</div>}
            </div>
          </div>
        )}

        {/* SHOPS */}
        {tab === 'shops' && (
          <div className="ad-shops-list">
            {filteredShops.map(s => {
              const vid = s.vendorId?._id || s.vendorId;
              const isEditing = editShop?._id === s._id;
              const isAddingProduct = addProductFor === String(vid);
              return (
              <div className="ad-shop-card" key={s._id}>

                {/* ── Header ── */}
                <div className="ad-shop-card-header">
                  <div className="ad-shop-avatar-wrap">
                    {(() => {
                      const src = isEditing
                        ? (shopAvatarPreview || (editShop.avatar ? (editShop.avatar.startsWith('http') ? editShop.avatar : `http://localhost:5000${editShop.avatar}`) : null))
                        : (s.avatar ? (s.avatar.startsWith('http') ? s.avatar : `http://localhost:5000${s.avatar}`) : null);
                      return src
                        ? <img src={src} alt="" className="ad-shop-avatar-img" />
                        : <div className="ad-shop-avatar-placeholder">{s.shopName?.[0]?.toUpperCase()}</div>;
                    })()}
                    {isEditing && (
                      <label className="ad-shop-avatar-edit" title="Change photo">
                        <FiEdit2 size={11} />
                        <input ref={shopAvatarRef} type="file" accept="image/*" style={{display:'none'}}
                          onChange={e => { const f = e.target.files[0]; if (!f) return; setShopAvatarFile(f); setShopAvatarPreview(URL.createObjectURL(f)); }} />
                      </label>
                    )}
                  </div>

                  <div className="ad-shop-header-info">
                    {isEditing
                      ? <input className="ad-inline-input" style={{fontSize:15,fontWeight:700,width:'100%'}} value={editShop.shopName} onChange={e => setEditShop(v => ({...v, shopName:e.target.value}))} placeholder="Shop name" />
                      : <strong>{s.shopName}</strong>}
                    <span>{s.vendorId?.name || '—'} &middot; {s.vendorId?.email || '—'}</span>
                    {!isEditing && s.tagline && <em>{s.tagline}</em>}
                    {!isEditing && s.city && <span style={{fontSize:11,color:'#aaa'}}>{[s.city, s.state].filter(Boolean).join(', ')}</span>}
                  </div>

                  <div className="ad-shop-header-actions">
                    {isEditing ? (
                      <>
                        <button className="ad-btn-icon save" title="Save" onClick={saveShop}><FiCheck size={13} /></button>
                        <button className="ad-btn-icon cancel" title="Cancel" onClick={() => { setEditShop(null); setShopAvatarFile(null); setShopAvatarPreview(''); }}><FiX size={13} /></button>
                      </>
                    ) : (
                      <>
                        <button className="ad-btn-icon edit" title="Edit shop" onClick={() => { setEditShop({...s}); setShopAvatarFile(null); setShopAvatarPreview(''); setAddProductFor(null); }}><FiEdit2 size={13} /></button>
                        <button className="ad-btn-icon" style={{color:'#16a34a',border:'1px solid #bbf7d0'}} title="Add product" onClick={() => { setAddProductFor(isAddingProduct ? null : String(vid)); setEditShop(null); setNewProd({ name:'', category:'', price:'', discountPrice:'', stock:'', unit:'', emoji:'🛒', description:'', status:'active' }); }}><FiPlus size={13} /></button>
                        <button className="ad-btn-icon delete" title="Delete shop" onClick={() => deleteShop(s._id)}><FiTrash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Edit Form ── */}
                {isEditing && (
                  <div className="ad-shop-edit-body">
                    <div className="ad-shop-edit-grid">
                      {[['tagline','Tagline'],['phone','Phone'],['email','Email'],['website','Website'],['city','City'],['state','State'],['pincode','Pincode'],['address','Address']].map(([f, lbl]) => (
                        <label key={f} className="ad-shop-field">
                          <span>{lbl}</span>
                          <input className="ad-inline-input" style={{width:'100%'}} value={editShop[f] || ''} onChange={e => setEditShop(v => ({...v, [f]:e.target.value}))} placeholder={lbl} />
                        </label>
                      ))}
                      <label className="ad-shop-field" style={{gridColumn:'1/-1'}}>
                        <span>Description</span>
                        <textarea className="ad-inline-input" style={{width:'100%',height:72,resize:'vertical'}} value={editShop.description || ''} onChange={e => setEditShop(v => ({...v, description:e.target.value}))} placeholder="Shop description" />
                      </label>
                    </div>
                    <button className="ad-add-btn" style={{marginTop:12}} onClick={saveShop}><FiCheck size={13} /> Save Changes</button>
                  </div>
                )}

                {/* ── Add Product Panel ── */}
                {isAddingProduct && !isEditing && (
                  <div className="ad-shop-edit-body">
                    <div className="ad-shop-edit-grid">
                      <label className="ad-shop-field"><span>Product Name *</span><input className="ad-inline-input" style={{width:'100%'}} value={newProd.name} onChange={e => setNewProd(v=>({...v,name:e.target.value}))} placeholder="e.g. Fresh Tomatoes" /></label>
                      <label className="ad-shop-field"><span>Category</span><input className="ad-inline-input" style={{width:'100%'}} value={newProd.category} onChange={e => setNewProd(v=>({...v,category:e.target.value}))} placeholder="e.g. Vegetables" /></label>
                      <label className="ad-shop-field"><span>Price (₹) *</span><input className="ad-inline-input" style={{width:'100%'}} type="number" value={newProd.price} onChange={e => setNewProd(v=>({...v,price:e.target.value}))} placeholder="0" /></label>
                      <label className="ad-shop-field"><span>Discount Price (₹)</span><input className="ad-inline-input" style={{width:'100%'}} type="number" value={newProd.discountPrice} onChange={e => setNewProd(v=>({...v,discountPrice:e.target.value}))} placeholder="Optional" /></label>
                      <label className="ad-shop-field"><span>Stock *</span><input className="ad-inline-input" style={{width:'100%'}} type="number" value={newProd.stock} onChange={e => setNewProd(v=>({...v,stock:e.target.value}))} placeholder="0" /></label>
                      <label className="ad-shop-field"><span>Unit</span><input className="ad-inline-input" style={{width:'100%'}} value={newProd.unit} onChange={e => setNewProd(v=>({...v,unit:e.target.value}))} placeholder="kg / piece / litre" /></label>
                      <label className="ad-shop-field"><span>Emoji</span><input className="ad-inline-input" style={{width:'100%'}} value={newProd.emoji} onChange={e => setNewProd(v=>({...v,emoji:e.target.value}))} /></label>
                      <label className="ad-shop-field"><span>Status</span>
                        <select className="ad-inline-select" style={{width:'100%'}} value={newProd.status} onChange={e => setNewProd(v=>({...v,status:e.target.value}))}>
                          <option value="active">Active</option>
                          <option value="out">Out of Stock</option>
                        </select>
                      </label>
                      <label className="ad-shop-field" style={{gridColumn:'1/-1'}}>
                        <span>Description</span>
                        <textarea className="ad-inline-input" style={{width:'100%',height:60,resize:'vertical'}} value={newProd.description} onChange={e => setNewProd(v=>({...v,description:e.target.value}))} placeholder="Product description" />
                      </label>
                    </div>
                    <div style={{display:'flex',gap:8,marginTop:12}}>
                      <button className="ad-add-btn" onClick={saveNewProduct}><FiPlus size={13} /> Add Product</button>
                      <button className="ad-add-btn" style={{background:'#6b7280'}} onClick={() => setAddProductFor(null)}><FiX size={13} /> Cancel</button>
                    </div>
                  </div>
                )}

              </div>
              );
            })}
            {!loading && filteredShops.length === 0 && <div className="ad-empty">No shops found.</div>}
          </div>
        )}

        {/* DEFAULT PRODUCTS */}
        {tab === 'defaultproducts' && (
          <div>
            {/* ── Add Product Panel ── */}
            <div className="ad-dp-add-panel">
              <button className="ad-add-btn" onClick={() => setShowAddDp(v => !v)}>
                <FiPlus size={13} /> {showAddDp ? 'Cancel' : 'Add Product'}
              </button>
              {showAddDp && (
                <div className="ad-dp-add-form">
                  <div className="ad-shop-edit-grid">
                    <label className="ad-shop-field"><span>Name *</span><input className="ad-inline-input" style={{width:'100%'}} value={newDp.name} onChange={e => setNewDp(v=>({...v,name:e.target.value}))} placeholder="e.g. Apple" /></label>
                    <label className="ad-shop-field"><span>Price (₹) *</span><input className="ad-inline-input" style={{width:'100%'}} type="number" value={newDp.price} onChange={e => setNewDp(v=>({...v,price:e.target.value}))} placeholder="0" /></label>
                    <label className="ad-shop-field"><span>Unit</span><input className="ad-inline-input" style={{width:'100%'}} value={newDp.unit} onChange={e => setNewDp(v=>({...v,unit:e.target.value}))} placeholder="e.g. 1 kg" /></label>
                    <label className="ad-shop-field"><span>Rating (0–5)</span><input className="ad-inline-input" style={{width:'100%'}} type="number" min="0" max="5" step="0.1" value={newDp.rating} onChange={e => setNewDp(v=>({...v,rating:e.target.value}))} placeholder="e.g. 4.5" /></label>
                    <label className="ad-shop-field"><span>Reviews Count</span><input className="ad-inline-input" style={{width:'100%'}} type="number" min="0" value={newDp.reviews} onChange={e => setNewDp(v=>({...v,reviews:e.target.value}))} placeholder="e.g. 230" /></label>
                    <label className="ad-shop-field" style={{gridColumn:'1/-1'}}>
                      <span>Category *</span>
                      <div className="ad-dp-cat-picker">
                        {Object.entries(CATEGORY_META).map(([cat, meta]) => (
                          <button type="button" key={cat}
                            className={`ad-dp-cat-pick-btn ${newDp.category === cat ? 'selected' : ''}`}
                            style={newDp.category === cat ? { background: meta.bg, borderColor: meta.color, color: meta.color } : {}}
                            onClick={() => setNewDp(v => ({ ...v, category: cat, badge: meta.badge, emoji: meta.emoji }))}>
                            {meta.emoji} {cat}
                            <span className="ad-dp-cat-pick-badge" style={{ background: meta.badgeBg, color: meta.badgeColor }}>{meta.badge}</span>
                          </button>
                        ))}
                      </div>
                    </label>
                    <label className="ad-shop-field"><span>Badge</span><input className="ad-inline-input" style={{width:'100%'}} value={newDp.badge} onChange={e => setNewDp(v=>({...v,badge:e.target.value}))} placeholder="e.g. Fresh" /></label>
                    <label className="ad-shop-field"><span>Emoji</span><input className="ad-inline-input" style={{width:'100%'}} value={newDp.emoji} onChange={e => setNewDp(v=>({...v,emoji:e.target.value}))} /></label>
                    <label className="ad-shop-field" style={{gridColumn:'1/-1'}}><span>Description</span><input className="ad-inline-input" style={{width:'100%'}} value={newDp.desc} onChange={e => setNewDp(v=>({...v,desc:e.target.value}))} placeholder="Short description" /></label>
                    <label className="ad-shop-field" style={{gridColumn:'1/-1'}}>
                      <span>Image</span>
                      <label className="ad-dp-img-upload-box">
                        {newDpImagePreview
                          ? <img src={newDpImagePreview} alt="preview" className="ad-dp-img-preview" />
                          : <span className="ad-dp-img-placeholder-text">📷 Click to upload</span>}
                        <input type="file" accept="image/*" style={{display:'none'}}
                          onChange={e => { const f = e.target.files[0]; if (!f) return; setNewDpImageFile(f); setNewDpImagePreview(URL.createObjectURL(f)); }} />
                      </label>
                    </label>
                  </div>
                  <button className="ad-add-btn" style={{marginTop:12}} onClick={addDp}><FiCheck size={13} /> Save Product</button>
                </div>
              )}
            </div>

            <div className="ad-dp-summary">
              <span>📦 {localDefaults.length} products</span>
              <span>🗂️ {[...new Set(localDefaults.map(p => p.category))].length} categories</span>
            </div>
            <div className="ad-role-filters" style={{marginBottom:12}}>
              <button className={`ad-role-pill ${dpCatFilter === 'all' ? 'active' : ''}`} onClick={() => setDpCatFilter('all')}>All ({localDefaults.length})</button>
              {[...new Set(localDefaults.map(p => p.category).filter(Boolean))].map(cat => (
                <button key={cat} className={`ad-role-pill ${dpCatFilter === cat ? 'active' : ''}`} onClick={() => setDpCatFilter(cat)}>
                  {cat} ({localDefaults.filter(p => p.category === cat).length})
                </button>
              ))}
            </div>
            <div className="ad-dp-grid">
              {filteredDefault.map(p => (
                <div className="ad-dp-card" key={p._id}>
                  {editDp?._id === p._id ? (
                    <div className="ad-dp-edit-form">
                      <div className="ad-dp-edit-title">Edit Product</div>
                      <label className="ad-shop-field"><span>Name</span><input className="ad-inline-input" style={{width:'100%'}} value={editDp.name} onChange={e => setEditDp(v => ({...v, name: e.target.value}))} /></label>
                      <label className="ad-shop-field"><span>Category</span>
                        <select className="ad-inline-select" style={{width:'100%'}} value={editDp.category}
                          onChange={e => {
                            const meta = CATEGORY_META[e.target.value];
                            setEditDp(v => ({ ...v, category: e.target.value, badge: meta?.badge || v.badge, emoji: meta?.emoji || v.emoji }));
                          }}>
                          <option value="">— Select —</option>
                          {Object.entries(CATEGORY_META).map(([cat, meta]) => (
                            <option key={cat} value={cat}>{meta.emoji} {cat}</option>
                          ))}
                        </select>
                      </label>
                      <label className="ad-shop-field"><span>Price (₹)</span><input className="ad-inline-input" style={{width:'100%'}} type="number" value={editDp.price} onChange={e => setEditDp(v => ({...v, price: Number(e.target.value)}))} /></label>
                      <label className="ad-shop-field"><span>Unit</span><input className="ad-inline-input" style={{width:'100%'}} value={editDp.unit} onChange={e => setEditDp(v => ({...v, unit: e.target.value}))} /></label>
                      <label className="ad-shop-field"><span>Badge</span><input className="ad-inline-input" style={{width:'100%'}} value={editDp.badge} onChange={e => setEditDp(v => ({...v, badge: e.target.value}))} /></label>
                      <label className="ad-shop-field"><span>Emoji</span><input className="ad-inline-input" style={{width:'100%'}} value={editDp.emoji} onChange={e => setEditDp(v => ({...v, emoji: e.target.value}))} /></label>
                      <label className="ad-shop-field"><span>Rating (0–5)</span><input className="ad-inline-input" style={{width:'100%'}} type="number" min="0" max="5" step="0.1" value={editDp.rating ?? ''} onChange={e => setEditDp(v => ({...v, rating: e.target.value}))} placeholder="e.g. 4.5" /></label>
                      <label className="ad-shop-field"><span>Reviews Count</span><input className="ad-inline-input" style={{width:'100%'}} type="number" min="0" value={editDp.reviews ?? ''} onChange={e => setEditDp(v => ({...v, reviews: e.target.value}))} placeholder="e.g. 230" /></label>
                      <label className="ad-shop-field">
                        <span>Image</span>
                        <label className="ad-dp-img-upload-box">
                          {editDpImagePreview || editDp.image
                            ? <img src={editDpImagePreview || (editDp.image?.startsWith('http') ? editDp.image : `http://localhost:5000${editDp.image}`)} alt="preview" className="ad-dp-img-preview" />
                            : <span className="ad-dp-img-placeholder-text">📷 Click to upload</span>}
                          <input type="file" accept="image/*" style={{display:'none'}}
                            onChange={e => { const f = e.target.files[0]; if (!f) return; setEditDpImageFile(f); setEditDpImagePreview(URL.createObjectURL(f)); }} />
                        </label>
                      </label>
                      <label className="ad-shop-field"><span>Description</span><input className="ad-inline-input" style={{width:'100%'}} value={editDp.desc} onChange={e => setEditDp(v => ({...v, desc: e.target.value}))} /></label>
                      <div style={{display:'flex', gap:8, marginTop:4}}>
                        <button className="ad-btn-icon save" style={{width:'auto', padding:'6px 14px'}} onClick={saveDp}><FiCheck size={13} /> Save</button>
                        <button className="ad-btn-icon cancel" style={{width:'auto', padding:'6px 14px'}} onClick={() => { setEditDp(null); setEditDpImageFile(null); setEditDpImagePreview(''); }}><FiX size={13} /> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="ad-dp-img-wrap">
                        <img
                          src={p.image ? (p.image.startsWith('http') ? p.image : `http://localhost:5000${p.image}`) : ''}
                          alt={p.name}
                          className="ad-dp-img"
                          onError={e => { e.target.style.display='none'; e.target.parentNode.querySelector('.ad-dp-emoji').style.display='flex'; }}
                        />
                        <div className="ad-dp-emoji" style={{ display: 'none' }}>{p.emoji}</div>
                        <span className="ad-dp-badge">{p.badge}</span>
                        <div className="ad-dp-card-actions">
                          <button className="ad-dp-edit-btn" onClick={() => { setEditDp({...p}); setEditDpImageFile(null); setEditDpImagePreview(''); }} title="Edit"><FiEdit2 size={12} /></button>
                          <button className="ad-dp-del-btn" onClick={() => deleteDp(p._id)} title="Delete"><FiTrash2 size={12} /></button>
                        </div>
                      </div>
                      <div className="ad-dp-body">
                        <div className="ad-dp-cat">{p.category}</div>
                        <div className="ad-dp-name">{p.name}</div>
                        <div className="ad-dp-meta">
                          <span className="ad-dp-price">₹{p.price}</span>
                          <span className="ad-dp-unit">{p.unit}</span>
                        </div>
                        <div className="ad-dp-footer">
                          <span className="ad-dp-rating">⭐ {p.rating}</span>
                          <span className="ad-dp-reviews">({p.reviews} reviews)</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {!loading && filteredDefault.length === 0 && localDefaults.length === 0 && <div className="ad-empty">No default products found.</div>}
            {!loading && filteredDefault.length === 0 && localDefaults.length > 0 && <div className="ad-empty">No products match your search.</div>}
          </div>
        )}

        {/* CATEGORIES */}
        {tab === 'categories' && (
          <div>
            {/* Add panel */}
            <div className="ad-fc-toolbar">
              <div className="ad-dp-summary">
                <span>🏷️ {frontCats.length} categories</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {frontCats.length === 0 && (
                  <button className="ad-add-btn" style={{ background:'#0ea5e9' }} onClick={async () => {
                    const r = await fetch(`${API}/admin/front-categories/seed`, { method:'POST', headers:{ Authorization:`Bearer ${auth.token}` } });
                    if (r.ok) { showToast('Seeded default categories'); fetchers.categories(); }
                    else { const d = await r.json(); showToast(d.message); }
                  }}>
                    ⚡ Load Defaults
                  </button>
                )}
                <button className="ad-add-btn" onClick={() => { setShowAddFc(v => !v); setEditFc(null); }}>
                  <FiPlus size={13} /> {showAddFc ? 'Cancel' : 'Add Category'}
                </button>
              </div>
            </div>

            {showAddFc && (
              <div className="ad-fc-form-panel">
                <div className="ad-fc-form-title"><FiPlus size={13} /> New Category</div>
                <div className="ad-fc-form-body">
                  <label className="ad-fc-img-upload">
                    {newFcPrev
                      ? <img src={newFcPrev} alt="preview" className="ad-fc-img-thumb" />
                      : <div className="ad-fc-img-placeholder"><span>📷</span><small>Upload Image</small></div>}
                    <input ref={newFcImgRef} type="file" accept="image/*" style={{ display:'none' }}
                      onChange={e => { const f = e.target.files[0]; if (!f) return; setNewFcImg(f); setNewFcPrev(URL.createObjectURL(f)); }} />
                  </label>
                  <div className="ad-fc-fields">
                    <label className="ad-shop-field">
                      <span>Name *</span>
                      <input className="ad-inline-input" style={{ width:'100%' }} value={newFc.name}
                        onChange={e => setNewFc(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Fruits" />
                    </label>
                    <label className="ad-shop-field">
                      <span>Icon (emoji)</span>
                      <input className="ad-inline-input" style={{ width:'100%' }} value={newFc.icon}
                        onChange={e => setNewFc(v => ({ ...v, icon: e.target.value }))} placeholder="🍎" />
                    </label>
                    <label className="ad-shop-field">
                      <span>Icon Color</span>
                      <div className="ad-fc-color-row">
                        <input type="color" value={newFc.color} onChange={e => setNewFc(v => ({ ...v, color: e.target.value }))} className="ad-fc-color-input" />
                        <input className="ad-inline-input" style={{ flex:1 }} value={newFc.color}
                          onChange={e => setNewFc(v => ({ ...v, color: e.target.value }))} placeholder="#51cf66" />
                      </div>
                    </label>
                    <label className="ad-shop-field">
                      <span>Background Color</span>
                      <div className="ad-fc-color-row">
                        <input type="color" value={newFc.bg} onChange={e => setNewFc(v => ({ ...v, bg: e.target.value }))} className="ad-fc-color-input" />
                        <input className="ad-inline-input" style={{ flex:1 }} value={newFc.bg}
                          onChange={e => setNewFc(v => ({ ...v, bg: e.target.value }))} placeholder="#f4fce3" />
                      </div>
                    </label>
                  </div>
                </div>
                <button className="ad-add-btn" style={{ marginTop:12 }} onClick={addFrontCat}>
                  <FiCheck size={13} /> Save Category
                </button>
              </div>
            )}

            {/* Grid */}
            <div className="ad-fc-grid">
              {filteredFrontCats.map(cat => (
                <div className="ad-fc-card" key={cat._id}>
                  {editFc?._id === cat._id ? (
                    <div className="ad-fc-edit-body">
                      <label className="ad-fc-img-upload">
                        {editFcPrev || cat.image
                          ? <img src={editFcPrev || (cat.image.startsWith('http') ? cat.image : `http://localhost:5000${cat.image}`)} alt="" className="ad-fc-img-thumb" />
                          : <div className="ad-fc-img-placeholder"><span>📷</span><small>Upload</small></div>}
                        <input ref={editFcImgRef} type="file" accept="image/*" style={{ display:'none' }}
                          onChange={e => { const f = e.target.files[0]; if (!f) return; setEditFcImg(f); setEditFcPrev(URL.createObjectURL(f)); }} />
                      </label>
                      <label className="ad-shop-field"><span>Name</span>
                        <input className="ad-inline-input" style={{ width:'100%' }} value={editFc.name} onChange={e => setEditFc(v => ({ ...v, name: e.target.value }))} />
                      </label>
                      <label className="ad-shop-field"><span>Icon</span>
                        <input className="ad-inline-input" style={{ width:'100%' }} value={editFc.icon} onChange={e => setEditFc(v => ({ ...v, icon: e.target.value }))} />
                      </label>
                      <label className="ad-shop-field"><span>Icon Color</span>
                        <div className="ad-fc-color-row">
                          <input type="color" value={editFc.color} onChange={e => setEditFc(v => ({ ...v, color: e.target.value }))} className="ad-fc-color-input" />
                          <input className="ad-inline-input" style={{ flex:1 }} value={editFc.color} onChange={e => setEditFc(v => ({ ...v, color: e.target.value }))} />
                        </div>
                      </label>
                      <label className="ad-shop-field"><span>Background</span>
                        <div className="ad-fc-color-row">
                          <input type="color" value={editFc.bg} onChange={e => setEditFc(v => ({ ...v, bg: e.target.value }))} className="ad-fc-color-input" />
                          <input className="ad-inline-input" style={{ flex:1 }} value={editFc.bg} onChange={e => setEditFc(v => ({ ...v, bg: e.target.value }))} />
                        </div>
                      </label>
                      <div style={{ display:'flex', gap:8, marginTop:8 }}>
                        <button className="ad-btn-icon save" style={{ width:'auto', padding:'6px 14px' }} onClick={saveFrontCat}><FiCheck size={13} /> Save</button>
                        <button className="ad-btn-icon cancel" style={{ width:'auto', padding:'6px 14px' }} onClick={() => { setEditFc(null); setEditFcImg(null); setEditFcPrev(''); }}><FiX size={13} /> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="ad-fc-card-top" style={{ background: cat.bg }}>
                        {cat.image
                          ? <img src={cat.image.startsWith('http') ? cat.image : `http://localhost:5000${cat.image}`} alt={cat.name} className="ad-fc-card-img"
                              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                          : null}
                        <div className="ad-fc-card-icon" style={{ color: cat.color, display: cat.image ? 'none' : 'flex' }}>{cat.icon}</div>
                        <div className="ad-fc-card-actions">
                          <button className="ad-dp-edit-btn" onClick={() => { setEditFc({ ...cat }); setEditFcImg(null); setEditFcPrev(''); }} title="Edit"><FiEdit2 size={12} /></button>
                          <button className="ad-dp-del-btn" onClick={() => deleteFrontCat(cat._id)} title="Delete"><FiTrash2 size={12} /></button>
                        </div>
                      </div>
                      <div className="ad-fc-card-body">
                        <div className="ad-fc-card-name">{cat.name}</div>
                        <div className="ad-fc-card-meta">
                          <span className="ad-fc-color-dot" style={{ background: cat.color }} />
                          <span>{cat.color}</span>
                          <span className="ad-fc-color-dot" style={{ background: cat.bg, border:'1px solid #ddd' }} />
                          <span>{cat.bg}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {!loading && frontCats.length === 0 && (
                <div className="ad-catalog-empty" style={{ gridColumn:'1/-1' }}>
                  <span>🏷️</span>
                  <p>No categories yet. Add your first one above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NAVBAR CONFIG */}
        {tab === 'navbar' && (
          <div className="ad-nb-config">

            {/* ── Ticker ── */}
            <div className="ad-nb-section">
              <div className="ad-nb-section-title">📢 Ticker Messages</div>
              <div className="ad-nb-section-sub">Scrolling announcement bar at the top of the site</div>
              {(navbarCfg.ticker || []).map((msg, i) => (
                <div key={i} className="ad-nb-row">
                  <input
                    className="ad-inline-input"
                    style={{ flex: 1 }}
                    value={msg}
                    onChange={e => setNavbarCfg(v => ({ ...v, ticker: v.ticker.map((t, j) => j === i ? e.target.value : t) }))}
                    placeholder="e.g. 🚚 Free delivery on orders above ₹499"
                  />
                  <button className="ad-btn-icon delete" onClick={() => { const updated = { ...navbarCfg, ticker: navbarCfg.ticker.filter((_, j) => j !== i) }; setNavbarCfg(updated); saveNavbarCfg(updated); }}><FiTrash2 size={13} /></button>
                </div>
              ))}
              <button className="ad-add-btn" style={{ marginTop: 8 }} onClick={() => setNavbarCfg(v => ({ ...v, ticker: [...(v.ticker || []), ''] }))}>
                <FiPlus size={13} /> Add Message
              </button>
            </div>

            {/* ── Nav Categories ── */}
            <div className="ad-nb-section">
              <div className="ad-nb-section-title">🗂️ Nav Category Links</div>
              <div className="ad-nb-section-sub">Category bar links shown below the main navbar</div>
              <div className="ad-nb-row ad-nb-row-header">
                <span style={{ flex: 1 }}>Label (with emoji)</span>
                <span style={{ flex: 1 }}>Path</span>
                <span style={{ width: 32 }} />
              </div>
              {(navbarCfg.navCategories || []).map((cat, i) => (
                <div key={i} className="ad-nb-row">
                  <input
                    className="ad-inline-input"
                    style={{ flex: 1 }}
                    value={cat.label}
                    onChange={e => setNavbarCfg(v => ({ ...v, navCategories: v.navCategories.map((c, j) => j === i ? { ...c, label: e.target.value } : c) }))}
                    placeholder="e.g. 🍎 Fruits"
                  />
                  <select
                    className="ad-inline-select"
                    style={{ flex: 1 }}
                    value={cat.path}
                    onChange={e => {
                      const selected = frontCats.find(fc => `/products?cat=${encodeURIComponent(fc.name)}` === e.target.value);
                      setNavbarCfg(v => ({ ...v, navCategories: v.navCategories.map((c, j) => j === i
                        ? { ...c, path: e.target.value, label: c.label || (selected ? `${selected.icon} ${selected.name}` : c.label) }
                        : c
                      )}));
                    }}
                  >
                    <option value="">— Select category —</option>
                    {frontCats.map(fc => (
                      <option key={fc._id} value={`/products?cat=${encodeURIComponent(fc.name)}`}>
                        {fc.icon} {fc.name} → /products?cat={fc.name}
                      </option>
                    ))}
                  </select>
                  <button className="ad-btn-icon delete" onClick={() => { const updated = { ...navbarCfg, navCategories: navbarCfg.navCategories.filter((_, j) => j !== i) }; setNavbarCfg(updated); saveNavbarCfg(updated); }}><FiTrash2 size={13} /></button>
                </div>
              ))}
              <button className="ad-add-btn" style={{ marginTop: 8 }} onClick={() => setNavbarCfg(v => ({ ...v, navCategories: [...(v.navCategories || []), { label: '', path: '' }] }))}>
                <FiPlus size={13} /> Add Link
              </button>
            </div>

            <button className="ad-add-btn" style={{ background: '#16a34a', marginTop: 8 }} onClick={() => saveNavbarCfg()} disabled={nbSaving}>
              <FiCheck size={13} /> {nbSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* ORDERS */}
        {tab === 'orders' && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Subtotal</th><th>Discount</th><th>Delivery</th><th>Total</th><th>Date</th></tr></thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontFamily:'monospace', fontSize:12, whiteSpace:'nowrap' }}>{o.orderId || o._id.slice(-8)}</td>
                    <td>{o.userId?.name || '—'}<br /><span style={{ fontSize:11, color:'#999' }}>{o.userId?.email}</span></td>
                    <td>
                      <div className="ad-order-items-col">
                        {o.items?.map((item, i) => {
                          const imgSrc = item.image || '';
                          return (
                            <div className="ad-order-item-row" key={i}>
                              <div className="ad-order-item-img">
                                {imgSrc
                                  ? <img src={imgSrc} alt={item.name} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                                  : null}
                                <span style={{ display: imgSrc ? 'none' : 'flex', fontSize:18 }}>{item.emoji || '🛒'}</span>
                              </div>
                              <div className="ad-order-item-info">
                                <span>{item.name || `Item ${i+1}`}</span>
                                <span style={{color:'#999',fontSize:11}}>{item.unit} ×{item.qty} · ₹{item.price}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td>₹{o.subtotal}</td>
                    <td>{o.discount ? `-₹${o.discount}` : '—'}{o.coupon && <div style={{fontSize:10,color:'#f59e0b'}}>🏷️ {o.coupon}</div>}</td>
                    <td>{o.delivery ? `₹${o.delivery}` : 'Free'}</td>
                    <td><strong>₹{o.total}</strong></td>
                    <td style={{fontSize:11,color:'#999',whiteSpace:'nowrap'}}>{new Date(o.createdAt).toLocaleDateString()}<br/>{new Date(o.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredOrders.length === 0 && <div className="ad-empty">No orders found.</div>}
          </div>
        )}

        {/* COUPONS */}
        {tab === 'coupons' && (
          <div>
            <div className="ad-dp-add-panel">
              <button className="ad-add-btn" onClick={() => setShowAddCoupon(v => !v)}>
                <FiPlus size={13} /> {showAddCoupon ? 'Cancel' : 'Create Coupon'}
              </button>
              {showAddCoupon && (
                <div className="ad-dp-add-form">
                  <div className="ad-shop-edit-grid">
                    <label className="ad-shop-field">
                      <span>Coupon Code *</span>
                      <div style={{display:'flex',gap:6}}>
                        <input className="ad-inline-input" style={{width:'100%',textTransform:'uppercase',fontFamily:'monospace',letterSpacing:2}} maxLength={8} value={newCoupon.code} onChange={e => setNewCoupon(v=>({...v,code:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)}))} placeholder="e.g. SAVE20AB" />
                        <button type="button" className="ad-add-btn" style={{whiteSpace:'nowrap',padding:'6px 12px'}} onClick={() => setNewCoupon(v=>({...v,code:genCode()}))}>🎲 Generate</button>
                      </div>
                    </label>
                    <label className="ad-shop-field">
                      <span>Discount Type</span>
                      <select className="ad-inline-select" style={{width:'100%'}} value={newCoupon.discountType} onChange={e => setNewCoupon(v=>({...v,discountType:e.target.value}))}>
                        <option value="percent">Percentage (%)</option>
                        <option value="flat">Flat Amount (₹)</option>
                      </select>
                    </label>
                    <label className="ad-shop-field">
                      <span>Discount Value *</span>
                      <input className="ad-inline-input" style={{width:'100%'}} type="number" min="1" value={newCoupon.discountValue} onChange={e => setNewCoupon(v=>({...v,discountValue:e.target.value}))} placeholder={newCoupon.discountType==='percent'?'e.g. 10 (= 10%)':'e.g. 50 (= ₹50 off)'} />
                    </label>
                    <label className="ad-shop-field">
                      <span>Min Order Amount (₹)</span>
                      <input className="ad-inline-input" style={{width:'100%'}} type="number" min="0" value={newCoupon.minOrder} onChange={e => setNewCoupon(v=>({...v,minOrder:e.target.value}))} placeholder="0 = no minimum" />
                    </label>
                    <label className="ad-shop-field">
                      <span>Max Uses</span>
                      <input className="ad-inline-input" style={{width:'100%'}} type="number" min="1" value={newCoupon.maxUses} onChange={e => setNewCoupon(v=>({...v,maxUses:e.target.value}))} placeholder="Leave blank = unlimited" />
                    </label>
                    <label className="ad-shop-field">
                      <span>Expiry Date *</span>
                      <input className="ad-inline-input" style={{width:'100%'}} type="date" value={newCoupon.expiresAt} onChange={e => setNewCoupon(v=>({...v,expiresAt:e.target.value}))} min={new Date().toISOString().split('T')[0]} />
                    </label>
                  </div>
                  <button className="ad-add-btn" style={{marginTop:12}} onClick={addCoupon}><FiCheck size={13} /> Save Coupon</button>
                </div>
              )}
            </div>

            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Used / Max</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {coupons.map(c => (
                    <tr key={c._id}>
                      {editCoupon?._id === c._id ? (
                        <>
                          <td><span style={{fontFamily:'monospace',fontWeight:700,letterSpacing:1}}>{c.code}</span></td>
                          <td>
                            <select className="ad-inline-select" value={editCoupon.discountType} onChange={e => setEditCoupon(v=>({...v,discountType:e.target.value}))}>
                              <option value="percent">%</option>
                              <option value="flat">₹ Flat</option>
                            </select>
                          </td>
                          <td><input className="ad-inline-input" style={{width:70}} type="number" value={editCoupon.discountValue} onChange={e => setEditCoupon(v=>({...v,discountValue:e.target.value}))} /></td>
                          <td><input className="ad-inline-input" style={{width:80}} type="number" value={editCoupon.minOrder} onChange={e => setEditCoupon(v=>({...v,minOrder:e.target.value}))} /></td>
                          <td><input className="ad-inline-input" style={{width:70}} type="number" value={editCoupon.maxUses||''} placeholder="∞" onChange={e => setEditCoupon(v=>({...v,maxUses:e.target.value}))} /></td>
                          <td><input className="ad-inline-input" style={{width:130}} type="date" value={editCoupon.expiresAt?.split('T')[0]||''} onChange={e => setEditCoupon(v=>({...v,expiresAt:e.target.value}))} /></td>
                          <td>
                            <select className="ad-inline-select" value={editCoupon.active?'true':'false'} onChange={e => setEditCoupon(v=>({...v,active:e.target.value==='true'}))}>
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </td>
                          <td className="ad-actions">
                            <button className="ad-btn-icon save" onClick={saveCoupon}><FiCheck size={13}/></button>
                            <button className="ad-btn-icon cancel" onClick={() => setEditCoupon(null)}><FiX size={13}/></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span className="ad-coupon-code">{c.code}</span>
                            <button className="ad-btn-icon" style={{marginLeft:4,color:'#6b7280',border:'1px solid #e5e7eb'}} title="Copy code" onClick={() => { navigator.clipboard.writeText(c.code); showToast(`Copied: ${c.code}`); }}><FiCopy size={12}/></button>
                          </td>
                          <td><span className={`ad-coupon-type ${c.discountType}`}>{c.discountType === 'percent' ? '%' : '₹'}</span></td>
                          <td><strong>{c.discountType === 'percent' ? `${c.discountValue}%` : `₹${c.discountValue}`}</strong></td>
                          <td>{c.minOrder > 0 ? `₹${c.minOrder}` : <span style={{color:'#bbb'}}>None</span>}</td>
                          <td>{c.usedCount} / {c.maxUses ?? <span style={{color:'#bbb'}}>∞</span>}</td>
                          <td style={{fontSize:12}}>{new Date(c.expiresAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`ad-status-badge ${c.active && new Date(c.expiresAt) > new Date() ? 'active' : 'out'}`}>
                              {c.active && new Date(c.expiresAt) > new Date() ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="ad-actions">
                            <button className="ad-btn-icon edit" onClick={() => setEditCoupon({...c})}><FiEdit2 size={13}/></button>
                            <button className="ad-btn-icon delete" onClick={() => deleteCoupon(c._id)}><FiTrash2 size={13}/></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && coupons.length === 0 && <div className="ad-empty">No coupons yet. Create your first one above.</div>}
            </div>
          </div>
        )}

        {/* APPROVALS */}
        {tab === 'approvals' && (
          <div>
            {/* ── Status tabs ── */}
            <div className="ad-role-filters" style={{marginBottom:16}}>
              {[
                { key:'pending',  label:'⏳ Pending',  count: pendingProducts.length,  color:'#f59e0b' },
                { key:'approved', label:'✅ Approved', count: approvedProducts.length, color:'#16a34a' },
                { key:'rejected', label:'❌ Rejected', count: rejectedProducts.length, color:'#dc2626' },
              ].map(t => (
                <button key={t.key}
                  className={`ad-role-pill ${approvalTab === t.key ? 'active' : ''}`}
                  style={approvalTab === t.key ? { borderColor: t.color, color: t.color, background: t.color + '18' } : {}}
                  onClick={() => setApprovalTab(t.key)}>
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            {/* ── Pending ── */}
            {approvalTab === 'pending' && (
              pendingProducts.length === 0
                ? <div className="ad-empty">✅ No pending approvals. All caught up!</div>
                : <div className="ad-approval-grid">
                    {pendingProducts.map(p => <ApprovalCard key={p._id} p={p} onAction={handleApproval} />)}
                  </div>
            )}

            {/* ── Approved ── */}
            {approvalTab === 'approved' && (
              approvedProducts.length === 0
                ? <div className="ad-empty">No approved products yet.</div>
                : <div className="ad-approval-grid">
                    {approvedProducts.map(p => (
                      <div className="ad-approval-card" key={p._id} style={{opacity:0.85}}>
                        <div className="ad-approval-img">
                          {p.image
                            ? <img src={p.image.startsWith('http') ? p.image : `http://localhost:5000${p.image}`} alt={p.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} />
                            : null}
                          <span style={{display:p.image?'none':'flex',fontSize:36}}>{p.emoji||'🛒'}</span>
                        </div>
                        <div className="ad-approval-body">
                          <div className="ad-approval-name">{p.name}</div>
                          <div className="ad-approval-cat">{p.category}</div>
                          <div className="ad-approval-meta"><span>₹{p.discountPrice||p.price}{p.unit?` / ${p.unit}`:''}</span><span>Stock: {p.stock}</span></div>
                          <div className="ad-approval-vendor"><span>🏪 {p.vendorId?.name||'—'}</span><span style={{fontSize:11,color:'#999'}}>{p.vendorId?.email}</span></div>
                          <span style={{display:'inline-block',marginTop:6,padding:'3px 10px',borderRadius:20,background:'#dcfce7',color:'#16a34a',fontSize:12,fontWeight:600}}>✅ Approved</span>
                        </div>
                      </div>
                    ))}
                  </div>
            )}

            {/* ── Rejected ── */}
            {approvalTab === 'rejected' && (
              rejectedProducts.length === 0
                ? <div className="ad-empty">No rejected products.</div>
                : <div className="ad-approval-grid">
                    {rejectedProducts.map(p => (
                      <div className="ad-approval-card" key={p._id} style={{opacity:0.85}}>
                        <div className="ad-approval-img">
                          {p.image
                            ? <img src={p.image.startsWith('http') ? p.image : `http://localhost:5000${p.image}`} alt={p.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} />
                            : null}
                          <span style={{display:p.image?'none':'flex',fontSize:36}}>{p.emoji||'🛒'}</span>
                        </div>
                        <div className="ad-approval-body">
                          <div className="ad-approval-name">{p.name}</div>
                          <div className="ad-approval-cat">{p.category}</div>
                          <div className="ad-approval-meta"><span>₹{p.discountPrice||p.price}{p.unit?` / ${p.unit}`:''}</span><span>Stock: {p.stock}</span></div>
                          <div className="ad-approval-vendor"><span>🏪 {p.vendorId?.name||'—'}</span><span style={{fontSize:11,color:'#999'}}>{p.vendorId?.email}</span></div>
                          {p.rejectionNote && <div style={{fontSize:12,color:'#dc2626',marginTop:4}}>Reason: {p.rejectionNote}</div>}
                          <span style={{display:'inline-block',marginTop:6,padding:'3px 10px',borderRadius:20,background:'#fee2e2',color:'#dc2626',fontSize:12,fontWeight:600}}>❌ Rejected</span>
                        </div>
                      </div>
                    ))}
                  </div>
            )}
          </div>
        )}

        {/* CATALOG */}
        {tab === 'catalog' && (
          <div className="ad-catalog-page">

            {/* ── Add Category Panel ── */}
            <div className="ad-catalog-panels-row">
            <div className="ad-catalog-panel">
              <div className="ad-catalog-panel-title"><FiPlus size={14} /> Add New Category</div>
              <div className="ad-catalog-panel-row">
                <label className="ad-cat-img-upload">
                  {newCatPreview
                    ? <img src={newCatPreview} alt="preview" className="ad-cat-img-thumb" />
                    : <div className="ad-cat-img-placeholder"><span style={{fontSize:22}}>📷</span><span className="ad-cat-img-hint">Add Image</span></div>}
                  <input ref={catImageRef} type="file" accept="image/*" style={{display:'none'}}
                    onChange={e => {
                      const f = e.target.files[0];
                      if (!f) return;
                      setNewCatImage(f);
                      setNewCatPreview(URL.createObjectURL(f));
                    }} />
                </label>
                <div className="ad-cat-form-fields">
                  <input className="ad-inline-input" style={{flex:1}} placeholder="Category name (e.g. Fruits, Vegetables...)" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} />
                  <button className="ad-add-btn" onClick={addCategory} disabled={!newCatName.trim()}><FiPlus size={13} /> Add Category</button>
                </div>
              </div>
            </div>

            {/* ── Add Item Panel ── */}
            <div className="ad-catalog-panel">
              <div className="ad-catalog-panel-title"><FiPlus size={14} /> Add New Item</div>
              <div className="ad-catalog-panel-row" style={{flexWrap:'wrap', gap:10}}>
                <label className="ad-cat-img-upload">
                  {topItemPreview
                    ? <img src={topItemPreview} alt="preview" className="ad-cat-img-thumb" />
                    : <div className="ad-cat-img-placeholder"><span style={{fontSize:22}}>📷</span><span className="ad-cat-img-hint">Add Image</span></div>}
                  <input ref={topItemImgRef} type="file" accept="image/*" style={{display:'none'}}
                    onChange={e => { const f = e.target.files[0]; if (!f) return; setTopItemImage(f); setTopItemPreview(URL.createObjectURL(f)); }} />
                </label>
                <div className="ad-cat-form-fields">
                  <select className="ad-inline-select" style={{flex:1}} value={topItemCat} onChange={e => setTopItemCat(e.target.value)}>
                    <option value="">— Choose Category —</option>
                    {catalog.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <input className="ad-inline-input" style={{flex:1}} placeholder="Item name" value={topItemName}
                    onChange={e => setTopItemName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); topItemUnitRef.current?.focus(); } }} />
                  <input list="unit-suggestions-top" ref={topItemUnitRef} className="ad-inline-input" style={{width:100}} placeholder="Unit (e.g. Kg)" value={topItemUnit}
                    onChange={e => setTopItemUnit(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTopItem()} />
                  <datalist id="unit-suggestions-top">
                    {UNIT_SUGGESTIONS.map(u => <option key={u} value={u} />)}
                  </datalist>
                  <button className="ad-add-btn" onClick={addTopItem} disabled={!topItemName.trim() || !topItemCat}><FiPlus size={13} /> Add Item</button>
                </div>
              </div>
            </div>
            </div>


            {/* ── Stats row ── */}
            <div className="ad-catalog-stats">
              <span>📦 {catalog.length} Categories</span>
              <span>🏷️ {catalog.reduce((s, c) => s + c.items.length, 0)} Total Items</span>
            </div>

            {/* ── Catalog Grid ── */}
            <div className="ad-catalog-grid">
              {catalog.map(cat => (
                <div className="ad-cat-card" key={cat._id}>
                  <div className="ad-cat-header">
                    {editCat?._id === cat._id ? (
                      <>
                        <input className="ad-inline-input" style={{ width:44, textAlign:'center', fontSize:18 }} value={editCat.emoji} onChange={e => setEditCat(v => ({ ...v, emoji: e.target.value }))} />
                        <input className="ad-inline-input" style={{ flex:1 }} value={editCat.name} onChange={e => setEditCat(v => ({ ...v, name: e.target.value }))} />
                        <button className="ad-btn-icon save sm" onClick={saveCat}><FiCheck size={11} /></button>
                        <button className="ad-btn-icon cancel sm" onClick={() => setEditCat(null)}><FiX size={11} /></button>
                      </>
                    ) : (
                      <>
                        {cat.image
                          ? <img src={`http://localhost:5000${cat.image}`} alt={cat.name} className="ad-cat-header-img" />
                          : <span className="ad-cat-emoji">{cat.emoji}</span>}
                        <strong>{cat.name}</strong>
                        <span className="ad-cat-count">{cat.items.length}</span>
                        <div className="ad-cat-actions">
                          <button className="ad-btn-icon edit sm" onClick={() => setEditCat({ ...cat })}><FiEdit2 size={11} /></button>
                          <button className="ad-btn-icon delete sm" onClick={() => deleteCategory(cat._id)}><FiTrash2 size={11} /></button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="ad-cat-items">
                    {cat.items.map(item => (
                      <div className="ad-cat-item" key={item.id}>
                        {editItem?.itemId === item.id ? (
                          <>
                            {item.image
                              ? <img src={`http://localhost:5000${item.image}`} alt={item.name} className="ad-item-img" />
                              : <div className="ad-item-img-placeholder">{cat.emoji}</div>}
                            <input className="ad-inline-input" style={{flex:1, minWidth:60, fontSize:12, padding:'3px 7px'}} value={editItem.name}
                              onChange={e => setEditItem(v => ({...v, name: e.target.value}))}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('edit-item-unit')?.focus(); } }} autoFocus />
                            <input list="unit-suggestions" id="edit-item-unit" className="ad-inline-input" style={{width:70, fontSize:12, padding:'3px 7px'}} value={editItem.unit}
                              onChange={e => setEditItem(v => ({...v, unit: e.target.value}))}
                              onKeyDown={e => e.key === 'Enter' && saveItem()} />
                            <button className="ad-btn-icon save sm" onClick={saveItem}><FiCheck size={11} /></button>
                            <button className="ad-btn-icon cancel sm" onClick={() => setEditItem(null)}><FiX size={11} /></button>
                          </>
                        ) : (
                          <>
                            {item.image
                              ? <img src={`http://localhost:5000${item.image}`} alt={item.name} className="ad-item-img" />
                              : <div className="ad-item-img-placeholder">{cat.emoji}</div>}
                            <span className="ad-item-name">{item.name}</span>
                            <span className="ad-item-unit">{item.unit}</span>
                            <button className="ad-btn-icon edit sm" onClick={() => setEditItem({ catId: cat._id, itemId: item.id, name: item.name, unit: item.unit })}><FiEdit2 size={11} /></button>
                            <button className="ad-btn-icon delete sm" onClick={() => deleteItem(cat._id, item.id)}><FiX size={11} /></button>
                          </>
                        )}
                      </div>
                    ))}
                    {cat.items.length === 0 && addingItemTo !== cat._id && <p className="ad-cat-empty">No items yet.</p>}

                    {/* ── Inline Add Item Form ── */}
                    {addingItemTo === cat._id ? (
                      <div className="ad-inline-add-item">
                        <label className="ad-item-img-upload-sm">
                          {newItemPreview
                            ? <img src={newItemPreview} alt="" className="ad-cat-img-thumb" />
                            : <span>🖼️</span>}
                          <input ref={itemImageRef} type="file" accept="image/*" style={{display:'none'}}
                            onChange={e => { const f = e.target.files[0]; if (!f) return; setNewItemImage(f); setNewItemPreview(URL.createObjectURL(f)); }} />
                        </label>
                        <input className="ad-inline-input" style={{flex:1, minWidth:80}} placeholder="Item name" value={newItemName} onChange={e => setNewItemName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); itemUnitRef.current?.focus(); } }} autoFocus />
                        <input list="unit-suggestions" ref={itemUnitRef} className="ad-inline-input" style={{width:90}} placeholder="Unit" value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addItem()} />
                        <datalist id="unit-suggestions">
                          {UNIT_SUGGESTIONS.map(u => <option key={u} value={u} />)}
                        </datalist>
                        <button className="ad-btn-icon save sm" onClick={addItem} disabled={!newItemName.trim()}><FiCheck size={11} /></button>
                        <button className="ad-btn-icon cancel sm" onClick={() => setAddingItemTo(null)}><FiX size={11} /></button>
                      </div>
                    ) : (
                      <button className="ad-add-item-btn" onClick={() => openAddItem(cat._id)}>
                        <FiPlus size={12} /> Add Item
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!loading && catalog.length === 0 && (
                <div className="ad-catalog-empty">
                  <span>📂</span>
                  <p>No categories yet. Add your first category above.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {toast && <div className="ad-toast">{toast}</div>}
    </div>
  );
}
