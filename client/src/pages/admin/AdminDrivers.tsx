import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Eye, Plus } from 'lucide-react';
import AddDriverModal from './AddDriverModal';
import DriverDetailModal from './DriverDetailModal';

interface Driver {
  id: string;
  fullName: string;
  status: string;
  user: {
    mobile: string;
  };
  licenceNumber: string;
  assignedVehicle?: {
    registrationNumber: string;
  };
}

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingDriverId, setViewingDriverId] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/drivers', { params: { page, limit, search } });
      setDrivers(data.data);
      if (data.meta) {
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      toast('Failed to fetch drivers', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const columns: Column<Driver>[] = [
    { key: 'fullName', label: 'Driver Name', render: (row) => <span className="font-medium">{row.fullName}</span> },
    { key: 'mobile', label: 'Mobile', render: (row) => <span>{row.user.mobile}</span> },
    { key: 'licence', label: 'Licence No.', render: (row) => <span>{row.licenceNumber || '—'}</span> },
    { key: 'vehicle', label: 'Assigned Vehicle', render: (row) => <span>{row.assignedVehicle?.registrationNumber || 'Unassigned'}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Drivers</h1>
        <Button className="gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          Add Driver
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={drivers}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search drivers..."
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
            <Button variant="outline" size="icon" title="View Details" onClick={() => setViewingDriverId(row.id)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      {showAddModal && <AddDriverModal onClose={() => setShowAddModal(false)} onCreated={fetchDrivers} />}
      {viewingDriverId && (
        <DriverDetailModal driverId={viewingDriverId} onClose={() => setViewingDriverId(null)} onChanged={fetchDrivers} />
      )}
    </div>
  );
}
