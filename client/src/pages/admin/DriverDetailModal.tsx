import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../hooks/useToast';

interface DriverDetail {
  id: string;
  fullName: string;
  licenceNumber: string;
  status: string;
  city: string | null;
  state: string | null;
  user: { id: string; email: string | null; mobile: string; isActive: boolean };
  assignedVehicle: { registrationNumber: string; make: string; model: string } | null;
}

export default function DriverDetailModal({ driverId, onClose, onChanged }: { driverId: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', licenceNumber: '', city: '', state: '' });

  const fetchDriver = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/drivers/${driverId}`);
      setDriver(data.data);
      setForm({ fullName: data.data.fullName || '', email: data.data.user.email || '', licenceNumber: data.data.licenceNumber || '', city: data.data.city || '', state: data.data.state || '' });
    } catch (error) {
      toast('Failed to load driver', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDriver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.put(`/drivers/${driverId}`, form);
      toast('Driver updated', 'success');
      setIsEditing(false);
      await fetchDriver();
      onChanged();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to update driver', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={driver ? driver.fullName : 'Driver'} size="md">
      {isLoading || !driver ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : isEditing ? (
        <div className="space-y-4">
          <Input label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Licence Number" value={form.licenceNumber} onChange={(e) => setForm({ ...form, licenceNumber: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
            <StatusBadge status={driver.status} />
            <StatusBadge status={driver.user.isActive ? 'ACTIVE' : 'INACTIVE'} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500">Mobile</p><p className="font-medium">{driver.user.mobile}</p></div>
            <div><p className="text-slate-500">Email</p><p className="font-medium">{driver.user.email || '—'}</p></div>
            <div><p className="text-slate-500">Licence Number</p><p className="font-medium">{driver.licenceNumber}</p></div>
            <div><p className="text-slate-500">Location</p><p className="font-medium">{[driver.city, driver.state].filter(Boolean).join(', ') || '—'}</p></div>
            <div className="col-span-1 sm:col-span-2"><p className="text-slate-500">Assigned Vehicle</p><p className="font-medium">{driver.assignedVehicle ? `${driver.assignedVehicle.make} ${driver.assignedVehicle.model} · ${driver.assignedVehicle.registrationNumber}` : 'Unassigned'}</p></div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>Edit Details</Button>
        </div>
      )}
    </Modal>
  );
}
