import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../hooks/useToast';
import { ArrowLeft, MapPin, Phone, Car, User, CheckCircle2 } from 'lucide-react';

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
  vehicle: { registrationNumber: string; make: string; model: string; color: string } | null;
}

interface ActiveQr {
  id: string;
  displayName: string;
  upiId: string;
  qrImageUrl: string;
  instructions: string | null;
  updatedAt: string;
}

const formatMoney = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`;

export default function DriverTripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [qr, setQr] = useState<ActiveQr | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const [bookingRes, qrRes] = await Promise.all([
        api.get(`/bookings/${id}`),
        api.get('/payment-qr/active'),
      ]);
      setBooking(bookingRes.data.data);
      setQr(qrRes.data.data);
    } catch (error) {
      toast('Failed to load trip details', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const remaining = booking ? Math.max(0, Number(booking.totalAmount) - Number(booking.paidAmount)) : 0;
  const isFullyPaid = remaining <= 0;

  const confirmPayment = async () => {
    try {
      setIsSubmittingPayment(true);
      await api.post(`/bookings/${id}/confirm-payment`, { transactionRef: transactionRef || undefined });
      toast('Payment confirmed', 'success');
      setShowPaymentModal(false);
      setTransactionRef('');
      fetchAll();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to confirm payment', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const completeTrip = async () => {
    try {
      setIsCompleting(true);
      await api.patch(`/bookings/${id}/status`, { status: 'TRIP_COMPLETED' });
      toast('Trip completed', 'success');
      navigate('/driver/trips');
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to complete trip', 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading trip...</div>;
  }
  if (!booking) {
    return <div className="p-8 text-center text-slate-500">Trip not found.</div>;
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <div className="flex items-center gap-3">
        <Link to="/driver/trips" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{booking.bookingNumber}</h1>
          <StatusBadge status={booking.status} className="mt-1" />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Route</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-slate-500">Pickup</p>
              <p className="font-medium">{booking.pickupLocation}</p>
            </div>
          </div>
          {booking.dropLocation && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-brand-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-slate-500">Drop</p>
                <p className="font-medium">{booking.dropLocation}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-slate-400" />
            <p className="font-medium">{booking.customer?.fullName || '—'}</p>
          </div>
          {booking.customer?.user.mobile && (
            <a href={`tel:${booking.customer.user.mobile}`} className="flex items-center gap-1 text-brand-600 font-medium">
              <Phone className="h-4 w-4" /> {booking.customer.user.mobile}
            </a>
          )}
        </CardContent>
      </Card>

      {booking.vehicle && (
        <Card>
          <CardHeader><CardTitle>Vehicle</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3">
            <Car className="h-5 w-5 text-slate-400" />
            <p className="font-medium">{booking.vehicle.make} {booking.vehicle.model} &middot; {booking.vehicle.registrationNumber}</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-brand-300">
        <CardHeader className="bg-brand-50">
          <CardTitle className="text-brand-900">Mailari Travels Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="font-bold">{formatMoney(booking.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Paid</p>
              <p className="font-bold text-green-600">{formatMoney(booking.paidAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Due</p>
              <p className="font-bold text-red-600">{formatMoney(remaining)}</p>
            </div>
          </div>

          {!isFullyPaid && qr && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-4 text-center">
              <img
                src={`${qr.qrImageUrl}?v=${new Date(qr.updatedAt).getTime()}`}
                alt="Mailari Travels payment QR"
                className="mx-auto h-48 w-48 rounded-md border border-slate-100 object-contain"
              />
              <p className="font-semibold text-slate-900">{qr.displayName}</p>
              <p className="text-sm text-slate-600">UPI ID: <span className="font-mono">{qr.upiId}</span></p>
              {qr.instructions && <p className="text-xs text-slate-500">{qr.instructions}</p>}
              <p className="text-sm font-medium text-slate-700">Ask the customer to scan and pay {formatMoney(remaining)}.</p>
              <Button className="w-full" onClick={() => setShowPaymentModal(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Payment Received
              </Button>
            </div>
          )}

          {!isFullyPaid && !qr && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
              Payment QR has not been configured. Please contact Admin.
            </div>
          )}

          {isFullyPaid && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-sm font-medium text-green-800">
              Payment received in full.
            </div>
          )}
        </CardContent>
      </Card>

      {booking.status === 'TRIP_STARTED' && (
        <div
          className="fixed inset-x-0 z-30 border-t border-slate-200 bg-white p-4 md:static md:z-auto md:border-0 md:bg-transparent md:p-0"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
        >
          <Button
            className="h-12 w-full bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-300"
            onClick={completeTrip}
            isLoading={isCompleting}
            disabled={!isFullyPaid}
          >
            {isFullyPaid ? 'Complete Trip' : 'Payment pending — confirm payment to complete trip'}
          </Button>
        </div>
      )}

      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Confirm Payment Received">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Confirm that the customer has completed the payment shown below.</p>
          <div className="space-y-1 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-semibold">{formatMoney(remaining)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Booking</span><span className="font-semibold">{booking.bookingNumber}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Method</span><span className="font-semibold">UPI</span></div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">UPI Transaction Reference (optional)</label>
            <input
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              maxLength={100}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. 123456789012"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)} disabled={isSubmittingPayment}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={confirmPayment} isLoading={isSubmittingPayment}>
              Confirm Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
