import React, { useContext, useState, useEffect } from 'react';
import { FavoritesContext, AuthContext, SocketContext } from '../App';
import MiniCard from '../components/MiniCard';
import { FiHeart, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Favorites.css';

export default function Favorites() {
  const { favorites } = useContext(FavoritesContext);
  const { auth } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState([]);

  const fetchProducts = () => {
    fetch(`${API}/products`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAllProducts(data.map(p => {
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

  const favoriteProducts = allProducts.filter(p => favorites.includes(p._id || p.id));

  return (
    <div className="favorites-page">
      <div className="sticky-back-bar">
        <button onClick={() => navigate(-1)}><FiArrowLeft size={16} /> Back</button>
      </div>
      <div className="favorites-hero">
        <h1><FiHeart /> Your Wishlist</h1>
        <p>{auth ? `Saved items for ${auth.user.name?.split(' ')[0]}` : 'Sign in to sync your wishlist across devices'}</p>
      </div>

      <div className="favorites-container">
        {favoriteProducts.length > 0 ? (
          <>
            <p className="results-count">
              You have <strong>{favoriteProducts.length}</strong> saved product(s).
            </p>
            <div className="products-grid-page">
              {favoriteProducts.map(p => <MiniCard key={p._id || p.id} product={p} />)}
            </div>
          </>
        ) : (
          <div className="no-results">
            <span>💔</span>
            <h3>No favorites yet</h3>
            <p>Click the ♥ icon on any product to save it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
