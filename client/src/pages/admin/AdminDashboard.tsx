import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import api from '../../services/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { format } from 'date-fns';

interface DashboardStats {
  todayBookings: number;
  upcomingTrips: number;
  activeTrips: number;
  completedToday: number;
  cancelledToday: number;
  totalCustomers: number;
  totalDrivers: number;
  totalVehicles: number;
  availableVehicles: number;
  driversOnTrip: number;
  pendingPaymentsAmount: number;
}

interface RecentBooking {
  id: string;
  bookingNumber: string;
  pickupDate: string;
  pickupTime: string;
  status: string;
  totalAmount: number;
  customer: { fullName: string };
  vehicleType: { name: string };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get('/dashboard/admin');
        setStats(data.data.stats);
        setRecentBookings(data.data.recentBookings);
        setExpiringDocuments(data.data.expiringDocuments || []);
      } catch (error) {
        console.error('Failed to fetch dashboard', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Bookings Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayBookings || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeTrips || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Available Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.availableVehicles || 0} / {stats?.totalVehicles || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats?.pendingPaymentsAmount?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.length > 0 ? recentBookings.map(booking => (
                <div key={booking.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{booking.customer.fullName}</p>
                    <p className="text-sm text-slate-500">{booking.bookingNumber} • {booking.vehicleType.name}</p>
                    <p className="text-xs text-slate-400">{format(new Date(booking.pickupDate), 'MMM d, yyyy')} at {booking.pickupTime}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold mb-1">₹{booking.totalAmount}</p>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500">No recent bookings</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fleet Overview</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Drivers</span>
                  <span className="font-semibold">{stats?.totalDrivers || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Drivers on Trip</span>
                  <span className="font-semibold">{stats?.driversOnTrip || 0}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-slate-600">Total Customers</span>
                  <span className="font-semibold">{stats?.totalCustomers || 0}</span>
                </div>
             </div>
          </CardContent>
        </Card>

        {expiringDocuments && expiringDocuments.length > 0 && (
          <Card className="border-red-200 col-span-1 lg:col-span-2">
            <CardHeader className="bg-red-50 border-b border-red-100">
              <CardTitle className="text-red-700 flex items-center gap-2">
                Action Required: Expiring Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {expiringDocuments.map((doc: any) => (
                  <div key={doc.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                    <div>
                      <p className="font-semibold">{doc.registrationNumber}</p>
                      <p className="text-sm text-slate-500">
                        {doc.insuranceExpiry && new Date(doc.insuranceExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && <span className="mr-3 text-red-600">Insurance Expiring</span>}
                        {doc.pucExpiry && new Date(doc.pucExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && <span className="mr-3 text-red-600">PUC Expiring</span>}
                        {doc.permitExpiry && new Date(doc.permitExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && <span className="mr-3 text-red-600">Permit Expiring</span>}
                        {doc.fitnessExpiry && new Date(doc.fitnessExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && <span className="mr-3 text-red-600">Fitness Expiring</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
