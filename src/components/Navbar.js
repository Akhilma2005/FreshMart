import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CartContext, FavoritesContext, AuthContext, SocketContext } from '../App';
import { useBackendSearch, SuggestionDropdown } from './SearchBar';
import API from '../api';
import {
  FiShoppingCart, FiMenu, FiX, FiSearch,
  FiUser, FiHeart, FiChevronDown, FiLogOut, FiShoppingBag, FiMapPin,
  FiPlus, FiCheck, FiTrash2, FiSettings, FiPackage, FiShield
} from 'react-icons/fi';
import './Navbar.css';

// Fix Leaflet default marker icon broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Captures the Leaflet map instance into a ref
function MapController({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

// Inner component: handles map clicks and exposes marker drag
function DraggableMarker({ coords, onChange }) {
  useMapEvents({
    click(e) { onChange({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return (
    <Marker
      position={[coords.lat, coords.lng]}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          onChange({ lat, lng });
        }
      }}
    />
  );
}

const DEFAULT_TICKER = [
  '🚚 Free delivery on orders above ₹499',
  '🌿 100% Fresh & Organic produce daily',
  '⏱ Delivered in 2 hours guaranteed',
  '🥩 Premium Chicken & Mutton — Hygienically Packed',
  '🌶️ Pure Masalas & Spices — No Additives',
  '⭐ Rated 4.8★ by 50,000+ Happy Customers',
  '🎁 New User? ₹100 OFF — Code: NEW100',
];

const DEFAULT_NAV_CATS = [
  { label: '🍎 Fruits', path: '/products?cat=Fruits' },
  { label: '🥦 Vegetables', path: '/products?cat=Vegetables' },
  { label: '🥩 Meats', path: '/products?cat=Raw Meats' },
  { label: '🌶️ Masalas', path: '/products?cat=Masalas %26 Spices' },
  { label: '🫙 Cooking Oils', path: '/products?cat=Cooking Items' },
  { label: '🥛 Dairy', path: '/products?cat=Dairy' },
  { label: '🥜 Dry Fruits', path: '/products?cat=Dry Fruits' },
];

function CatBar({ navCategories, setNavCategories, isAdmin, token, location }) {
  const [editMode, setEditMode] = useState(false);
  const [editList, setEditList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newPath, setNewPath] = useState('');

  const enterEdit = () => { setEditList(navCategories.map(c => ({ ...c }))); setEditMode(true); };
  const cancelEdit = () => { setEditMode(false); setNewLabel(''); setNewPath(''); };

  const save = async () => {
    setSaving(true);
    const r = await fetch(`${API}/admin/navbar-config`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ navCategories: editList }),
    });
    setSaving(false);
    if (r.ok) { setNavCategories(editList); setEditMode(false); setNewLabel(''); setNewPath(''); }
  };

  const addLink = () => {
    if (!newLabel.trim() || !newPath.trim()) return;
    setEditList(v => [...v, { label: newLabel.trim(), path: newPath.trim() }]);
    setNewLabel(''); setNewPath('');
  };

  if (editMode) return (
    <div className="nb-catbar nb-catbar-edit">
      <div className="nb-catbar-inner nb-catbar-edit-inner">
        {editList.map((c, i) => (
          <div key={i} className="nb-catedit-item">
            <input className="nb-catedit-input" value={c.label} placeholder="Label"
              onChange={e => setEditList(v => v.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
            <input className="nb-catedit-input nb-catedit-path" value={c.path} placeholder="/products?cat=..."
              onChange={e => setEditList(v => v.map((x, j) => j === i ? { ...x, path: e.target.value } : x))} />
            <button className="nb-catedit-del" onClick={() => setEditList(v => v.filter((_, j) => j !== i))} title="Remove"><FiTrash2 size={11} /></button>
          </div>
        ))}
        <div className="nb-catedit-item nb-catedit-new">
          <input className="nb-catedit-input" value={newLabel} placeholder="🍎 New Label"
            onChange={e => setNewLabel(e.target.value)} />
          <input className="nb-catedit-input nb-catedit-path" value={newPath} placeholder="/products?cat=Fruits"
            onChange={e => setNewPath(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addLink()} />
          <button className="nb-catedit-add" onClick={addLink} title="Add"><FiPlus size={11} /></button>
        </div>
        <div className="nb-catedit-actions">
          <button className="nb-catedit-save" onClick={save} disabled={saving}><FiCheck size={12} /> {saving ? 'Saving…' : 'Save'}</button>
          <button className="nb-catedit-cancel" onClick={cancelEdit}><FiX size={12} /> Cancel</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="nb-catbar">
      <div className="nb-catbar-inner">
        <Link to="/products" className="nb-catbar-all">
          <FiMenu size={15} /> All Categories <FiChevronDown size={13} />
        </Link>
        {navCategories.map(c => (
          <Link
            key={c.path}
            to={c.path}
            className={`nb-catbar-link ${location.search.includes(encodeURIComponent(c.path.split('=')[1])) || location.search.includes(c.path.split('=')[1]) ? 'active' : ''}`}
          >
            {c.label}
          </Link>
        ))}
        <Link
          to="/products?deals=true"
          className={`nb-catbar-deal ${location.search.includes('deals=true') ? 'active' : ''}`}
        >⚡ Today's Deals</Link>
        {isAdmin && (
          <button className="nb-catbar-edit-btn" onClick={enterEdit} title="Edit categories">
            <FiSettings size={13} /> Edit
          </button>
        )}
      </div>
    </div>
  );
}

export default function Navbar() {
  const { cartItems } = useContext(CartContext);
  const { favorites } = useContext(FavoritesContext);
  const { auth, logout } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const [ticker, setTicker] = useState(DEFAULT_TICKER);
  const [navCategories, setNavCategories] = useState(DEFAULT_NAV_CATS);

  const fetchNavbarCfg = useCallback(() => {
    fetch(`${API}/admin/navbar-config`)
      .then(r => r.ok ? r.json() : {})
      .then(d => {
        if (d.ticker?.length) setTicker(d.ticker);
        if (d.navCategories?.length) setNavCategories(d.navCategories);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetchNavbarCfg();
    socket.on('navbar:updated', fetchNavbarCfg);
    return () => socket.off('navbar:updated', fetchNavbarCfg);
  }, []); // eslint-disable-line
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searchCategory, setSearchCategory] = useState('All');
  const [scrolled, setScrolled] = useState(false);
  const [locationLabel, setLocationLabel] = useState('My Location');
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCoords, setMapCoords] = useState({ lat: 20.5937, lng: 78.9629 });
  const [locSearch, setLocSearch] = useState('');
  const [locResults, setLocResults] = useState([]);
  const [locSearching, setLocSearching] = useState(false);
  const locSearchTimer = useRef();
  const mapRef = useRef();

  const [showSug, setShowSug] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recentSearches')) || []; } catch { return []; }
  });
  const searchRef = useRef();
  const debounceTimer = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dropRef = useRef();

  // Reverse geocode using free Nominatim (OpenStreetMap)
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const d = await r.json();
      const a = d.address || {};
      const label = a.suburb || a.neighbourhood || a.village || a.town || a.city || a.county || 'My Location';
      return label;
    } catch { return 'My Location'; }
  }, []);

  // Search locations using free Nominatim
  const searchLocation = (val) => {
    setLocSearch(val);
    clearTimeout(locSearchTimer.current);
    if (!val.trim()) { setLocResults([]); return; }
    setLocSearching(true);
    locSearchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&countrycodes=in&format=json&limit=5`);
        const d = await r.json();
        setLocResults(d);
      } catch { setLocResults([]); }
      finally { setLocSearching(false); }
    }, 400);
  };

  const pickLocResult = (item) => {
    const coords = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
    setMapCoords(coords);
    setLocSearch(item.display_name.split(',')[0]);
    setLocResults([]);
    mapRef.current?.setView([coords.lat, coords.lng], 16);
  };

  const openMapModal = () => {
    setShowMapModal(true);
    setLocSearch('');
    setLocResults([]);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => setMapCoords({ lat: coords.latitude, lng: coords.longitude }),
        () => { }
      );
    }
  };

  const confirmLocation = async () => {
    const label = await reverseGeocode(mapCoords.lat, mapCoords.lng);
    setLocationLabel(label);
    setShowMapModal(false);
    if (auth?.user?.id) {
      fetch(`${API}/users/${auth.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ locationLabel: label, lat: mapCoords.lat, lng: mapCoords.lng }),
      }).catch(() => { });
    }
  };

  // load saved location from backend when user is logged in
  useEffect(() => {
    if (!auth?.user?.id) return;
    fetch(`${API}/users/${auth.user.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => { if (d.locationLabel) setLocationLabel(d.locationLabel); })
      .catch(() => { });
  }, [auth?.user?.id]);

  const { suggestions, setSuggestions, loading, fetchSuggestions } = useBackendSearch(API);

  useEffect(() => {
    if (suggestions.length > 0 && suggestions[0].category && suggestions[0].category !== 'Category') {
      const topCat = suggestions[0].category;
      const match = navCategories.find(c => {
        const val = decodeURIComponent(c.path.split('=')[1]).toLowerCase();
        const top = topCat.toLowerCase();

        // Handle database typos (Masala & Species vs Masalas & Spices) safely
        if (top.includes('masala') && val.includes('masala')) return true;

        return val === top || c.label.toLowerCase().includes(top);
      });
      if (match) setSearchCategory(decodeURIComponent(match.path.split('=')[1]));
      else setSearchCategory('All');
    } else if (!searchVal.trim()) {
      setSearchCategory('All');
    }
  }, [suggestions, navCategories, searchVal]);

  const totalQty = cartItems.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  const avatarKey = `avatar_${auth?.user?.id}`;
  const [avatar, setAvatar] = useState(() => localStorage.getItem(avatarKey) || null);

  useEffect(() => { setAvatar(localStorage.getItem(avatarKey) || null); }, [auth?.user?.id]);
  useEffect(() => {
    const sync = () => setAvatar(localStorage.getItem(avatarKey) || null);
    window.addEventListener('avatarUpdated', sync);
    return () => window.removeEventListener('avatarUpdated', sync);
  }, [avatarKey]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setMenuOpen(false); setDropOpen(false); setShowSug(false); }, [location]);

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const [sugActiveIdx, setSugActiveIdx] = useState(-1);

  const handleSearchChange = (val) => {
    setSearchVal(val);
    setSugActiveIdx(-1);
    setShowSug(true);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!val.trim()) { setSuggestions([]); return; }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSearchKeyDown = (e) => {
    if (!showSug) return;
    const maxIdx = searchVal.trim() ? suggestions.length - 1 : recentSearches.length + 4 - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSugActiveIdx(i => Math.min(i + 1, maxIdx)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSugActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (sugActiveIdx >= 0) {
        if (!searchVal.trim()) {
          const isRecent = sugActiveIdx < recentSearches.length;
          const label = isRecent ? recentSearches[sugActiveIdx] : ['Apples', 'Milk', 'Chicken Breast', 'Onions'][sugActiveIdx - recentSearches.length];
          pickSuggestion({ label });
        } else {
          pickSuggestion(suggestions[sugActiveIdx]);
        }
      } else if (searchVal.trim()) {
        handleSearch(e);
      }
    }
    else if (e.key === 'Escape') { setShowSug(false); }
  };

  const saveRecentSearch = (term) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(r => r !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const pickSuggestion = (s) => {
    setSearchVal(s.label);
    saveRecentSearch(s.label);
    setShowSug(false);
    let url = `/products?search=${encodeURIComponent(s.label)}`;
    if (searchCategory !== 'All') url += `&cat=${encodeURIComponent(searchCategory)}`;
    navigate(url);
  };

  const clearRecentSearches = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      saveRecentSearch(searchVal.trim());
      let url = `/products?search=${encodeURIComponent(searchVal.trim())}`;
      if (searchCategory !== 'All') url += `&cat=${encodeURIComponent(searchCategory)}`;
      navigate(url);
      setShowSug(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <header className="site-header">

      {/* ── Ticker ── */}
      <div className="nb-ticker">
        <div className="nb-ticker-track">
          {[...ticker, ...ticker].map((t, i) => (
            <span className="nb-ticker-item" key={i}>
              {t}
              <span className="nb-ticker-dot">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Main Nav ── */}
      <nav className={`nb-nav ${scrolled ? 'nb-scrolled' : ''}`}>
        <div className="nb-inner">

          {/* Logo */}
          <Link to="/" className="nb-logo">
            <div className="nb-logo-icon">🌿</div>
            <div className="nb-logo-text">
              <span className="nb-logo-name">FreshMart</span>
              <span className="nb-logo-sub">Farm to Table</span>
            </div>
          </Link>

          {/* Location pill */}
          <div className="nb-location" onClick={openMapModal} title="Click to set delivery location">
            <FiMapPin size={13} />
            <span>Deliver to <strong>{locationLabel}</strong></span>
            <FiChevronDown size={12} />
          </div>

          {/* Search */}
          <form className="nb-search" onSubmit={handleSearch} ref={searchRef}>
            <select className="nb-search-cat" value={searchCategory} onChange={e => {
              setSearchCategory(e.target.value);
              if (e.target.value !== 'All') navigate(`/products?cat=${encodeURIComponent(e.target.value)}`);
            }}>
              <option value="All">All</option>
              {navCategories.map(c => {
                const rawCat = decodeURIComponent(c.path.split('=')[1]);
                return <option key={c.path} value={rawCat}>{c.label.split(' ').slice(1).join(' ')}</option>;
              })}
            </select>
            <div className="nb-search-divider" />
            <FiSearch className="nb-search-ico" size={16} />
            <input
              type="text"
              placeholder="Search fruits, vegetables, meats, masalas…"
              value={searchVal}
              onChange={e => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                setShowSug(true);
                if (searchVal.trim()) fetchSuggestions(searchVal);
              }}
              autoComplete="off"
            />
            <button type="submit" className="nb-search-btn">Search</button>
            {showSug && (
              <SuggestionDropdown
                suggestions={suggestions}
                query={searchVal}
                activeIdx={sugActiveIdx}
                setActiveIdx={setSugActiveIdx}
                onSelect={pickSuggestion}
                className="nb-suggestions"
                recentSearches={recentSearches}
                onClearRecent={clearRecentSearches}
                loading={loading}
              />
            )}
          </form>

          {/* Actions */}
          <div className="nb-actions">

            {/* Seller Hub */}
            {(auth?.user?.roles?.includes('vendor') || auth?.user?.role === 'vendor') && location.pathname !== '/vendor' && (
              <Link to="/vendor" className="nb-seller-btn">
                <FiShoppingBag size={15} />
                <span>Seller Hub</span>
              </Link>
            )}

            {/* Account */}
            {auth ? (
              <div className="nb-profile-wrap" ref={dropRef}>
                <button className="nb-profile-btn" onClick={() => setDropOpen(o => !o)}>
                  <div className="nb-avatar">
                    {avatar
                      ? <img src={avatar} alt="av" />
                      : (auth.user.name?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="nb-action-text">
                    <small>Hello,</small>
                    <strong>{auth.user.name?.split(' ')[0] || 'User'}</strong>
                  </div>
                  <FiChevronDown size={13} />
                </button>

                {dropOpen && (
                  <div className="nb-dropdown">
                    <div className="nb-dd-header">
                      <div className="nb-dd-avatar">
                        {avatar
                          ? <img src={avatar} alt="av" />
                          : (auth.user.name?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <strong>{auth.user.name || 'User'}</strong>
                        <small>{auth.user.email}</small>
                        <div className="nb-dd-roles">
                          {auth.user.roles?.map(r => (
                            <span key={r} className={`nb-dd-role ${r}`}>{r}</span>
                          )) || <span className={`nb-dd-role ${auth.user.role}`}>{auth.user.role}</span>}
                        </div>
                      </div>
                    </div>
                    <Link to="/profile" className="nb-dd-item"><FiUser size={14} /> My Profile</Link>
                    {(auth.user.roles?.includes('vendor') || auth.user.role === 'vendor') && (
                      <Link to="/vendor" className="nb-dd-item nb-dd-vendor"><FiShoppingBag size={14} /> Seller Hub</Link>
                    )}
                    <Link to="/favorites" className="nb-dd-item"><FiHeart size={14} /> Favourites</Link>
                    <Link to="/orders" className="nb-dd-item"><FiPackage size={14} /> Order History</Link>
                    <button className="nb-dd-item nb-dd-logout" onClick={handleLogout}>
                      <FiLogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="nb-action-btn">
                <FiUser size={19} />
                <div className="nb-action-text">
                  <small>Hello, Sign in</small>
                  <strong>Account</strong>
                </div>
              </Link>
            )}

            {/* Wishlist */}
            <Link to="/favorites" className="nb-action-btn">
              <FiHeart size={19} />
              <div className="nb-action-text">
                <small>{favorites.length} saved</small>
                <strong>Wishlist</strong>
              </div>
            </Link>

            {/* Orders */}
            <Link to="/orders" className="nb-action-btn">
              <FiPackage size={19} />
              <div className="nb-action-text">
                <small>Track</small>
                <strong>Orders</strong>
              </div>
            </Link>

            {/* Cart */}
            <Link to="/cart" className="nb-cart-btn">
              <div className="nb-cart-icon">
                <FiShoppingCart size={20} />
                {totalQty > 0 && <span className="nb-cart-badge">{totalQty}</span>}
              </div>
              <div className="nb-action-text">
                <small>{totalQty} items</small>
                <strong>₹{totalPrice}</strong>
              </div>
            </Link>

            {/* Hamburger */}
            <button className="nb-hamburger" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>

        {/* ── Category bar ── */}
        <CatBar
          navCategories={navCategories}
          setNavCategories={setNavCategories}
          isAdmin={auth?.user?.roles?.includes('admin') || auth?.user?.role === 'admin'}
          token={auth?.token}
          location={location}
        />

        {/* ── Mobile menu ── */}
        {menuOpen && (
          <div className="nb-mobile-menu">
            <form className="nb-mobile-search" onSubmit={handleSearch}>
              <FiSearch size={15} />
              <input
                placeholder="Search products…"
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
              />
              <button type="submit">Go</button>
            </form>
            {[
              { path: '/', label: '🏠 Home' },
              { path: '/products', label: '🛍️ Products' },
              { path: '/categories', label: '📦 Categories' },
              { path: '/cart', label: '🛒 Cart' },
              { path: '/favorites', label: '❤️ Wishlist' },
              { path: '/orders', label: '📦 Orders' },
              { path: '/about', label: 'ℹ️ About' },
            ].map(l => (
              <Link key={l.path} to={l.path} className={`nb-mm-link ${location.pathname === l.path ? 'active' : ''}`}>
                {l.label}
              </Link>
            ))}
            {auth ? (
              <>
                <Link to="/profile" className={`nb-mm-link ${location.pathname === '/profile' ? 'active' : ''}`}>👤 My Profile</Link>
                {(auth.user.roles?.includes('vendor') || auth.user.role === 'vendor') && (
                  <Link to="/vendor" className={`nb-mm-link ${location.pathname === '/vendor' ? 'active' : ''}`}>🏪 Seller Hub</Link>
                )}

                <button className="nb-mm-link nb-mm-logout" onClick={handleLogout}>🚪 Logout</button>
              </>
            ) : (
              <Link to="/login" className={`nb-mm-link ${location.pathname === '/login' ? 'active' : ''}`}>👤 Login / Sign up</Link>
            )}
          </div>
        )}
      </nav>
      {/* ── Leaflet Map Modal ── */}
      {showMapModal && (
        <div className="nb-map-overlay" onClick={e => e.target.classList.contains('nb-map-overlay') && setShowMapModal(false)}>
          <div className="nb-map-modal">
            <div className="nb-map-header">
              <FiMapPin size={16} />
              <span>Set Delivery Location</span>
              <button className="nb-map-close" onClick={() => setShowMapModal(false)}><FiX size={18} /></button>
            </div>
            <div className="nb-map-search-wrap">
              <FiSearch size={14} className="nb-map-search-ico" />
              <input
                type="text"
                className="nb-map-search-input"
                placeholder="Search area, street, city…"
                value={locSearch}
                onChange={e => searchLocation(e.target.value)}
                autoComplete="off"
              />
              {locSearching && <span className="nb-map-searching">…</span>}
              {locResults.length > 0 && (
                <div className="nb-map-loc-results">
                  {locResults.map((r, i) => (
                    <button key={i} className="nb-map-loc-item" onClick={() => pickLocResult(r)}>
                      <FiMapPin size={12} />
                      <span>{r.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="nb-map-hint">Drag the pin or click on the map to set your exact location</p>
            <div className="nb-map-container">
              <MapContainer
                center={[mapCoords.lat, mapCoords.lng]}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
              >
                <MapController mapRef={mapRef} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <DraggableMarker coords={mapCoords} onChange={setMapCoords} />
              </MapContainer>
            </div>
            <button className="nb-map-confirm" onClick={confirmLocation}>
              <FiMapPin size={14} /> Confirm Location
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
