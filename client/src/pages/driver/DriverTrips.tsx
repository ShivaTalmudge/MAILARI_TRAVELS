import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../services/api';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Navigation, Eye } from 'lucide-react';

interface Trip {
  id: string;
  bookingNumber: string;
  pickupDate: string;
  pickupTime: string;
  status: string;
  pickupLocation: string;
  dropLocation: string;
  customer: { fullName: string; user: { mobile: string } };
}

export default function DriverTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const toast = useToast();

  const fetchTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      // Ensure the endpoint gets bookings assigned to this driver
      const { data } = await api.get('/bookings', { params: { page, limit } });
      setTrips(data.data);
      if (data.meta) {
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      toast('Failed to fetch your trips', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const updateStatus = async (tripId: string, status: string) => {
    try {
      await api.patch(`/bookings/${tripId}/status`, { status });
      toast(`Trip accepted`, 'success');
      fetchTrips();
    } catch (error) {
      toast('Failed to update status', 'error');
    }
  };

  const columns: Column<Trip>[] = [
    { key: 'schedule', label: 'Date & Time', render: (row) => (
      <div>
        <p className="font-medium">{format(new Date(row.pickupDate), 'dd MMM yyyy')}</p>
        <p className="text-sm text-slate-500">{row.pickupTime}</p>
      </div>
    )},
    { key: 'customer', label: 'Customer', render: (row) => (
      <div>
        <p className="font-medium">{row.customer.fullName}</p>
        <p className="text-xs text-slate-500">{row.customer.user?.mobile}</p>
      </div>
    )},
    { key: 'route', label: 'Route', render: (row) => (
      <div className="text-sm max-w-[250px]">
        <p className="truncate" title={row.pickupLocation}><span className="text-slate-400">From:</span> {row.pickupLocation}</p>
        {row.dropLocation && <p className="truncate mt-0.5" title={row.dropLocation}><span className="text-slate-400">To:</span> {row.dropLocation}</p>}
      </div>
    )},
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Trips</h1>
      </div>

      <DataTable
        columns={columns}
        data={trips}
        isLoading={isLoading}
        emptyMessage="You don't have any trips assigned yet."
        pagination={{
          page,
          totalPages,
          total,
          limit,
          onPageChange: setPage
        }}
        actions={(row) => (
          <div className="flex justify-end gap-2">
            {row.status === 'DRIVER_ASSIGNED' && (
              <Button size="sm" onClick={() => updateStatus(row.id as string, 'DRIVER_ACCEPTED')}>
                Accept
              </Button>
            )}
            {row.status === 'DRIVER_ACCEPTED' && (
               <Button size="sm" onClick={() => updateStatus(row.id as string, 'DRIVER_ON_THE_WAY')} variant="outline" className="gap-2">
                 <Navigation className="h-4 w-4" /> Start
               </Button>
            )}
            <Link to={`/driver/trips/${row.id}`}>
              <Button size="sm" variant="ghost" className="gap-1">
                <Eye className="h-4 w-4" /> View
              </Button>
            </Link>
          </div>
        )}
      />
    </div>
  );
}
