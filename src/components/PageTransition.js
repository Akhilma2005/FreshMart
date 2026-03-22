import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import './PageTransition.css';

export default function PageTransition({ children }) {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return (
    <div className="page-transition" key={pathname + search}>
      {children}
    </div>
  );
}
