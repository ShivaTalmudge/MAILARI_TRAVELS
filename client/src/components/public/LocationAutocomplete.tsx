import { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import api from '../../services/api';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
  required?: boolean;
  /** Called with coordinates when the user picks a suggestion (not on free-typed text). */
  onSelectLocation?: (result: { address: string; lat: number; lon: number }) => void;
}

interface SearchResult {
  displayName: string;
  lat: number;
  lon: number;
}

export default function LocationAutocomplete({ value, onChange, placeholder, className, required, onSelectLocation }: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. from Map selection)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    // Close dropdown if clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      // Only search if user typed something new and it's longer than 3 chars.
      // Compares against `value` to avoid re-searching right after a result is clicked.
      if (query && query.length > 3 && query !== value) {
        setIsSearching(true);
        try {
          const { data } = await api.get('/location/search', { params: { q: query } });
          setResults(data.data);
          setIsOpen(true);
        } catch (error) {
          console.error('Location search failed', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 500); // debounce — search now goes through our own rate-limited/cached backend, not Nominatim directly

    return () => clearTimeout(searchTimer);
  }, [query, value]);

  const handleSelect = (result: SearchResult) => {
    const parts = result.displayName.split(', ');
    const shortName = parts.slice(0, Math.min(3, parts.length)).join(', ');

    setQuery(shortName);
    onChange(shortName);
    onSelectLocation?.({ address: shortName, lat: result.lat, lon: result.lon });
    setIsOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value); // Keep parent updated with raw text
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        required={required}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
      />

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-sm text-slate-500 text-center animate-pulse">Searching locations...</div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {results.map((result, idx) => (
                <li
                  key={`${result.lat},${result.lon},${idx}`}
                  onClick={() => handleSelect(result)}
                  className="p-3 hover:bg-brand-50 cursor-pointer flex items-start text-left transition-colors"
                >
                  <MapPin className="h-4 w-4 text-brand-400 mt-0.5 mr-2 shrink-0" />
                  <span className="text-sm text-slate-700">{result.displayName}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-sm text-slate-500 text-center">No locations found.</div>
          )}
        </div>
      )}
    </div>
  );
}
