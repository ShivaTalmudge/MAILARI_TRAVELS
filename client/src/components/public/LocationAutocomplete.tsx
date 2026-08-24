import { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
  required?: boolean;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function LocationAutocomplete({ value, onChange, placeholder, className, required }: LocationAutocompleteProps) {
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      // Only search if user typed something new and it's longer than 3 chars
      // We check if query doesn't match the exact selected value to prevent re-searching when a result is clicked
      if (query && query.length > 3 && query !== value) {
        setIsSearching(true);
        try {
          // Add countrycodes=in to restrict to India for Mailari Travels context
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`);
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 800); // 800ms debounce to respect Nominatim limits

    return () => clearTimeout(searchTimer);
  }, [query, value]);

  const handleSelect = (result: SearchResult) => {
    // Shorten the display name for UI
    const parts = result.display_name.split(', ');
    const shortName = parts.slice(0, Math.min(3, parts.length)).join(', ');
    
    setQuery(shortName);
    onChange(shortName);
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
              {results.map((result) => (
                <li 
                  key={result.place_id}
                  onClick={() => handleSelect(result)}
                  className="p-3 hover:bg-brand-50 cursor-pointer flex items-start text-left transition-colors"
                >
                  <MapPin className="h-4 w-4 text-brand-400 mt-0.5 mr-2 shrink-0" />
                  <span className="text-sm text-slate-700">{result.display_name}</span>
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
