import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../../services/api';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Eye } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import BookingDetailModal from './BookingDetailModal';

interface Booking {
  id: string;
  bookingNumber: string;
  pickupDate: string;
  pickupTime: string;
  status: string;
  totalAmount: number;
  pickupLocation: string;
  customer: { fullName: string; mobile?: string };
  driver?: { fullName: string; user?: { mobile: string } };
  vehicle?: { registrationNumber: string };
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const toast = useToast();
  const [viewingBookingId, setViewingBookingId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/bookings', { params: { page, limit, search } });
      setBookings(data.data);
      if (data.meta) {
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      toast('Failed to fetch bookings', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const columns: Column<Booking>[] = [
    { key: 'bookingNumber', label: 'Booking ID', render: (row) => <span className="font-medium">{row.bookingNumber}</span> },
    { key: 'customer', label: 'Customer', render: (row) => <div><p className="font-medium">{row.customer.fullName}</p></div> },
    { key: 'schedule', label: 'Schedule', render: (row) => <div className="text-sm">
        <p>{format(new Date(row.pickupDate), 'dd MMM yyyy')}</p>
        <p className="text-slate-500">{row.pickupTime}</p>
      </div> 
    },
    { key: 'route', label: 'Route', render: (row) => <div className="max-w-[200px] truncate" title={row.pickupLocation}>{row.pickupLocation}</div> },
    { key: 'driver', label: 'Driver / Vehicle', render: (row) => (
      <div className="text-sm">
        {row.driver ? (
          <>
            <p>{row.driver.fullName}</p>
            <p className="text-slate-500 text-xs">{row.vehicle?.registrationNumber}</p>
          </>
        ) : <span className="text-slate-400 italic">Unassigned</span>}
      </div>
    )},
    { key: 'amount', label: 'Amount', render: (row) => <span className="font-semibold">₹{row.totalAmount}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bookings</h1>
      </div>

      <DataTable
        columns={columns}
        data={bookings}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search bookings..."
        onSearch={(val) => { setSearch(val); setPage(1); }}
        pagination={{
          page,
          totalPages,
          total,
          limit,
          onPageChange: setPage
        }}
        actions={(row) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="icon" title="View Details" onClick={() => setViewingBookingId(row.id)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      {viewingBookingId && (
        <BookingDetailModal
          bookingId={viewingBookingId}
          onClose={() => setViewingBookingId(null)}
          onChanged={fetchBookings}
        />
      )}
    </div>
  );
}
