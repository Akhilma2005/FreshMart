import { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../App';
import { categories as staticCategories } from '../data/products';
import API from '../api';

export default function useFrontCategories() {
  const socket = useContext(SocketContext);
  const [categories, setCategories] = useState(staticCategories);

  const fetchCategories = () => {
    fetch(`${API}/admin/front-categories/public`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (data.length > 0) setCategories(data); })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCategories();
    socket.on('categories:updated', fetchCategories);
    return () => socket.off('categories:updated', fetchCategories);
  }, []); // eslint-disable-line

  return categories;
}
