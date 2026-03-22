import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import MiniCard from '../components/MiniCard';
import { FiSearch, FiFilter } from 'react-icons/fi';
import { SocketContext } from '../App';
import useFrontCategories from '../hooks/useFrontCategories';
import API, { imgUrl } from '../api';

export default function Products() {
  const location = useLocation();
  const socket = useContext(SocketContext);
  const params = new URLSearchParams(location.search);
  const initialCat    = decodeURIComponent(params.get('cat') || 'All');
  const initialSearch = decodeURIComponent(params.get('search') || '');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState(initialCat);
  const [sortBy, setSortBy] = useState('default');
  const categories = useFrontCategories();

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setActiveCategory(decodeURIComponent(p.get('cat') || 'All'));
    setSearch(decodeURIComponent(p.get('search') || ''));
  }, [location.search]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const query = new URLSearchParams();
      if (activeCategory !== 'All') query.set('cat', activeCategory);
      if (search) query.set('search', search);
      try {
        const res = await fetch(`${API}/products?${query.toString()}`);
        const data = await res.json();
        const merged = data.map(p => {
          let img = p.image || null;
          if (img && img.startsWith('/uploads/')) img = imgUrl(img);
          return { ...p, image: img };
        });
        setProducts(merged);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
    socket.on('products:updated', fetchProducts);
    return () => socket.off('products:updated', fetchProducts);
  }, [activeCategory, search, socket]);

  let filtered = [...products].sort((a, b) => a.name.localeCompare(b.name));
  if (sortBy === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (sortBy === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);

  return (
    <div className="products-page">
      <div className="products-hero">
        <h1>🛍️ All Products</h1>
        <p>Fresh, quality groceries — fruits, vegetables, meats, spices & more</p>
      </div>

      <div className="products-container">
        <div className="filters-bar">
          <div className="search-box">
            <FiSearch />
            <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="sort-box">
            <FiFilter />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="default">Sort By</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        <div className="category-tabs">
          <button className={activeCategory === 'All' ? 'tab active' : 'tab'} onClick={() => setActiveCategory('All')}>
            🏪 All
          </button>
          {categories.map(c => {
            const aliasGroups = [
              ['cooking items', 'cooking oils'],
              ['masalas', 'masalas & spices', 'masala & spices', 'masala & species', 'spices', 'masala'],
            ];
            const isActive = activeCategory === c.name ||
              aliasGroups.some(g => g.includes(activeCategory.toLowerCase()) && g.includes(c.name.toLowerCase()));
            return (
              <button key={c.id || c._id} className={isActive ? 'tab active' : 'tab'} onClick={() => setActiveCategory(c.name)}>
                {c.icon} {c.displayName || c.name}
              </button>
            );
          })}
        </div>

        <p className="results-count">
          {loading ? 'Loading...' : <>Showing <strong>{filtered.length}</strong> products{activeCategory !== 'All' && <> in <strong>{(() => { const aliasGroups = [['cooking items','cooking oils'],['masalas','masalas & spices','masala & spices','masala & species','spices','masala']]; const match = categories.find(c => c.name === activeCategory || aliasGroups.some(g => g.includes(c.name.toLowerCase()) && g.includes(activeCategory.toLowerCase()))); return match?.displayName || match?.name || activeCategory; })()}</strong></>}</>}
        </p>

        {loading ? (
          <div className="no-results"><span>⏳</span><h3>Loading products...</h3></div>
        ) : filtered.length > 0 ? (
          <div className="products-grid-page">
            {filtered.map(p => <MiniCard key={p._id || p.id} product={p} />)}
          </div>
        ) : (
          <div className="no-results">
            <span>😕</span>
            <h3>No products found</h3>
            <p>Try a different search or category</p>
          </div>
        )}
      </div>
    </div>
  );
}
