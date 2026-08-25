import { useState, useEffect } from 'react';
import { addDays, format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import api from '../../services/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Calendar as CalendarIcon } from 'lucide-react';

interface Booking {
  id: string;
  bookingNumber: string;
  pickupDate: string;
  pickupTime: string;
  status: string;
  driverId: string | null;
  vehicleId: string | null;
  customer: { fullName: string };
}

interface Driver { id: string; fullName: string; }
interface Vehicle { id: string; registrationNumber: string; make: string; model: string; }

export default function AdminDispatch() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate 7 days timeline starting from today
  const today = new Date();
  const dates = Array.from({ length: 7 }).map((_, i) => addDays(today, i));

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [bookRes, drvRes, vehRes] = await Promise.all([
          api.get('/bookings', { params: { status: 'CONFIRMED,DRIVER_ASSIGNED,DRIVER_ACCEPTED,DRIVER_ON_THE_WAY,ARRIVED,TRIP_STARTED', limit: 100 } }),
          api.get('/drivers'),
          api.get('/vehicles')
        ]);
        setBookings(bookRes.data.data);
        setDrivers(drvRes.data.data);
        setVehicles(vehRes.data.data);
      } catch (error) {
        console.error('Failed to load dispatch data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading dispatch center...</div>;
  }

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(b => b.pickupDate.startsWith(dateStr));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dispatch Center</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-7 gap-4 overflow-x-auto pb-4">
        {dates.map((date, i) => {
          const dayBookings = getBookingsForDate(date);
          const isToday = i === 0;
          return (
            <div key={i} className="min-w-[280px]">
              <Card className={`h-full ${isToday ? 'border-brand-500 shadow-md ring-1 ring-brand-500' : ''}`}>
                <CardHeader className={`pb-3 ${isToday ? 'bg-brand-50' : 'bg-slate-50'} border-b border-slate-100`}>
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>{format(date, 'EEEE')}</span>
                    <span className="text-xs text-slate-500 font-normal">{format(date, 'MMM d, yyyy')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3 h-[600px] overflow-y-auto bg-slate-50/50">
                  {dayBookings.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400">
                      <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No trips scheduled
                    </div>
                  ) : (
                    dayBookings.map(booking => {
                      const driver = drivers.find(d => d.id === booking.driverId);
                      const vehicle = vehicles.find(v => v.id === booking.vehicleId);
                      const isUnassigned = !driver || !vehicle;
                      
                      return (
                        <div key={booking.id} className={`bg-white p-3 rounded-lg border ${isUnassigned ? 'border-amber-300 border-l-4 border-l-amber-500 shadow-sm' : 'border-slate-200 border-l-4 border-l-brand-500 shadow-sm'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold">{booking.pickupTime}</span>
                            <StatusBadge status={booking.status} />
                          </div>
                          <p className="font-medium text-sm truncate" title={booking.customer?.fullName}>
                            {booking.customer?.fullName || 'Unknown Customer'}
                          </p>
                          <div className="mt-2 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Driver:</span>
                              <span className={driver ? 'font-medium' : 'text-amber-600 font-medium'}>
                                {driver ? driver.fullName : 'Unassigned'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Vehicle:</span>
                              <span className={vehicle ? 'font-medium truncate max-w-[120px] text-right' : 'text-amber-600 font-medium'}>
                                {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unassigned'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
