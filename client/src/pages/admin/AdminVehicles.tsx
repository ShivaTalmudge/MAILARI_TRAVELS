import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Eye, Plus } from 'lucide-react';
import AddVehicleModal from './AddVehicleModal';
import VehicleDetailModal from './VehicleDetailModal';

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  status: string;
  vehicleType: {
    name: string;
  };
}

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingVehicleId, setViewingVehicleId] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/vehicles', { params: { page, limit, search } });
      setVehicles(data.data);
      if (data.meta) {
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      toast('Failed to fetch vehicles', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const columns: Column<Vehicle>[] = [
    { key: 'regNo', label: 'Registration No.', render: (row) => <span className="font-semibold text-slate-800">{row.registrationNumber}</span> },
    { key: 'makeModel', label: 'Make & Model', render: (row) => <span>{row.make} {row.model}</span> },
    { key: 'type', label: 'Type', render: (row) => <span>{row.vehicleType.name}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vehicles</h1>
        <Button className="gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={vehicles}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search vehicles..."
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
            <Button variant="outline" size="icon" title="View Details" onClick={() => setViewingVehicleId(row.id)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      {showAddModal && <AddVehicleModal onClose={() => setShowAddModal(false)} onCreated={fetchVehicles} />}
      {viewingVehicleId && (
        <VehicleDetailModal vehicleId={viewingVehicleId} onClose={() => setViewingVehicleId(null)} onChanged={fetchVehicles} />
      )}
    </div>
  );
}
