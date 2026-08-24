import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../hooks/useToast';

interface VehicleDetail {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  color: string | null;
  status: string;
  insuranceExpiry: string | null;
  permitExpiry: string | null;
  fitnessExpiry: string | null;
  pucExpiry: string | null;
  vehicleType: { name: string } | null;
}

export default function VehicleDetailModal({ vehicleId, onClose, onChanged }: { vehicleId: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ make: '', model: '', color: '' });

  const fetchVehicle = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/vehicles/${vehicleId}`);
      setVehicle(data.data);
      setForm({ make: data.data.make || '', model: data.data.model || '', color: data.data.color || '' });
    } catch (error) {
      toast('Failed to load vehicle', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.put(`/vehicles/${vehicleId}`, form);
      toast('Vehicle updated', 'success');
      setIsEditing(false);
      await fetchVehicle();
      onChanged();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to update vehicle', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const expiry = (label: string, date: string | null) => {
    if (!date) return <div><p className="text-slate-500">{label}</p><p className="font-medium text-slate-400">Not on file</p></div>;
    const expired = new Date(date) < new Date();
    return <div><p className="text-slate-500">{label}</p><p className={`font-medium ${expired ? 'text-red-600' : ''}`}>{new Date(date).toLocaleDateString('en-IN')}{expired ? ' (expired)' : ''}</p></div>;
  };

  return (
    <Modal isOpen onClose={onClose} title={vehicle ? vehicle.registrationNumber : 'Vehicle'} size="md">
      {isLoading || !vehicle ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : isEditing ? (
        <div className="space-y-4">
          <Input label="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
          <Input label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <Input label="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <StatusBadge status={vehicle.status} />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500">Make &amp; Model</p><p className="font-medium">{vehicle.make} {vehicle.model} {vehicle.variant || ''}</p></div>
            <div><p className="text-slate-500">Type</p><p className="font-medium">{vehicle.vehicleType?.name || '—'}</p></div>
            <div><p className="text-slate-500">Year / Color</p><p className="font-medium">{vehicle.year} {vehicle.color || ''}</p></div>
            {expiry('Insurance Expiry', vehicle.insuranceExpiry)}
            {expiry('Permit Expiry', vehicle.permitExpiry)}
            {expiry('Fitness Expiry', vehicle.fitnessExpiry)}
            {expiry('PUC Expiry', vehicle.pucExpiry)}
          </div>
          <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>Edit Details</Button>
        </div>
      )}
    </Modal>
  );
}
