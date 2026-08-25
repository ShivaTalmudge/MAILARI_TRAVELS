import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../features/auth/authStore';
import { useToast } from '../../hooks/useToast';
import api from '../../services/api';
import { Plus, Trash2 } from 'lucide-react';

interface Passenger {
  name: string;
  age: string;
  gender: string;
}

export default function CustomerProfile() {
  const { user, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    photoUrl: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    preferredLanguage: 'en',
  });

  const [savedPassengers, setSavedPassengers] = useState<Passenger[]>([]);

  useEffect(() => {
    // Fetch detailed profile info
    api.get('/auth/me').then(({ data }) => {
      const profile = data.data.customerProfile || {};
      setFormData(prev => ({
        ...prev,
        fullName: profile.fullName || prev.fullName,
        email: data.data.email || prev.email,
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || '',
        emergencyContactName: profile.emergencyContactName || '',
        emergencyContactNumber: profile.emergencyContactNumber || '',
        preferredLanguage: profile.preferredLanguage || 'en',
      }));
      if (profile.savedPassengers && Array.isArray(profile.savedPassengers)) {
        setSavedPassengers(profile.savedPassengers);
      }
    }).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePassengerChange = (index: number, field: keyof Passenger, value: string) => {
    const newPassengers = [...savedPassengers];
    newPassengers[index] = { ...newPassengers[index], [field]: value };
    setSavedPassengers(newPassengers);
  };

  const addPassenger = () => {
    setSavedPassengers([...savedPassengers, { name: '', age: '', gender: 'MALE' }]);
  };

  const removePassenger = (index: number) => {
    setSavedPassengers(savedPassengers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setIsLoading(true);
      await api.put(`/customers/${user.id}`, { ...formData, savedPassengers });
      toast('Profile updated successfully', 'success');
      setAuth({ ...user, fullName: formData.fullName, email: formData.email }, localStorage.getItem('token')!);
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to update profile', 'error');
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
              <Input 
                label="Profile Photo URL" 
                name="photoUrl"
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={formData.photoUrl || ''} 
                onChange={handleChange} 
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Language</label>
                <select 
                  name="preferredLanguage" 
                  value={formData.preferredLanguage} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                  <option value="ta">Tamil</option>
                  <option value="kn">Kannada</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Contact Name" 
                name="emergencyContactName"
                value={formData.emergencyContactName} 
                onChange={handleChange} 
              />
              <Input 
                label="Contact Number" 
                name="emergencyContactNumber"
                value={formData.emergencyContactNumber} 
                onChange={handleChange} 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Saved Passengers</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addPassenger}>
              <Plus className="w-4 h-4 mr-2" />
              Add Passenger
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedPassengers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No saved passengers. Add them for quicker booking.</p>
            ) : (
              savedPassengers.map((p, index) => (
                <div key={index} className="flex items-end gap-4 p-4 border border-slate-200 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input 
                      label="Passenger Name" 
                      value={p.name} 
                      onChange={(e) => handlePassengerChange(index, 'name', e.target.value)} 
                      required
                    />
                    <Input 
                      label="Age" 
                      type="number"
                      value={p.age} 
                      onChange={(e) => handlePassengerChange(index, 'age', e.target.value)} 
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                      <select 
                        value={p.gender} 
                        onChange={(e) => handlePassengerChange(index, 'gender', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3" onClick={() => removePassenger(index)}>
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))
            )}
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
