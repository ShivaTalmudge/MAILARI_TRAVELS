import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useAuthStore } from '../../features/auth/authStore';
import api from '../../services/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { format } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { Navigation, MapPin, Calendar, Clock, Phone } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';

interface DriverDashboardData {
  driver: {
    status: string;
    assignedVehicle: { registrationNumber: string; make: string; model: string } | null;
  };
  todayTrips: number;
  activeTrip: any;
  upcomingTrips: any[];
  completedTrips: number;
  totalEarnings: number;
}

export default function DriverDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<DriverDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStartTripModal, setShowStartTripModal] = useState(false);
  const [startKm, setStartKm] = useState('');
  const toast = useToast();

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard/driver');
      setData(res.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const updateTripStatus = async (tripId: string, status: string, additionalData: any = {}) => {
    try {
      setIsUpdating(true);
      await api.patch(`/bookings/${tripId}/status`, { status, ...additionalData });
      toast(`Trip status updated to ${status}`, 'success');
      setShowStartTripModal(false);
      setStartKm('');
      fetchDashboard(); // Refresh data
    } catch (error) {
      toast('Failed to update trip status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartTrip = () => {
    if (!startKm) { toast('Start KM is required', 'error'); return; }
    if (activeTrip) updateTripStatus(activeTrip.id, 'TRIP_STARTED', { startKm: Number(startKm) });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>;
  }

  const activeTrip = data?.activeTrip;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hello, {user?.fullName}</h1>
          <p className="text-slate-500 mt-1">
            Status: <StatusBadge status={data?.driver.status || 'OFFLINE'} className="ml-2" />
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Trips Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.todayTrips || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Completed Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.completedTrips || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {data?.driver.assignedVehicle?.registrationNumber || 'Unassigned'}
            </div>
          </CardContent>
        </Card>
      </div>

      {activeTrip && (
        <Card className="border-brand-300 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-500"></div>
          <CardHeader className="bg-brand-50 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-brand-800">
                <Navigation className="h-5 w-5" />
                Current Active Trip
              </CardTitle>
              <StatusBadge status={activeTrip.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Customer</p>
                  <p className="font-semibold text-lg">{activeTrip.customer.fullName}</p>
                  <a href={`tel:${activeTrip.customer.user.mobile}`} className="text-brand-600 flex items-center gap-1 mt-1">
                    <Phone className="h-4 w-4" /> {activeTrip.customer.user.mobile}
                  </a>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Pickup</p>
                    <p className="font-medium">{activeTrip.pickupLocation}</p>
                  </div>
                </div>

                {activeTrip.dropLocation && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-brand-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">Dropoff</p>
                      <p className="font-medium">{activeTrip.dropLocation}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 md:border-l md:pl-6">
                 <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <p>{format(new Date(activeTrip.pickupDate), 'dd MMM yyyy')}</p>
                 </div>
                 <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-slate-400" />
                  <p className="text-xl font-bold">{activeTrip.pickupTime}</p>
                 </div>
                 
                 <div className="pt-6 mt-6 border-t flex flex-col gap-3">
                    {activeTrip.status === 'DRIVER_ACCEPTED' && (
                      <Button onClick={() => updateTripStatus(activeTrip.id, 'DRIVER_ON_THE_WAY')} isLoading={isUpdating}>
                        Start Journey to Pickup
                      </Button>
                    )}
                    {activeTrip.status === 'DRIVER_ON_THE_WAY' && (
                      <Button onClick={() => updateTripStatus(activeTrip.id, 'ARRIVED')} isLoading={isUpdating}>
                        Mark as Arrived
                      </Button>
                    )}
                    {activeTrip.status === 'ARRIVED' && (
                      <Button onClick={() => setShowStartTripModal(true)} variant="primary" isLoading={isUpdating}>
                        Start Trip with Customer
                      </Button>
                    )}
                    {activeTrip.status === 'TRIP_STARTED' && (
                      <Button onClick={() => navigate(`/driver/trips/${activeTrip.id}`)} className="bg-green-600 hover:bg-green-700 text-white">
                        View Payment &amp; Complete Trip
                      </Button>
                    )}
                 </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data?.upcomingTrips && data.upcomingTrips.length > 0 && !activeTrip && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Upcoming Trips</h2>
          <div className="space-y-4">
            {data.upcomingTrips.map((trip) => (
              <Card key={trip.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <div className="bg-slate-100 p-3 rounded-lg text-center min-w-[80px]">
                      <p className="text-xs font-bold text-slate-500 uppercase">{format(new Date(trip.pickupDate), 'MMM')}</p>
                      <p className="text-xl font-bold text-slate-900">{format(new Date(trip.pickupDate), 'dd')}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{trip.pickupTime}</p>
                      <p className="text-slate-600 truncate max-w-xs md:max-w-md">{trip.pickupLocation}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={trip.status} />
                    {trip.status === 'DRIVER_ASSIGNED' && (
                      <Button size="sm" onClick={() => updateTripStatus(trip.id, 'DRIVER_ACCEPTED')} isLoading={isUpdating}>
                        Accept Trip
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={showStartTripModal} onClose={() => setShowStartTripModal(false)} title="Start Trip Details">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Please enter your starting odometer reading before beginning the trip.</p>
          <div>
            <label className="text-sm font-medium text-slate-700">Start Odometer (KM) *</label>
            <input
              type="number"
              value={startKm}
              onChange={(e) => setStartKm(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. 45000"
              required
            />
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1" onClick={() => setShowStartTripModal(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleStartTrip} isLoading={isUpdating}>
              Start Trip
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
