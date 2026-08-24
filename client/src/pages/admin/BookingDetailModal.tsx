import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../hooks/useToast';

interface BookingDetail {
  id: string;
  bookingNumber: string;
  status: string;
  tripType: string;
  pickupLocation: string;
  dropLocation: string | null;
  pickupDate: string;
  pickupTime: string;
  totalAmount: string | number;
  paidAmount: string | number;
  paymentStatus: string;
  customer: { fullName: string; user: { mobile: string; email: string | null } } | null;
  driver: { fullName: string; user: { mobile: string } } | null;
  vehicle: { registrationNumber: string; make: string; model: string } | null;
}

interface AvailableDriver { id: string; fullName: string; user: { mobile: string } }
interface AvailableVehicle { id: string; registrationNumber: string; make: string; model: string }

const formatMoney = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`;

export default function BookingDetailModal({ bookingId, onClose, onChanged }: { bookingId: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<AvailableDriver[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicle[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');

  const fetchBooking = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/bookings/${bookingId}`);
      setBooking(data.data);
    } catch (error) {
      toast('Failed to load booking', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    if (booking?.status === 'CONFIRMED' && !booking.driver) {
      api.get('/drivers/available').then(({ data }) => setAvailableDrivers(data.data)).catch(() => {});
    }
    if (booking?.driver && !booking.vehicle) {
      api.get('/vehicles/available').then(({ data }) => setAvailableVehicles(data.data)).catch(() => {});
    }
  }, [booking?.status, booking?.driver, booking?.vehicle]);

  const runAction = async (fn: () => Promise<void>) => {
    try {
      setIsActing(true);
      await fn();
      await fetchBooking();
      onChanged();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Action failed', 'error');
    } finally {
      setIsActing(false);
    }
  };

  const confirmBooking = () => runAction(async () => {
    await api.patch(`/bookings/${bookingId}/status`, { status: 'CONFIRMED' });
    toast('Booking confirmed', 'success');
  });

  const assignDriver = () => runAction(async () => {
    if (!selectedDriver) { toast('Select a driver first', 'error'); throw new Error('no-op'); }
    await api.post(`/bookings/${bookingId}/assign-driver`, { driverId: selectedDriver });
    toast('Driver assigned', 'success');
  });

  const assignVehicle = () => runAction(async () => {
    if (!selectedVehicle) { toast('Select a vehicle first', 'error'); throw new Error('no-op'); }
    await api.post(`/bookings/${bookingId}/assign-vehicle`, { vehicleId: selectedVehicle });
    toast('Vehicle assigned', 'success');
  });

  const cancelBooking = () => runAction(async () => {
    await api.post(`/bookings/${bookingId}/cancel`, { reason: 'Cancelled by admin' });
    toast('Booking cancelled', 'success');
  });

  const generateInvoice = () => runAction(async () => {
    await api.post('/invoices', { bookingId });
    toast('Invoice generated', 'success');
  });

  const canCancel = booking && !['TRIP_STARTED', 'TRIP_COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.status);

  return (
    <Modal isOpen onClose={onClose} title={booking ? `Booking ${booking.bookingNumber}` : 'Booking'} size="lg">
      {isLoading || !booking ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <StatusBadge status={booking.status} />
            <StatusBadge status={booking.paymentStatus} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500">Customer</p><p className="font-medium">{booking.customer?.fullName || '—'}</p><p className="text-xs text-slate-500">{booking.customer?.user.mobile}</p></div>
            <div><p className="text-slate-500">Trip Type</p><p className="font-medium">{booking.tripType}</p></div>
            <div><p className="text-slate-500">Pickup</p><p className="font-medium">{booking.pickupLocation}</p></div>
            <div><p className="text-slate-500">Drop</p><p className="font-medium">{booking.dropLocation || '—'}</p></div>
            <div><p className="text-slate-500">Date &amp; Time</p><p className="font-medium">{booking.pickupDate?.slice(0, 10)} · {booking.pickupTime}</p></div>
            <div><p className="text-slate-500">Amount</p><p className="font-medium">{formatMoney(booking.totalAmount)} (Paid: {formatMoney(booking.paidAmount)})</p></div>
            <div><p className="text-slate-500">Driver</p><p className="font-medium">{booking.driver?.fullName || 'Unassigned'}</p></div>
            <div><p className="text-slate-500">Vehicle</p><p className="font-medium">{booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model} · ${booking.vehicle.registrationNumber}` : 'Unassigned'}</p></div>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            {booking.status === 'PENDING' && (
              <Button className="w-full" onClick={confirmBooking} isLoading={isActing}>Confirm Booking</Button>
            )}

            {booking.status === 'CONFIRMED' && !booking.driver && (
              <div className="flex gap-2">
                <Select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} className="flex-1">
                  <option value="">Select available driver...</option>
                  {availableDrivers.map((d) => <option key={d.id} value={d.id}>{d.fullName} ({d.user.mobile})</option>)}
                </Select>
                <Button onClick={assignDriver} isLoading={isActing}>Assign Driver</Button>
              </div>
            )}

            {booking.driver && !booking.vehicle && (
              <div className="flex gap-2">
                <Select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} className="flex-1">
                  <option value="">Select available vehicle...</option>
                  {availableVehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registrationNumber}</option>)}
                </Select>
                <Button onClick={assignVehicle} isLoading={isActing}>Assign Vehicle</Button>
              </div>
            )}

            {booking.status === 'TRIP_COMPLETED' && (
              <Button variant="outline" className="w-full" onClick={generateInvoice} isLoading={isActing}>Generate Invoice</Button>
            )}

            {canCancel && (
              <Button variant="danger" className="w-full" onClick={cancelBooking} isLoading={isActing}>Cancel Booking</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
