import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';

interface VehicleType { id: string; name: string; }

const emptyForm = {
  registrationNumber: '', vehicleTypeId: '', make: '', model: '', variant: '', year: '', color: '',
  fuelType: 'PETROL', seatingCapacity: '', insuranceNumber: '', insuranceExpiry: '',
  permitNumber: '', permitExpiry: '', fitnessNumber: '', fitnessExpiry: '', pucNumber: '', pucExpiry: '',
};

export default function AddVehicleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.get('/vehicle-types').then(({ data }) => setVehicleTypes(data.data)).catch(() => {});
  }, []);

  const update = (patch: Partial<typeof emptyForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.post('/vehicles', form);
      toast('Vehicle added to fleet', 'success');
      onCreated();
      onClose();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to add vehicle', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Add Vehicle" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Registration Number" value={form.registrationNumber} onChange={(e) => update({ registrationNumber: e.target.value })} required />
          <Select label="Vehicle Type" value={form.vehicleTypeId} onChange={(e) => update({ vehicleTypeId: e.target.value })} required>
            <option value="">Select type...</option>
            {vehicleTypes.map((vt) => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
          </Select>
          <Input label="Make" value={form.make} onChange={(e) => update({ make: e.target.value })} required />
          <Input label="Model" value={form.model} onChange={(e) => update({ model: e.target.value })} required />
          <Input label="Variant (optional)" value={form.variant} onChange={(e) => update({ variant: e.target.value })} />
          <Input label="Year" type="number" value={form.year} onChange={(e) => update({ year: e.target.value })} required />
          <Input label="Color" value={form.color} onChange={(e) => update({ color: e.target.value })} />
          <Select label="Fuel Type" value={form.fuelType} onChange={(e) => update({ fuelType: e.target.value })}>
            <option value="PETROL">Petrol</option>
            <option value="DIESEL">Diesel</option>
            <option value="CNG">CNG</option>
            <option value="ELECTRIC">Electric</option>
            <option value="HYBRID">Hybrid</option>
          </Select>
          <Input label="Seating Capacity" type="number" value={form.seatingCapacity} onChange={(e) => update({ seatingCapacity: e.target.value })} required />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Documents (optional — required before assignment)</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Insurance Number" value={form.insuranceNumber} onChange={(e) => update({ insuranceNumber: e.target.value })} />
            <Input label="Insurance Expiry" type="date" value={form.insuranceExpiry} onChange={(e) => update({ insuranceExpiry: e.target.value })} />
            <Input label="Permit Number" value={form.permitNumber} onChange={(e) => update({ permitNumber: e.target.value })} />
            <Input label="Permit Expiry" type="date" value={form.permitExpiry} onChange={(e) => update({ permitExpiry: e.target.value })} />
            <Input label="Fitness Number" value={form.fitnessNumber} onChange={(e) => update({ fitnessNumber: e.target.value })} />
            <Input label="Fitness Expiry" type="date" value={form.fitnessExpiry} onChange={(e) => update({ fitnessExpiry: e.target.value })} />
            <Input label="PUC Number" value={form.pucNumber} onChange={(e) => update({ pucNumber: e.target.value })} />
            <Input label="PUC Expiry" type="date" value={form.pucExpiry} onChange={(e) => update({ pucExpiry: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" isLoading={isSaving}>Add Vehicle</Button>
        </div>
      </form>
    </Modal>
  );
}
