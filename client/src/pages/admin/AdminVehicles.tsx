import { useState, useEffect } from 'react';
import api from '../../services/api';
import { DataTable, Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { Eye, Edit, Plus } from 'lucide-react';

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

  const fetchVehicles = async () => {
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
  };

  useEffect(() => {
    fetchVehicles();
  }, [page, search]);

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
        <Button className="gap-2">
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
        actions={() => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="icon" title="View Details">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" title="Edit Vehicle">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
      />
    </div>
  );
}
