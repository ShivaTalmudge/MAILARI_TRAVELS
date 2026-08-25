import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui/Button';
import { LeaveReviewModal } from './LeaveReviewModal';

interface BookingDetail {
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
  driver: { fullName: string; user: { mobile: string } } | null;
  vehicle: { registrationNumber: string; make: string; model: string } | null;
}

const formatMoney = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`;

export default function CustomerBookingDetailModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const toast = useToast();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get(`/bookings/${bookingId}`);
        setBooking(data.data);
      } catch (error) {
        toast('Failed to load booking', 'error');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  return (
    <Modal isOpen onClose={onClose} title={booking ? `Booking ${booking.bookingNumber}` : 'Booking'} size="md">
      {isLoading || !booking ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={booking.status} />
            <StatusBadge status={booking.paymentStatus} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500">Trip Type</p><p className="font-medium">{booking.tripType}</p></div>
            <div><p className="text-slate-500">Date &amp; Time</p><p className="font-medium">{booking.pickupDate?.slice(0, 10)} · {booking.pickupTime}</p></div>
            <div className="col-span-2"><p className="text-slate-500">Pickup</p><p className="font-medium">{booking.pickupLocation}</p></div>
            {booking.dropLocation && <div className="col-span-2"><p className="text-slate-500">Drop</p><p className="font-medium">{booking.dropLocation}</p></div>}
            <div><p className="text-slate-500">Driver</p><p className="font-medium">{booking.driver?.fullName || 'Not yet assigned'}</p></div>
            <div><p className="text-slate-500">Vehicle</p><p className="font-medium">{booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model} · ${booking.vehicle.registrationNumber}` : 'Not yet assigned'}</p></div>
            <div><p className="text-slate-500">Total</p><p className="font-medium">{formatMoney(booking.totalAmount)}</p></div>
            <div><p className="text-slate-500">Paid</p><p className="font-medium">{formatMoney(booking.paidAmount)}</p></div>
          </div>
          {booking.driver?.user.mobile && (
            <a href={`tel:${booking.driver.user.mobile}`} className="block text-center text-sm font-medium text-brand-600">
              Call Driver: {booking.driver.user.mobile}
            </a>
          )}
          
          {booking.status === 'TRIP_COMPLETED' && (
            <div className="pt-4 border-t border-slate-100 flex justify-center">
              <Button onClick={() => setShowReviewModal(true)} variant="outline" className="w-full">
                Leave a Review
              </Button>
            </div>
          )}
        </div>
      )}
      
      {showReviewModal && (
        <LeaveReviewModal
          bookingId={bookingId}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            setShowReviewModal(false);
            // Could re-fetch if we wanted to show the review, but closing is fine
          }}
        />
      )}
    </Modal>
  );
}
