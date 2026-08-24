import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../features/auth/authStore';
import { useToast } from '../../hooks/useToast';
import api from '../../services/api';
import { format } from 'date-fns';
import { StatusBadge } from '../../components/ui/StatusBadge';

export default function DriverProfile() {
  const { user, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [driverData, setDriverData] = useState<any>(null);
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergencyContact: '',
    emergencyName: '',
  });

  useEffect(() => {
    // Fetch detailed profile info
    api.get('/dashboard/driver').then(({ data }) => {
      const profile = data.data.driver || {};
      setDriverData(profile);
      setFormData(prev => ({
        ...prev,
        fullName: user?.fullName || prev.fullName,
        email: user?.email || prev.email,
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || '',
        emergencyContact: profile.emergencyContact || '',
        emergencyName: profile.emergencyName || '',
      }));
    }).catch(() => {});
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setIsLoading(true);
      await api.put(`/drivers/${user.id}`, {
        fullName: formData.fullName,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        emergencyContact: formData.emergencyContact,
        emergencyName: formData.emergencyName,
      });
      toast('Profile updated', 'success');
      setAuth({ ...user, fullName: formData.fullName, email: formData.email }, localStorage.getItem('token')!);
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Driver Profile</h1>
        <StatusBadge status={driverData?.status || 'OFFLINE'} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Full Name" 
                    name="fullName"
                    value={formData.fullName} 
                    onChange={handleChange} 
                    required
                  />
                  <Input 
                    label="Mobile Number" 
                    value={user?.mobile || ''} 
                    disabled 
                    helpText="Contact admin to change mobile"
                  />
                  <Input 
                    label="Email Address" 
                    name="email"
                    type="email"
                    value={formData.email} 
                    onChange={handleChange} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact & Emergency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  label="Street Address" 
                  name="address"
                  value={formData.address} 
                  onChange={handleChange} 
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input 
                    label="City" 
                    name="city"
                    value={formData.city} 
                    onChange={handleChange} 
                  />
                  <Input 
                    label="State" 
                    name="state"
                    value={formData.state} 
                    onChange={handleChange} 
                  />
                  <Input 
                    label="PIN Code" 
                    name="pincode"
                    value={formData.pincode} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <Input 
                    label="Emergency Contact Name" 
                    name="emergencyName"
                    value={formData.emergencyName} 
                    onChange={handleChange} 
                  />
                  <Input 
                    label="Emergency Contact Number" 
                    name="emergencyContact"
                    value={formData.emergencyContact} 
                    onChange={handleChange} 
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" isLoading={isLoading}>
                Request Profile Update
              </Button>
            </div>
          </form>
        </div>

        <div className="md:col-span-1 space-y-6">
           <Card>
             <CardHeader>
               <CardTitle>Licence Information</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Licence Number</p>
                  <p className="font-semibold">{driverData?.licenceNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Expiry Date</p>
                  <p className="font-semibold text-amber-600">
                    {driverData?.licenceExpiry ? format(new Date(driverData.licenceExpiry), 'dd MMM yyyy') : '—'}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Licence details can only be updated by an administrator. Please contact support if this information is incorrect or needs renewal.
                  </p>
                </div>
             </CardContent>
           </Card>
           
           <Card>
             <CardHeader>
               <CardTitle>Employment</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Joining Date</p>
                  <p className="font-semibold">
                    {driverData?.joiningDate ? format(new Date(driverData.joiningDate), 'dd MMM yyyy') : '—'}
                  </p>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
