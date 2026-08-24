import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../features/auth/authStore';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';

export default function CustomerProfile() {
  const { user, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    // Fetch detailed profile info
    api.get('/auth/me').then(({ data }) => {
      const profile = data.data.profile || {};
      setFormData(prev => ({
        ...prev,
        fullName: data.data.fullName || prev.fullName,
        email: data.data.email || prev.email,
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || '',
      }));
    }).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      // In a real implementation we would have an update profile endpoint.
      // Assuming a generic /users/profile exists based on typical structures, or /auth/me update.
      await api.put('/customers/profile', formData);
      toast('Profile updated successfully', 'success');
      // Update local state if needed
      if (user) {
        setAuth({ ...user, fullName: formData.fullName, email: formData.email }, localStorage.getItem('token')!);
      }
    } catch (error) {
      toast('Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
      </div>

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
                helpText="Mobile number cannot be changed"
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
            <CardTitle>Address Information</CardTitle>
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
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
