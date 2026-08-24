import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../../services/api';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { Eye, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Booking {
  id: string;
  bookingNumber: string;
  pickupDate: string;
  pickupTime: string;
  status: string;
  totalAmount: number;
  pickupLocation: string;
  dropLocation: string;
}

export default function CustomerBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const toast = useToast();

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/bookings', { params: { page, limit } });
      setBookings(data.data);
      if (data.meta) {
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      toast('Failed to fetch your bookings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page]);

  const columns: Column<Booking>[] = [
    { key: 'bookingNumber', label: 'Booking ID', render: (row) => <span className="font-medium text-brand-700">{row.bookingNumber}</span> },
    { key: 'schedule', label: 'Date & Time', render: (row) => (
      <div>
        <p className="font-medium">{format(new Date(row.pickupDate), 'dd MMM yyyy')}</p>
        <p className="text-sm text-slate-500">{row.pickupTime}</p>
      </div>
    )},
    { key: 'route', label: 'Route', render: (row) => (
      <div className="text-sm max-w-[250px]">
        <p className="truncate" title={row.pickupLocation}><span className="text-slate-400">From:</span> {row.pickupLocation}</p>
        {row.dropLocation && <p className="truncate mt-0.5" title={row.dropLocation}><span className="text-slate-400">To:</span> {row.dropLocation}</p>}
      </div>
    )},
    { key: 'amount', label: 'Amount', render: (row) => <span className="font-semibold text-slate-800">₹{row.totalAmount}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Bookings</h1>
        <Link to="/customer/bookings/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Book a Trip
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={bookings}
        isLoading={isLoading}
        emptyMessage="You haven't made any bookings yet."
        pagination={{
          page,
          totalPages,
          total,
          limit,
          onPageChange: setPage
        }}
        actions={() => (
          <div className="flex justify-end">
            <Button variant="outline" size="icon" title="View Booking Details">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )}
      />
    </div>
  );
}
