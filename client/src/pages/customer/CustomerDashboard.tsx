import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useAuthStore } from '../../features/auth/authStore';
import api from '../../services/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { format } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { Car, Calendar, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UpcomingTrip {
  bookingNumber: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  dropLocation: string;
  status: string;
  vehicle: { registrationNumber: string; make: string; model: string };
  driver?: { fullName: string; user: { mobile: string } };
}

interface CustomerStats {
  totalBookings: number;
  pendingPaymentAmount: number;
}

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [upcomingTrip, setUpcomingTrip] = useState<UpcomingTrip | null>(null);
  const [activeTrip, setActiveTrip] = useState<UpcomingTrip | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get('/dashboard/customer');
        setStats({
          totalBookings: data.data.totalBookings,
          pendingPaymentAmount: data.data.pendingPaymentAmount,
        });
        setUpcomingTrip(data.data.upcomingBooking);
        setActiveTrip(data.data.activeBooking);
      } catch (error) {
        console.error('Failed to fetch dashboard', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>;
  }

  const renderTripCard = (trip: UpcomingTrip | null, title: string) => {
    if (!trip) return null;
    return (
      <Card className="border-brand-200 shadow-md">
        <CardHeader className="bg-brand-50 border-b border-brand-100">
          <div className="flex justify-between items-center">
            <CardTitle className="text-brand-800">{title}</CardTitle>
            <StatusBadge status={trip.status} />
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="bg-slate-100 p-2 rounded-full"><Calendar className="h-5 w-5 text-slate-600" /></div>
            <div>
              <p className="font-semibold text-slate-900">{format(new Date(trip.pickupDate), 'EEEE, MMM d, yyyy')}</p>
              <p className="text-slate-500">{trip.pickupTime}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="bg-slate-100 p-2 rounded-full"><MapPin className="h-5 w-5 text-slate-600" /></div>
            <div>
              <p className="font-medium text-slate-900">From: <span className="font-normal text-slate-700">{trip.pickupLocation}</span></p>
              {trip.dropLocation && <p className="font-medium text-slate-900">To: <span className="font-normal text-slate-700">{trip.dropLocation}</span></p>}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
            {trip.driver && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Your Driver</p>
                <p className="font-medium">{trip.driver.fullName}</p>
                <a href={`tel:${trip.driver.user.mobile}`} className="text-brand-600 text-sm flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" /> {trip.driver.user.mobile}
                </a>
              </div>
            )}
            {trip.vehicle && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Vehicle</p>
                <p className="font-medium">{trip.vehicle.make} {trip.vehicle.model}</p>
                <p className="text-slate-500 text-sm">{trip.vehicle.registrationNumber}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back, {user?.fullName}</h1>
          <p className="text-slate-500 mt-1">Manage your bookings and plan your next trip.</p>
        </div>
        <Link to="/customer/bookings/new">
          <Button size="lg" className="w-full md:w-auto gap-2">
            <Car className="h-5 w-5" />
            Book a Trip
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalBookings || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">₹{stats?.pendingPaymentAmount?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      </div>

      {(activeTrip || upcomingTrip) && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Trip Status</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {renderTripCard(activeTrip, 'Current Trip in Progress')}
            {!activeTrip && renderTripCard(upcomingTrip, 'Your Upcoming Trip')}
          </div>
        </div>
      )}

      {(!activeTrip && !upcomingTrip) && (
        <div className="rounded-xl border border-slate-200 border-dashed bg-slate-50 p-12 text-center mt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 mb-4">
            <Car className="h-6 w-6 text-brand-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No upcoming trips</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">You don't have any upcoming bookings. Ready to plan your next journey?</p>
          <Link to="/customer/bookings/new">
            <Button>Book Now</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
