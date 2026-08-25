import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Select';
import LocationAutocomplete from '../../components/public/LocationAutocomplete';
import MapSelectorModal from '../../components/public/MapSelectorModal';
import { useToast } from '../../hooks/useToast';
import { useBookingDraftStore } from '../../features/booking/bookingDraftStore';
import api from '../../services/api';
import { CheckCircle2, Map as MapIcon, MapPin, ChevronLeft, ChevronRight, Car, Calendar } from 'lucide-react';

interface VehicleType {
  id: string;
  name: string;
  description: string;
  seatingCapacity: number;
  luggageCapacity: number;
}

interface FarePreview {
  baseFare: number; distanceCharges: number; driverAllowance: number; nightCharges: number;
  airportCharges: number; statePermitCharges: number; tollCharges: number; parkingCharges: number;
  extraCharges: number; subtotal: number; discount: number; taxAmount: number; totalAmount: number;
}

interface BookingForm {
  tripType: string;
  pickupLocation: string; pickupLat?: number; pickupLng?: number;
  dropLocation: string; dropLat?: number; dropLng?: number;
  pickupDate: string; pickupTime: string; returnDate: string;
  passengerCount: number; luggageCount: number;
  vehicleTypeId: string;
  flightNumber: string; flightType: string;
  specialInstructions: string;
  estimatedDistance?: number; estimatedDuration?: number;
}

const TRIP_TYPES = [
  { value: 'LOCAL', label: 'Local (within city)' },
  { value: 'OUTSTATION', label: 'Outstation' },
  { value: 'AIRPORT_TRANSFER', label: 'Airport Transfer' },
  { value: 'ONE_WAY', label: 'One Way Drop' },
  { value: 'ROUND_TRIP', label: 'Round Trip' },
  { value: 'FULL_DAY_RENTAL', label: 'Full Day Rental' },
];

const NEEDS_DROP = new Set(['OUTSTATION', 'AIRPORT_TRANSFER', 'ONE_WAY', 'ROUND_TRIP']);
const STEP_LABELS = ['Trip Type', 'Route', 'Schedule', 'Vehicle & Fare', 'Review'];

const emptyForm: BookingForm = {
  tripType: '', pickupLocation: '', dropLocation: '', pickupDate: '', pickupTime: '', returnDate: '',
  passengerCount: 1, luggageCount: 0, vehicleTypeId: '', flightNumber: '', flightType: '', specialInstructions: '',
};

const formatMoney = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;

export default function NewBooking() {
  const navigate = useNavigate();
  const toast = useToast();
  const { draft, clearDraft } = useBookingDraftStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [fare, setFare] = useState<FarePreview | null>(null);
  const [isFareLoading, setIsFareLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapField, setMapField] = useState<'pickup' | 'drop' | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Pick up any draft left by the public landing-page widget once, then
  // discard it so a later visit to this page starts clean.
  useEffect(() => {
    if (draft) {
      setForm((prev) => ({
        ...prev,
        tripType: draft.tripType || prev.tripType,
        pickupLocation: draft.pickupLocation || prev.pickupLocation,
        pickupLat: draft.pickupLat, pickupLng: draft.pickupLng,
        dropLocation: draft.dropLocation || prev.dropLocation,
        dropLat: draft.dropLat, dropLng: draft.dropLng,
        pickupDate: draft.pickupDate || prev.pickupDate,
        pickupTime: draft.pickupTime || prev.pickupTime,
      }));
      clearDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.get('/vehicle-types').then(({ data }) => setVehicleTypes(data.data)).catch(() => {});
  }, []);

  const update = (patch: Partial<BookingForm>) => setForm((prev) => ({ ...prev, ...patch }));
  const needsDrop = NEEDS_DROP.has(form.tripType);

  const fetchFarePreview = useCallback(async () => {
    if (!form.vehicleTypeId || !form.tripType) return;
    setIsFareLoading(true);
    try {
      let estimatedDistance: number | undefined;
      let estimatedDuration: number | undefined;
      if (form.pickupLat && form.pickupLng && form.dropLat && form.dropLng) {
        try {
          const { data } = await api.post('/location/route', {
            pickup: { lat: form.pickupLat, lon: form.pickupLng },
            drop: { lat: form.dropLat, lon: form.dropLng },
          });
          estimatedDistance = data.data.distanceKm;
          estimatedDuration = data.data.durationMin;
        } catch {
          // Route lookup is best-effort — fare preview still works without it (server recomputes at submit anyway).
        }
      }

      const pickupHour = form.pickupTime ? parseInt(form.pickupTime.split(':')[0], 10) : 12;
      const { data } = await api.post('/pricing/calculate', {
        vehicleTypeId: form.vehicleTypeId,
        tripType: form.tripType,
        estimatedDistance, estimatedDuration,
        isNightTrip: pickupHour >= 22 || pickupHour < 6,
        hasAirport: form.tripType === 'AIRPORT_TRANSFER',
        hasStateCrossing: form.tripType === 'OUTSTATION',
      });
      setFare(data.data);
      update({ estimatedDistance, estimatedDuration });
    } catch {
      toast('Could not calculate a fare estimate. You can still continue.', 'warning');
    } finally {
      setIsFareLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vehicleTypeId, form.tripType, form.pickupLat, form.pickupLng, form.dropLat, form.dropLng, form.pickupTime]);

  useEffect(() => {
    if (step === 4 && form.vehicleTypeId) fetchFarePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, form.vehicleTypeId]);

  const canProceed = (): boolean => {
    if (step === 1) return !!form.tripType;
    if (step === 2) return !!form.pickupLocation && (!needsDrop || !!form.dropLocation);
    if (step === 3) return !!form.pickupDate && !!form.pickupTime && form.passengerCount > 0;
    if (step === 4) return !!form.vehicleTypeId;
    return true;
  };

  const goNext = () => setStep((s) => Math.min(5, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const { data } = await api.post('/bookings', {
        tripType: form.tripType,
        vehicleTypeId: form.vehicleTypeId,
        pickupLocation: form.pickupLocation,
        pickupLat: form.pickupLat, pickupLng: form.pickupLng,
        dropLocation: form.dropLocation || undefined,
        dropLat: form.dropLat, dropLng: form.dropLng,
        pickupDate: form.pickupDate,
        pickupTime: form.pickupTime,
        returnDate: form.tripType === 'ROUND_TRIP' ? (form.returnDate || undefined) : undefined,
        passengerCount: form.passengerCount,
        luggageCount: form.luggageCount,
        estimatedDistance: form.estimatedDistance,
        estimatedDuration: form.estimatedDuration,
        flightNumber: form.tripType === 'AIRPORT_TRANSFER' ? form.flightNumber || undefined : undefined,
        flightType: form.tripType === 'AIRPORT_TRANSFER' ? form.flightType || undefined : undefined,
        specialInstructions: form.specialInstructions || undefined,
      });
      setConfirmedBooking(data.data);
      toast('Booking request submitted!', 'success');
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to create booking', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'flex h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-10 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';

  if (confirmedBooking) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 text-center py-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-9 w-9 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Booking Received</h1>
          <p className="mt-1 text-slate-500">Mailari Travels will confirm your trip shortly.</p>
        </div>
        <Card className="text-left">
          <CardContent className="space-y-3 p-6">
            <div className="flex justify-between"><span className="text-slate-500">Booking Number</span><span className="font-semibold">{confirmedBooking.bookingNumber}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pickup</span><span className="font-medium text-right max-w-[60%]">{confirmedBooking.pickupLocation}</span></div>
            {confirmedBooking.dropLocation && <div className="flex justify-between"><span className="text-slate-500">Drop</span><span className="font-medium text-right max-w-[60%]">{confirmedBooking.dropLocation}</span></div>}
            <div className="flex justify-between"><span className="text-slate-500">Date &amp; Time</span><span className="font-medium">{confirmedBooking.pickupDate?.slice(0, 10)} · {confirmedBooking.pickupTime}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Estimated Total</span><span className="font-bold text-brand-700">{formatMoney(Number(confirmedBooking.totalAmount))}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Payment Status</span><span className="font-medium">Pending</span></div>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => navigate('/customer/bookings')}>View My Bookings</Button>
          <Button onClick={() => navigate('/customer/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Book a Trip</h1>
        <p className="mt-1 text-slate-500">Step {step} of 5 &middot; {STEP_LABELS[step - 1]}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, idx) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${idx + 1 <= step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {idx + 1 < step ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
            </div>
            {idx < STEP_LABELS.length - 1 && <div className={`h-0.5 flex-1 ${idx + 1 < step ? 'bg-brand-600' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>What kind of trip is this?</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TRIP_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => update({ tripType: t.value })}
                className={`rounded-lg border p-4 text-left text-sm font-medium transition-colors ${form.tripType === t.value ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 hover:border-brand-300'}`}
              >
                {t.label}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Where are you travelling?</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3"><MapPin className="h-5 w-5 text-slate-400" /></div>
              <LocationAutocomplete
                placeholder="Pickup location"
                className={inputClass}
                value={form.pickupLocation}
                onChange={(val) => update({ pickupLocation: val })}
                onSelectLocation={(r) => update({ pickupLocation: r.address, pickupLat: r.lat, pickupLng: r.lon })}
                required
              />
              <button type="button" onClick={() => setMapField('pickup')} className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-slate-400 hover:text-brand-500">
                <MapIcon className="h-5 w-5" />
              </button>
            </div>

            {form.tripType !== 'LOCAL' && form.tripType !== 'FULL_DAY_RENTAL' && (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3"><MapPin className="h-5 w-5 text-brand-500" /></div>
                <LocationAutocomplete
                  placeholder="Drop destination"
                  className={inputClass}
                  value={form.dropLocation}
                  onChange={(val) => update({ dropLocation: val })}
                  onSelectLocation={(r) => update({ dropLocation: r.address, dropLat: r.lat, dropLng: r.lon })}
                  required={needsDrop}
                />
                <button type="button" onClick={() => setMapField('drop')} className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-slate-400 hover:text-brand-500">
                  <MapIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            <p className="text-xs text-slate-500">Tip: pick a suggestion from the list (or use the map) so we can estimate distance-based fare accurately.</p>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>When, and for how many?</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input type="date" label="Pickup Date" value={form.pickupDate} onChange={(e) => update({ pickupDate: e.target.value })} required />
              <Input type="time" label="Pickup Time" value={form.pickupTime} onChange={(e) => update({ pickupTime: e.target.value })} required />
              {form.tripType === 'ROUND_TRIP' && (
                <Input type="date" label="Return Date" value={form.returnDate} onChange={(e) => update({ returnDate: e.target.value })} />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input type="number" min={1} label="Passengers" value={form.passengerCount} onChange={(e) => update({ passengerCount: Number(e.target.value) })} />
              <Input type="number" min={0} label="Luggage" value={form.luggageCount} onChange={(e) => update({ luggageCount: Number(e.target.value) })} />
            </div>
            {form.tripType === 'AIRPORT_TRANSFER' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-slate-100 pt-4">
                <Input label="Flight Number" placeholder="e.g. AI 101" value={form.flightNumber} onChange={(e) => update({ flightNumber: e.target.value })} />
                <Select label="Flight Type" value={form.flightType} onChange={(e) => update({ flightType: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="DOMESTIC">Domestic</option>
                  <option value="INTERNATIONAL">International</option>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>Choose a vehicle</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {vehicleTypes.map((vt) => (
                <button
                  key={vt.id}
                  type="button"
                  onClick={() => update({ vehicleTypeId: vt.id })}
                  className={`rounded-lg border p-4 text-left transition-colors ${form.vehicleTypeId === vt.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-300'}`}
                >
                  <div className="flex items-center gap-2 font-semibold text-slate-900"><Car className="h-4 w-4 text-brand-600" /> {vt.name}</div>
                  <p className="mt-1 text-xs text-slate-500">{vt.description}</p>
                  <p className="mt-1 text-xs text-slate-400">{vt.seatingCapacity} seats &middot; {vt.luggageCapacity} bags</p>
                </button>
              ))}
            </div>

            {form.vehicleTypeId && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                {isFareLoading ? (
                  <p className="text-sm text-slate-500">Calculating fare estimate...</p>
                ) : fare ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Base Fare</span><span>{formatMoney(fare.baseFare)}</span></div>
                    {fare.distanceCharges > 0 && <div className="flex justify-between"><span className="text-slate-500">Distance</span><span>{formatMoney(fare.distanceCharges)}</span></div>}
                    {fare.driverAllowance > 0 && <div className="flex justify-between"><span className="text-slate-500">Driver Allowance</span><span>{formatMoney(fare.driverAllowance)}</span></div>}
                    {fare.nightCharges > 0 && <div className="flex justify-between"><span className="text-slate-500">Night Charges</span><span>{formatMoney(fare.nightCharges)}</span></div>}
                    {fare.airportCharges > 0 && <div className="flex justify-between"><span className="text-slate-500">Airport Surcharge</span><span>{formatMoney(fare.airportCharges)}</span></div>}
                    {fare.statePermitCharges > 0 && <div className="flex justify-between"><span className="text-slate-500">State Permit</span><span>{formatMoney(fare.statePermitCharges)}</span></div>}
                    <div className="flex justify-between"><span className="text-slate-500">Taxes</span><span>{formatMoney(fare.taxAmount)}</span></div>
                    <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><span>Estimated Total</span><span className="text-brand-700">{formatMoney(fare.totalAmount)}</span></div>
                    <p className="text-xs text-slate-400 pt-1">Final fare is confirmed by Mailari Travels and may vary slightly based on actual route.</p>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader><CardTitle>Review your trip</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Trip Type</span><span className="font-medium">{TRIP_TYPES.find((t) => t.value === form.tripType)?.label}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Pickup</span><span className="font-medium text-right max-w-[60%]">{form.pickupLocation}</span></div>
              {form.dropLocation && <div className="flex justify-between"><span className="text-slate-500">Drop</span><span className="font-medium text-right max-w-[60%]">{form.dropLocation}</span></div>}
              <div className="flex items-center justify-between"><span className="text-slate-500 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Date &amp; Time</span><span className="font-medium">{form.pickupDate} · {form.pickupTime}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Passengers / Luggage</span><span className="font-medium">{form.passengerCount} / {form.luggageCount}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-medium">{vehicleTypes.find((v) => v.id === form.vehicleTypeId)?.name}</span></div>
              {fare && <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold"><span>Estimated Total</span><span className="text-brand-700">{formatMoney(fare.totalAmount)}</span></div>}
            </div>
            <Textarea label="Special Instructions (optional)" placeholder="Any specific requirements or notes for the driver..." value={form.specialInstructions} onChange={(e) => update({ specialInstructions: e.target.value })} />
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-slate-200 bg-white p-4 md:static md:z-auto md:border-0 md:bg-transparent md:p-0" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" className="flex-1" onClick={goBack}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          {step < 5 ? (
            <Button className="flex-1" onClick={goNext} disabled={!canProceed()}>
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} isLoading={isSubmitting}>
              Confirm Booking
            </Button>
          )}
        </div>
      </div>

      <MapSelectorModal
        isOpen={mapField !== null}
        onClose={() => setMapField(null)}
        onSelect={(address, lat, lon) => {
          if (mapField === 'pickup') update({ pickupLocation: address, pickupLat: lat, pickupLng: lon });
          if (mapField === 'drop') update({ dropLocation: address, dropLat: lat, dropLng: lon });
        }}
        title={mapField === 'pickup' ? 'Select Pickup Location' : 'Select Drop Destination'}
      />
    </div>
  );
}
