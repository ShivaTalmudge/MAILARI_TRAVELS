import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Calendar, Clock, Map as MapIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import MapSelectorModal from './MapSelectorModal';
import LocationAutocomplete from './LocationAutocomplete';
import { useBookingDraftStore } from '../../features/booking/bookingDraftStore';

type TripType = 'LOCAL' | 'OUTSTATION' | 'AIRPORT' | 'RENTAL';

const TRIP_TYPE_MAP: Record<TripType, string> = {
  LOCAL: 'LOCAL',
  OUTSTATION: 'OUTSTATION',
  AIRPORT: 'AIRPORT_TRANSFER',
  RENTAL: 'FULL_DAY_RENTAL',
};

export default function BookingWidget() {
  const [activeTab, setActiveTab] = useState<TripType>('LOCAL');
  const navigate = useNavigate();
  const setDraft = useBookingDraftStore((s) => s.setDraft);

  const [formData, setFormData] = useState({
    pickup: '', pickupLat: undefined as number | undefined, pickupLng: undefined as number | undefined,
    destination: '', destinationLat: undefined as number | undefined, destinationLng: undefined as number | undefined,
    date: '',
    time: '',
  });

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [activeMapField, setActiveMapField] = useState<'pickup' | 'destination' | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Booking requires an account. Save what the visitor entered so it
    // survives the login/register interruption, then send them to sign in —
    // the customer booking wizard picks the draft back up once they're in.
    setDraft({
      tripType: TRIP_TYPE_MAP[activeTab],
      pickupLocation: formData.pickup,
      pickupLat: formData.pickupLat,
      pickupLng: formData.pickupLng,
      dropLocation: formData.destination,
      dropLat: formData.destinationLat,
      dropLng: formData.destinationLng,
      pickupDate: formData.date,
      pickupTime: formData.time,
    });
    navigate('/login/customer');
  };

  const handleOpenMap = (field: 'pickup' | 'destination') => {
    setActiveMapField(field);
    setIsMapModalOpen(true);
  };

  const handleLocationSelect = (address: string, lat: number, lon: number) => {
    if (activeMapField === 'pickup') {
      setFormData((prev) => ({ ...prev, pickup: address, pickupLat: lat, pickupLng: lon }));
    } else if (activeMapField === 'destination') {
      setFormData((prev) => ({ ...prev, destination: address, destinationLat: lat, destinationLng: lon }));
    }
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-12 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500";

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
      <div className="bg-slate-50 px-6 py-5 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-900">Where are you travelling?</h3>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {(['LOCAL', 'OUTSTATION', 'AIRPORT', 'RENTAL'] as TripType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-xs sm:text-sm font-semibold text-center transition-colors ${
              activeTab === tab
                ? 'text-brand-600 border-b-2 border-brand-500 bg-white'
                : 'text-slate-500 hover:text-slate-700 bg-slate-50'
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <MapPin className="h-5 w-5 text-slate-400" />
            </div>
            <LocationAutocomplete 
              placeholder={activeTab === 'AIRPORT' ? "Airport Code or Name" : "Pickup Location"} 
              className={inputClass}
              value={formData.pickup}
              onChange={val => setFormData({...formData, pickup: val})}
              onSelectLocation={(r) => setFormData(prev => ({ ...prev, pickup: r.address, pickupLat: r.lat, pickupLng: r.lon }))}
              required
            />
            <button 
              type="button" 
              onClick={() => handleOpenMap('pickup')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-brand-500 transition-colors z-10"
              title="Select on map"
            >
              <MapIcon className="h-5 w-5" />
            </button>
          </div>

          {activeTab !== 'RENTAL' && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <MapPin className="h-5 w-5 text-brand-500" />
              </div>
              <LocationAutocomplete 
                placeholder={activeTab === 'AIRPORT' ? "Drop Location" : "Drop Destination"} 
                className={inputClass}
                value={formData.destination}
                onChange={val => setFormData({...formData, destination: val})}
                onSelectLocation={(r) => setFormData(prev => ({ ...prev, destination: r.address, destinationLat: r.lat, destinationLng: r.lon }))}
                required={activeTab === 'OUTSTATION'}
              />
              <button 
                type="button" 
                onClick={() => handleOpenMap('destination')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-brand-500 transition-colors z-10"
                title="Select on map"
              >
                <MapIcon className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="date" 
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500`}
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="time" 
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500`}
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
                required
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-lg mt-2 shadow-lg shadow-brand-500/30">
            CHECK AVAILABILITY
          </Button>

          <p className="text-center text-xs text-slate-500 mt-4">
            Already have an account? <Link to="/login/customer" className="text-brand-600 font-semibold hover:underline">Login to continue</Link>
          </p>
        </form>
      </div>

      <MapSelectorModal 
        isOpen={isMapModalOpen} 
        onClose={() => setIsMapModalOpen(false)}
        onSelect={handleLocationSelect}
        title={activeMapField === 'pickup' ? 'Select Pickup Location' : 'Select Drop Destination'}
      />
    </div>
  );
}
