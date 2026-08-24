import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../../services/api';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Eye, ShieldBan, CheckCircle } from 'lucide-react';
import CustomerDetailModal from './CustomerDetailModal';

interface Customer {
  id: string;
  fullName: string;
  user: {
    id: string;
    mobile: string;
    email?: string;
    isActive: boolean;
    createdAt: string;
  };
  totalBookings: number;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const toast = useToast();
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/customers', { params: { page, limit, search } });
      setCustomers(data.data);
      if (data.meta) {
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      toast('Failed to fetch customers', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/customers/${userId}/status`, { status: currentStatus ? 'SUSPENDED' : 'ACTIVE' });
      toast(`Customer ${currentStatus ? 'deactivated' : 'activated'} successfully`, 'success');
      fetchCustomers();
    } catch (error) {
      toast('Failed to update customer status', 'error');
    }
  };

  const columns: Column<Customer>[] = [
    { key: 'fullName', label: 'Name', render: (row) => <span className="font-medium">{row.fullName}</span> },
    { key: 'contact', label: 'Contact Info', render: (row) => (
      <div>
        <p>{row.user.mobile}</p>
        {row.user.email && <p className="text-xs text-slate-500">{row.user.email}</p>}
      </div>
    )},
    { key: 'joined', label: 'Joined', render: (row) => <span>{format(new Date(row.user.createdAt), 'dd MMM yyyy')}</span> },
    { key: 'bookings', label: 'Total Bookings', render: (row) => <span>{row.totalBookings || 0}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.user.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Customers</h1>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search by name, mobile, or email..."
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
            <Button variant="outline" size="icon" title="View Profile" onClick={() => setViewingUserId(row.user.id)}>
              <Eye className="h-4 w-4" />
            </Button>
            {row.user.isActive ? (
              <Button variant="outline" size="icon" title="Deactivate Account" onClick={() => toggleStatus(row.user.id, true)}>
                <ShieldBan className="h-4 w-4 text-red-500" />
              </Button>
            ) : (
              <Button variant="outline" size="icon" title="Activate Account" onClick={() => toggleStatus(row.user.id, false)}>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </Button>
            )}
          </div>
        )}
      />

      {viewingUserId && (
        <CustomerDetailModal userId={viewingUserId} onClose={() => setViewingUserId(null)} onChanged={fetchCustomers} />
      )}
    </div>
  );
}
