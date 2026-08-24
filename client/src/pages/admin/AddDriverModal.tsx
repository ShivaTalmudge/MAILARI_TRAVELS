import { useState } from 'react';
import api from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';

const emptyForm = {
  fullName: '', mobile: '', email: '', password: '',
  licenceNumber: '', licenceExpiry: '', dateOfBirth: '',
  address: '', city: '', state: '', pincode: '',
  emergencyContact: '', emergencyName: '', joiningDate: '',
};

export default function AddDriverModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const update = (patch: Partial<typeof emptyForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.post('/drivers', form);
      toast('Driver account created', 'success');
      onCreated();
      onClose();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to create driver', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Add Driver" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name" value={form.fullName} onChange={(e) => update({ fullName: e.target.value })} required />
          <Input label="Mobile Number" value={form.mobile} onChange={(e) => update({ mobile: e.target.value })} placeholder="10-digit mobile" required />
          <Input label="Email (optional)" type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} />
          <Input label="Temporary Password" type="password" value={form.password} onChange={(e) => update({ password: e.target.value })} required />
          <Input label="Licence Number" value={form.licenceNumber} onChange={(e) => update({ licenceNumber: e.target.value })} required />
          <Input label="Licence Expiry" type="date" value={form.licenceExpiry} onChange={(e) => update({ licenceExpiry: e.target.value })} required />
          <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e) => update({ dateOfBirth: e.target.value })} />
          <Input label="Joining Date" type="date" value={form.joiningDate} onChange={(e) => update({ joiningDate: e.target.value })} />
          <Input label="Emergency Contact Name" value={form.emergencyName} onChange={(e) => update({ emergencyName: e.target.value })} />
          <Input label="Emergency Contact Number" value={form.emergencyContact} onChange={(e) => update({ emergencyContact: e.target.value })} />
        </div>
        <Input label="Address" value={form.address} onChange={(e) => update({ address: e.target.value })} />
        <div className="grid grid-cols-3 gap-4">
          <Input label="City" value={form.city} onChange={(e) => update({ city: e.target.value })} />
          <Input label="State" value={form.state} onChange={(e) => update({ state: e.target.value })} />
          <Input label="Pincode" value={form.pincode} onChange={(e) => update({ pincode: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" isLoading={isSaving}>Create Driver</Button>
        </div>
      </form>
    </Modal>
  );
}
