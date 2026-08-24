import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../hooks/useToast';

interface CustomerDetail {
  id: string;
  fullName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  user: { id: string; email: string | null; mobile: string; isActive: boolean; createdAt: string };
  bookings: { id: string; bookingNumber: string; status: string; totalAmount: string | number }[];
}

export default function CustomerDetailModal({ userId, onClose, onChanged }: { userId: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', address: '', city: '', state: '', pincode: '' });

  const fetchCustomer = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/customers/${userId}`);
      setCustomer(data.data);
      setForm({ fullName: data.data.fullName || '', address: data.data.address || '', city: data.data.city || '', state: data.data.state || '', pincode: data.data.pincode || '' });
    } catch (error) {
      toast('Failed to load customer', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.put(`/customers/${userId}`, form);
      toast('Customer updated', 'success');
      setIsEditing(false);
      await fetchCustomer();
      onChanged();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to update customer', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={customer ? customer.fullName : 'Customer'} size="md">
      {isLoading || !customer ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : isEditing ? (
        <div className="space-y-4">
          <Input label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <StatusBadge status={customer.user.isActive ? 'ACTIVE' : 'INACTIVE'} />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500">Mobile</p><p className="font-medium">{customer.user.mobile}</p></div>
            <div><p className="text-slate-500">Email</p><p className="font-medium">{customer.user.email || '—'}</p></div>
            <div className="col-span-2"><p className="text-slate-500">Address</p><p className="font-medium">{[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ') || '—'}</p></div>
          </div>
          {customer.bookings.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Recent Bookings</p>
              <div className="space-y-1">
                {customer.bookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span>{b.bookingNumber}</span>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>Edit Details</Button>
        </div>
      )}
    </Modal>
  );
}
