import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import API, { imgUrl } from '../api';
import {
  FiArrowLeft, FiCheck, FiPackage, FiTag, FiChevronRight,
  FiShoppingBag, FiSearch, FiPlus, FiUpload, FiClock, FiX
} from 'react-icons/fi';
import './AddProduct.css';

const CATALOG_STEPS = ['Choose Category', 'Choose Item', 'Product Details'];
const CUSTOM_STEPS  = ['New Category / Item', 'Product Details'];

export default function AddProduct() {
  const { auth, authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mode, setMode]     = useState('catalog'); // 'catalog' | 'custom'
  const [step, setStep]     = useState(0);
  const [selectedCat, setSelectedCat]   = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(false);
  const [isPending, setIsPending]       = useState(false);
  const [form, setForm] = useState({ price: '', discountPrice: '', stock: '', description: '', status: 'active', unit: '' });

  // Catalog
  const [catalog, setCatalog]           = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catSearch, setCatSearch]       = useState('');
  const [itemSearch, setItemSearch]     = useState('');

  // Custom product
  const [customCatMode, setCustomCatMode] = useState('existing'); // 'existing' | 'new'
  const [customCatId, setCustomCatId]     = useState('');
  const [newCatName, setNewCatName]       = useState('');
  const [newCatEmoji, setNewCatEmoji]     = useState('🛒');
  const [newCatImage, setNewCatImage]     = useState(null);
  const [newCatImagePreview, setNewCatImagePreview] = useState('');
  const [newItemName, setNewItemName]     = useState('');
  const [newItemUnit, setNewItemUnit]     = useState('kg');
  const [newItemImage, setNewItemImage]   = useState(null);
  const [newItemImagePreview, setNewItemImagePreview] = useState('');
  const [customProductImage, setCustomProductImage] = useState(null);
  const [customProductImagePreview, setCustomProductImagePreview] = useState('');
  const [customName, setCustomName]       = useState('');
  const [customCatName, setCustomCatName] = useState('');

  const catImgRef  = useRef();
  const itemImgRef = useRef();
  const prodImgRef = useRef();

  useEffect(() => {
    fetch(`${API}/admin/catalog/public`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setCatalog(data))
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    if (!authLoading && (!auth || auth.user.role !== 'vendor')) navigate('/vendor');
  }, [auth, authLoading, navigate]);

  if (authLoading) return null;
  if (!auth || auth.user.role !== 'vendor') return null;

  const goBack = () => navigate('/vendor');
  const user    = auth.user;
  const headers = { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' };

  const discountPct = (() => {
    const p = parseFloat(form.price), d = parseFloat(form.discountPrice);
    if (!p || !d || d >= p) return 0;
    return Math.round(((p - d) / p) * 100);
  })();

  const reset = () => {
    setStep(0); setSelectedCat(null); setSelectedItem(null);
    setSuccess(false); setIsPending(false);
    setCatSearch(''); setItemSearch('');
    setForm({ price:'', discountPrice:'', stock:'', description:'', status:'active', unit:'' });
    setCustomCatMode('existing'); setCustomCatId(''); setNewCatName(''); setNewItemName('');
    setNewCatImage(null); setNewCatImagePreview(''); setNewItemImage(null); setNewItemImagePreview('');
    setCustomProductImage(null); setCustomProductImagePreview(''); setCustomName(''); setCustomCatName('');
  };

  const pickFile = (setter, previewSetter) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setter(file);
    previewSetter(URL.createObjectURL(file));
  };

  // ── CATALOG FLOW ──
  const pickCategory = (cat) => { setSelectedCat(cat); setSelectedItem(null); setCatSearch(''); setItemSearch(''); setStep(1); };
  const pickItem = (item) => {
    setSelectedItem(item);
    setForm({ price: '', discountPrice: '', stock: '', description: '', status: 'active', unit: item.unit || 'kg' });
    setStep(2);
  };

  const handleCatalogSubmit = async () => {
    if (!form.price || !form.stock) return alert('Price and stock are required.');
    setSubmitting(true);
    try {
      const body = {
        vendorId: user.id, name: selectedItem.name, category: selectedCat.name,
        price: Number(form.price), discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        discountPct, stock: Number(form.stock), unit: form.unit,
        description: form.description, status: form.status,
        image: imgUrl(selectedItem.image), emoji: selectedCat.emoji,
        isCustom: false,
      };
      const res = await fetch(`${API}/vendor/products`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); return alert(d.message || 'Failed to add product.'); }
      setIsPending(false);
      setSuccess(true);
    } catch { alert('Could not connect to server.'); }
    finally { setSubmitting(false); }
  };

  // ── CUSTOM FLOW ──
  const handleCustomSubmit = async () => {
    if (!customName.trim()) return alert('Product name is required.');
    if (!form.price || !form.stock) return alert('Price and stock are required.');
    if (customCatMode === 'new' && !newCatName.trim()) return alert('Category name is required.');
    if (customCatMode === 'existing' && !customCatId) return alert('Please select a category.');
    setSubmitting(true);
    try {
      let catName = customCatName;
      let catEmoji = '🛒';
      let itemImageUrl = '';

      // Step 1: Create new category if needed
      if (customCatMode === 'new') {
        const fd = new FormData();
        fd.append('name', newCatName.trim());
        fd.append('emoji', newCatEmoji);
        if (newCatImage) fd.append('image', newCatImage);
        const r = await fetch(`${API}/vendor/catalog/category`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}` },
          body: fd,
        });
        const d = await r.json();
        if (!r.ok) { alert(d.message || 'Failed to create category'); setSubmitting(false); return; }
        catName  = d.name;
        catEmoji = d.emoji;
        // Add item to new category
        const fd2 = new FormData();
        fd2.append('name', customName.trim());
        fd2.append('unit', form.unit || 'kg');
        if (newItemImage) fd2.append('image', newItemImage);
        const r2 = await fetch(`${API}/vendor/catalog/${d._id}/item`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}` },
          body: fd2,
        });
        const d2 = await r2.json();
        if (!r2.ok) { alert(d2.message || 'Failed to add item'); setSubmitting(false); return; }
        const newItem = d2.items[d2.items.length - 1];
        itemImageUrl = imgUrl(newItem?.image || '');
      } else {
        // Add item to existing category
        const cat = catalog.find(c => c._id === customCatId);
        catName  = cat?.name || '';
        catEmoji = cat?.emoji || '🛒';
        const fd = new FormData();
        fd.append('name', customName.trim());
        fd.append('unit', form.unit || 'kg');
        if (newItemImage) fd.append('image', newItemImage);
        const r = await fetch(`${API}/vendor/catalog/${customCatId}/item`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}` },
          body: fd,
        });
        const d = await r.json();
        if (!r.ok) { alert(d.message || 'Failed to add item'); setSubmitting(false); return; }
        const newItem = d.items[d.items.length - 1];
        itemImageUrl = imgUrl(newItem?.image || '');
      }

      // Step 2: Upload product image if provided
      let productImageUrl = itemImageUrl;
      if (customProductImage) {
        const fd = new FormData();
        fd.append('image', customProductImage);
        // Use catalog upload endpoint
        const r = await fetch(`${API}/vendor/catalog/${customCatId || 'new'}/item`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}` },
          body: fd,
        });
        // fallback — use item image
      }

      // Step 3: Submit product as pending
      const body = {
        vendorId: user.id, name: customName.trim(), category: catName,
        price: Number(form.price), discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        discountPct, stock: Number(form.stock), unit: form.unit || 'kg',
        description: form.description, status: 'out',
        image: productImageUrl, emoji: catEmoji,
        isCustom: true,
      };
      const res = await fetch(`${API}/vendor/products`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); return alert(d.message || 'Failed to submit product.'); }
      setCustomCatName(catName);
      setIsPending(true);
      setSuccess(true);
    } catch (e) { alert('Could not connect to server: ' + e.message); }
    finally { setSubmitting(false); }
  };

  // ── SUCCESS SCREEN ──
  if (success) return (
    <div className="ap-success-screen">
      <div className="ap-success-card">
        <div className={`ap-success-icon ${isPending ? 'pending' : ''}`}>
          {isPending ? <FiClock size={36} /> : <FiCheck size={36} />}
        </div>
        <h2>{isPending ? 'Submitted for Approval!' : '🎉 Product is Live!'}</h2>
        <p className="ap-success-sub">
          {isPending
            ? 'Your custom product has been sent to the admin for review. It will go live once approved.'
            : 'Your product is now live on the marketplace and visible to all buyers.'}
        </p>
        {isPending && (
          <div className="ap-pending-badge"><FiClock size={13} /> Pending Admin Approval</div>
        )}
        <div className="ap-success-btns">
          <button className="ap-btn primary" onClick={reset}>Add Another Product</button>
          <button className="ap-btn outline" onClick={goBack}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  );

  const STEPS = mode === 'catalog' ? CATALOG_STEPS : CUSTOM_STEPS;

  return (
    <div className="ap-page">

      {/* Header */}
      <div className="ap-header">
        <div className="ap-header-inner">
          <button className="ap-back-btn" onClick={() => step === 0 ? goBack() : setStep(s => s - 1)}>
            <FiArrowLeft size={18} /> {step === 0 ? 'Back to Dashboard' : 'Back'}
          </button>
          <div className="ap-header-title"><FiPackage size={20} /><span>Add New Product</span></div>
        </div>

        {/* Mode toggle */}
        <div className="ap-mode-toggle">
          <button className={`ap-mode-btn ${mode === 'catalog' ? 'active' : ''}`}
            onClick={() => { setMode('catalog'); setStep(0); reset(); }}>
            <FiShoppingBag size={14} /> Use Catalog
          </button>
          <button className={`ap-mode-btn ${mode === 'custom' ? 'active' : ''}`}
            onClick={() => { setMode('custom'); setStep(0); reset(); }}>
            <FiPlus size={14} /> Custom Product
          </button>
        </div>

        {mode === 'custom' && (
          <div className="ap-custom-notice">
            <FiClock size={14} />
            Custom products require <strong>admin approval</strong> before going live on the marketplace.
          </div>
        )}

        {/* Stepper */}
        <div className="ap-stepper">
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <div className={`ap-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                <div className="ap-step-circle">{i < step ? <FiCheck size={13} /> : i + 1}</div>
                <span>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`ap-step-line ${i < step ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="ap-body">

        {/* ══ CATALOG MODE ══ */}
        {mode === 'catalog' && (
          <>
            {step === 0 && (
              <div className="ap-step-content">
                <div className="ap-step-label">
                  <h2>Select a Category</h2>
                  <p>Choose the main category your product belongs to</p>
                </div>
                <div className="ap-search-bar">
                  <FiSearch size={14} />
                  <input placeholder="Search categories..." value={catSearch} onChange={e => setCatSearch(e.target.value)} />
                </div>
                <div className="ap-cat-grid">
                  {catalogLoading && <p style={{ color: '#888', padding: '16px 0' }}>Loading categories...</p>}
                  {!catalogLoading && catalog.length === 0 && (
                    <div style={{ color: '#aaa', padding: '32px 0', textAlign: 'center', gridColumn: '1/-1' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📭</div>
                      <p>No categories available yet.</p>
                    </div>
                  )}
                  {catalog.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).map(cat => (
                    <button key={cat._id} className="ap-cat-card" onClick={() => pickCategory(cat)}
                      style={{ '--cat-color': cat.color || '#16a34a', '--cat-bg': cat.bg || '#f0fdf4' }}>
                      <div className="ap-cat-img-wrap">
                        <img src={imgUrl(cat.image)} alt={cat.name} onError={e => e.target.style.opacity='0'} />
                        <div className="ap-cat-overlay" />
                        <span className="ap-cat-emoji">{cat.emoji}</span>
                      </div>
                      <div className="ap-cat-info">
                        <strong>{cat.name}</strong>
                        <span>{cat.items.length} items</span>
                      </div>
                      <FiChevronRight className="ap-cat-arrow" size={16} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && selectedCat && (
              <div className="ap-step-content">
                <div className="ap-step-label">
                  <h2><span style={{ color: selectedCat.color || '#16a34a' }}>{selectedCat.emoji} {selectedCat.name}</span> — Select Item</h2>
                  <p>Pick the specific product you want to list</p>
                </div>
                <div className="ap-search-bar">
                  <FiSearch size={14} />
                  <input placeholder="Search items..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                </div>
                <div className="ap-item-grid">
                  {selectedCat.items.filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase())).map(item => (
                    <button key={item.id} className="ap-item-card" onClick={() => pickItem(item)}>
                      <div className="ap-item-img-wrap">
                        <img src={imgUrl(item.image)} alt={item.name} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                        <div className="ap-item-fallback" style={{ display:'none' }}>{selectedCat.emoji}</div>
                      </div>
                      <div className="ap-item-info">
                        <strong>{item.name}</strong>
                        <span>per {item.unit}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && selectedItem && (
              <ProductDetailsForm
                form={form} setForm={setForm} discountPct={discountPct}
                selectedItem={selectedItem} selectedCat={selectedCat}
                onBack={() => setStep(1)} onSubmit={handleCatalogSubmit}
                submitting={submitting} isPending={false}
              />
            )}
          </>
        )}

        {/* ══ CUSTOM MODE ══ */}
        {mode === 'custom' && (
          <>
            {step === 0 && (
              <div className="ap-step-content">
                <div className="ap-step-label">
                  <h2>Create Custom Product</h2>
                  <p>Add a new product not in the catalog — requires admin approval</p>
                </div>

                {/* Category selection */}
                <div className="ap-custom-section">
                  <div className="ap-custom-section-title">Category</div>
                  <div className="ap-mode-toggle" style={{ marginBottom: 16 }}>
                    <button className={`ap-mode-btn ${customCatMode === 'existing' ? 'active' : ''}`}
                      onClick={() => setCustomCatMode('existing')}>Use Existing</button>
                    <button className={`ap-mode-btn ${customCatMode === 'new' ? 'active' : ''}`}
                      onClick={() => setCustomCatMode('new')}>Create New</button>
                  </div>

                  {customCatMode === 'existing' ? (
                    <div className="ap-field">
                      <label>Select Category</label>
                      <select value={customCatId} onChange={e => setCustomCatId(e.target.value)} className="ap-select">
                        <option value="">-- Choose a category --</option>
                        {catalog.map(c => <option key={c._id} value={c._id}>{c.emoji} {c.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="ap-custom-fields">
                      <div className="ap-field">
                        <label>Category Name *</label>
                        <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Exotic Fruits" />
                      </div>
                      <div className="ap-field">
                        <label>Emoji</label>
                        <input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} placeholder="🛒" style={{ width: 80 }} />
                      </div>
                      <div className="ap-field">
                        <label>Category Image <span className="ap-optional">(optional)</span></label>
                        <div className="ap-img-upload" onClick={() => catImgRef.current.click()}>
                          {newCatImagePreview
                            ? <img src={newCatImagePreview} alt="cat" />
                            : <><FiUpload size={20} /><span>Upload Image</span></>}
                        </div>
                        <input ref={catImgRef} type="file" accept="image/*" hidden onChange={pickFile(setNewCatImage, setNewCatImagePreview)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Item / Product name */}
                <div className="ap-custom-section">
                  <div className="ap-custom-section-title">Product Details</div>
                  <div className="ap-custom-fields">
                    <div className="ap-field">
                      <label>Product Name *</label>
                      <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Dragon Fruit" />
                    </div>
                    <div className="ap-field">
                      <label>Unit</label>
                      <input value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} placeholder="kg / piece / 250g" />
                    </div>
                    <div className="ap-field">
                      <label>Product Image <span className="ap-optional">(optional)</span></label>
                      <div className="ap-img-upload" onClick={() => itemImgRef.current.click()}>
                        {newItemImagePreview
                          ? <img src={newItemImagePreview} alt="item" />
                          : <><FiUpload size={20} /><span>Upload Image</span></>}
                      </div>
                      <input ref={itemImgRef} type="file" accept="image/*" hidden onChange={pickFile(setNewItemImage, setNewItemImagePreview)} />
                    </div>
                  </div>
                </div>

                <button className="ap-submit-btn" style={{ marginTop: 8 }}
                  disabled={!customName.trim() || (customCatMode === 'existing' && !customCatId) || (customCatMode === 'new' && !newCatName.trim())}
                  onClick={() => { setForm(f => ({ ...f, unit: newItemUnit })); setStep(1); }}>
                  Continue to Pricing <FiChevronRight size={16} />
                </button>
              </div>
            )}

            {step === 1 && (
              <ProductDetailsForm
                form={form} setForm={setForm} discountPct={discountPct}
                selectedItem={{ name: customName, image: newItemImagePreview }}
                selectedCat={{ name: customCatMode === 'new' ? newCatName : (catalog.find(c => c._id === customCatId)?.name || ''), emoji: customCatMode === 'new' ? newCatEmoji : (catalog.find(c => c._id === customCatId)?.emoji || '🛒'), color: '#2D6A4F', bg: '#f0faf4' }}
                onBack={() => setStep(0)} onSubmit={handleCustomSubmit}
                submitting={submitting} isPending={true}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProductDetailsForm({ form, setForm, discountPct, selectedItem, selectedCat, onBack, onSubmit, submitting, isPending }) {
  return (
    <div className="ap-step-content ap-details-layout">
      <div className="ap-preview-col">
        <div className="ap-preview-card">
          <div className="ap-preview-badge">{isPending ? '⏳ Pending Approval' : 'Live Preview'}</div>
          <div className="ap-preview-img-wrap">
            <img src={selectedItem.image?.startsWith('blob:') ? selectedItem.image : imgUrl(selectedItem.image)} alt={selectedItem.name} onError={e => e.target.style.display='none'} />
          </div>
          <div className="ap-preview-body">
            <span className="ap-preview-cat" style={{ background: selectedCat.bg, color: selectedCat.color }}>
              {selectedCat.emoji} {selectedCat.name}
            </span>
            <h3>{selectedItem.name}</h3>
            <div className="ap-preview-pricing">
              {form.discountPrice ? (
                <>
                  <span className="ap-price-final">₹{form.discountPrice}</span>
                  <span className="ap-price-original">₹{form.price}</span>
                  {discountPct > 0 && <span className="ap-price-badge">{discountPct}% OFF</span>}
                </>
              ) : (
                <span className="ap-price-final">{form.price ? `₹${form.price}` : '₹ —'}</span>
              )}
              {form.unit && <span className="ap-price-unit">/ {form.unit}</span>}
            </div>
            {isPending && <div className="ap-pending-badge" style={{ marginTop: 8 }}><FiClock size={11} /> Needs Admin Approval</div>}
          </div>
        </div>
        <button className="ap-change-btn" onClick={onBack}><FiShoppingBag size={14} /> Change</button>
      </div>

      <div className="ap-form-col">
        <div className="ap-form-card">
          <div className="ap-form-section">Pricing</div>
          <div className="ap-form-row">
            <div className="ap-field">
              <label>MRP / Original Price <span className="ap-req">*</span></label>
              <div className="ap-input-wrap">
                <span className="ap-prefix">₹</span>
                <input type="number" min="0" placeholder="e.g. 120"
                  value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            <div className="ap-field">
              <label>Selling Price <span className="ap-optional">(optional)</span></label>
              <div className="ap-input-wrap">
                <span className="ap-prefix">₹</span>
                <input type="number" min="0" placeholder="e.g. 99"
                  value={form.discountPrice} onChange={e => setForm(f => ({ ...f, discountPrice: e.target.value }))} />
              </div>
            </div>
          </div>
          {discountPct > 0 && (
            <div className="ap-discount-pill">🎉 You're offering <strong>{discountPct}% discount</strong></div>
          )}
          <div className="ap-form-section">Stock & Unit</div>
          <div className="ap-form-row">
            <div className="ap-field">
              <label>Available Quantity <span className="ap-req">*</span></label>
              <div className="ap-input-wrap">
                <span className="ap-prefix"><FiPackage size={13} /></span>
                <input type="number" min="0" placeholder="e.g. 50"
                  value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
              </div>
            </div>
            <div className="ap-field">
              <label>Unit</label>
              <div className="ap-input-wrap">
                <span className="ap-prefix"><FiTag size={13} /></span>
                <input type="text" placeholder="kg / piece / 250g"
                  value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="ap-form-section">Description <span className="ap-optional">(optional)</span></div>
          <textarea className="ap-textarea" rows={3} maxLength={300}
            placeholder="Describe freshness, origin, quality..."
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <span className="ap-char-count">{form.description.length}/300</span>
          <button className="ap-submit-btn" onClick={onSubmit}
            disabled={submitting || !form.price || !form.stock}>
            {submitting
              ? <><span className="ap-spinner" /> Submitting...</>
              : isPending
                ? <><FiClock size={16} /> Submit for Approval</>
                : <><FiCheck size={16} /> Submit Product</>}
          </button>
        </div>
      </div>
    </div>
  );
}
