import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiClock, FiTrendingUp } from 'react-icons/fi';
import API from '../api';
import './SearchBar.css';

export function highlight(text, query) {
  if (!query || !query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === query.trim().toLowerCase()
      ? <mark key={i} className="sb-highlight">{part}</mark>
      : part
  );
}

export function SuggestionDropdown({ suggestions, query, activeIdx, setActiveIdx, onSelect, className = '', recentSearches = [], onClearRecent, loading = false }) {
  if (loading && !suggestions.length && query.trim()) {
    return (
      <div className={`sb-dropdown ${className}`}>
        <div className="sb-no-results">Searching...</div>
      </div>
    );
  }

  if (!query.trim() && !suggestions.length) {
    const popular = [
      { label: 'Apples', type: 'popular' },
      { label: 'Milk', type: 'popular' },
      { label: 'Chicken Breast', type: 'popular' },
      { label: 'Onions', type: 'popular' }
    ];
    
    return (
      <div className={`sb-dropdown sb-dropdown-empty ${className}`}>
        {recentSearches.length > 0 && (
          <div className="sb-section">
            <div className="sb-section-header">
              <span>Recent Searches</span>
              <button type="button" onClick={onClearRecent} className="sb-clear-recent">Clear</button>
            </div>
            <ul>
              {recentSearches.map((r, i) => (
                <li key={'recent-'+i} className={`sb-item ${i === activeIdx ? 'sb-item--active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); onSelect({ label: r, type: 'search' }); }}
                    onMouseEnter={() => setActiveIdx(i)}>
                  <div className="sb-item-icon"><FiClock size={14} /></div>
                  <span className="sb-item-text">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="sb-section">
          <div className="sb-section-header"><span>Popular Searches</span></div>
          <ul>
            {popular.map((p, i) => {
              const idx = recentSearches.length + i;
              return (
                <li key={'pop-'+i} className={`sb-item ${idx === activeIdx ? 'sb-item--active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); onSelect(p); }}
                    onMouseEnter={() => setActiveIdx(idx)}>
                  <div className="sb-item-icon"><FiTrendingUp size={14} /></div>
                  <span className="sb-item-text">{p.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  if (!suggestions.length && query.trim() && !loading) {
    return (
      <div className={`sb-dropdown ${className}`}>
        <div className="sb-no-results">No results found for "{query}"</div>
      </div>
    );
  }

  return (
    <ul className={`sb-dropdown ${className}`}>
      {suggestions.map((item, i) => (
        <li
          key={item.label + i}
          className={`sb-item ${i === activeIdx ? 'sb-item--active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
          onMouseEnter={() => setActiveIdx(i)}
        >
          {item.type !== 'popular' && item.type !== 'search' && (
            <div className="sb-item-img-wrap">
              {item.image
                ? <img src={item.image} alt={item.label} className="sb-item-img"
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                : null}
              <span className="sb-item-emoji" style={{ display: item.image ? 'none' : 'flex' }}>{item.emoji}</span>
            </div>
          )}
          <div className="sb-item-content">
            <span className="sb-item-text">{highlight(item.label, query)}</span>
            {item.category && item.category !== 'Category' && <span className="sb-item-sub">{item.category}</span>}
          </div>
          {item.type === 'category' && <span className="sb-item-cat-badge">Category</span>}
        </li>
      ))}
    </ul>
  );
}

export function useBackendSearch(apiBase) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useCallback((q) => {
    if (!q || !q.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${apiBase}/search?q=${encodeURIComponent(q)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setSuggestions(data); setLoading(false); })
      .catch(() => { setSuggestions([]); setLoading(false); });
  }, [apiBase]);

  return { suggestions, setSuggestions, loading, fetchSuggestions };
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recentSearches')) || []; } catch { return []; }
  });
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();
  const debounceTimer = useRef(null);

  const { suggestions, setSuggestions, loading, fetchSuggestions } = useBackendSearch(API);

  useEffect(() => {
    const h = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const saveRecentSearch = (term) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(r => r !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearRecentSearches = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
    inputRef.current?.focus();
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIdx(-1);
    setOpen(true);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSelect = (item) => {
    setQuery(item.label);
    saveRecentSearch(item.label);
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.blur();
    navigate(`/products?search=${encodeURIComponent(item.label)}`);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' && query.trim()) {
        saveRecentSearch(query.trim());
        navigate(`/products?search=${encodeURIComponent(query.trim())}`);
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    const maxIdx = query.trim() ? suggestions.length - 1 : recentSearches.length + 4 - 1;

    if (e.key === 'ArrowDown')  {
      e.preventDefault();
      setActiveIdx(i => (i < maxIdx ? i + 1 : i));
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => (i > -1 ? i - 1 : -1));
    }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) {
        if (!query.trim()) {
          const isRecent = activeIdx < recentSearches.length;
          const label = isRecent 
            ? recentSearches[activeIdx] 
            : ['Apples', 'Milk', 'Chicken Breast', 'Onions'][activeIdx - recentSearches.length];
          handleSelect({ label });
        } else {
          handleSelect(suggestions[activeIdx]);
        }
      } else if (query.trim()) {
        saveRecentSearch(query.trim());
        navigate(`/products?search=${encodeURIComponent(query.trim())}`);
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="sb-wrapper" ref={wrapperRef}>
      <div className={`sb-box ${open ? 'sb-box--open' : ''}`}>
        <FiSearch size={16} className="sb-icon" />
        <input
          ref={inputRef}
          className="sb-input"
          type="text"
          placeholder="Search fruits, vegetables, meats…"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        {query && (
          <button type="button" className="sb-clear" onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); inputRef.current?.focus(); }}>✕</button>
        )}
      </div>
      {open && (
        <SuggestionDropdown
          suggestions={suggestions}
          query={query}
          activeIdx={activeIdx}
          setActiveIdx={setActiveIdx}
          onSelect={handleSelect}
          recentSearches={recentSearches}
          onClearRecent={clearRecentSearches}
          loading={loading}
        />
      )}
    </div>
  );
}
