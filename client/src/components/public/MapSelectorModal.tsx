import { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '../ui/Button';
import api from '../../services/api';

// Fix Leaflet's default icon path issues with Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string, lat: number, lon: number) => void;
  title?: string;
}

function LocationMarker({ position, setPosition, setAddress, setIsFetching }: any) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition(e.latlng);
      fetchAddress(lat, lng);
    },
  });

  const fetchAddress = async (lat: number, lng: number) => {
    setIsFetching(true);
    try {
      const { data } = await api.get('/location/reverse', { params: { lat, lon: lng } });
      setAddress(data.data?.displayName || 'Unknown Location');
    } catch (error) {
      console.error('Error fetching address:', error);
      setAddress('Error fetching location');
    } finally {
      setIsFetching(false);
    }
  };

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapSelectorModal({ isOpen, onClose, onSelect, title = "Select Location" }: MapSelectorModalProps) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [address, setAddress] = useState<string>('');
  const [isFetching, setIsFetching] = useState(false);

  // Default to Bengaluru if geolocation is not available immediately
  const [center, setCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [zoom, setZoom] = useState(11);

  useEffect(() => {
    if (isOpen) {
      // Try to get user's current location to center map
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setCenter([pos.coords.latitude, pos.coords.longitude]);
          setZoom(12);
        });
      }
      setPosition(null);
      setAddress('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (address && position && !isFetching) {
      // Clean up the address to make it shorter (first 3 parts)
      const parts = address.split(', ');
      const shortAddress = parts.slice(0, Math.min(3, parts.length)).join(', ');
      onSelect(shortAddress, position.lat, position.lng);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh] md:h-[600px]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-brand-500" />
            {title}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative z-0">
          <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker 
              position={position} 
              setPosition={setPosition} 
              setAddress={setAddress}
              isFetching={isFetching}
              setIsFetching={setIsFetching}
            />
          </MapContainer>
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-white border-t border-slate-100">
          <p className="text-sm text-slate-500 mb-2 font-medium">Selected Location:</p>
          <div className="min-h-[3rem] bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 text-sm text-slate-800 flex items-center">
            {isFetching ? (
              <span className="flex items-center text-slate-500">
                <span className="animate-pulse h-2 w-2 bg-brand-500 rounded-full mr-2"></span>
                Resolving address...
              </span>
            ) : position ? (
              address
            ) : (
              <span className="text-slate-400">Click anywhere on the map to select a location</span>
            )}
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose} className="border-slate-200 text-slate-600">Cancel</Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!position || isFetching}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold"
            >
              Confirm Location
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
