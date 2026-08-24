import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/settings');
      const settingsMap = data.data.reduce((acc: Record<string, string>, item: any) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      setSettings(settingsMap);
    } catch (error) {
      toast('Failed to fetch settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      // Format as array of key/value pairs
      const payload = Object.entries(settings).map(([key, value]) => ({ key, value }));
      await api.put('/settings/bulk', { settings: payload });
      toast('Settings saved successfully', 'success');
    } catch (error) {
      toast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Settings</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Company Name" 
                value={settings.company_name || ''} 
                onChange={(e) => handleChange('company_name', e.target.value)} 
              />
              <Input 
                label="Support Email" 
                value={settings.support_email || ''} 
                onChange={(e) => handleChange('support_email', e.target.value)} 
              />
              <Input 
                label="Support Phone" 
                value={settings.support_phone || ''} 
                onChange={(e) => handleChange('support_phone', e.target.value)} 
              />
              <Input 
                label="GST Number" 
                value={settings.gst_number || ''} 
                onChange={(e) => handleChange('gst_number', e.target.value)} 
              />
            </div>
            <Input 
              label="Company Address" 
              value={settings.company_address || ''} 
              onChange={(e) => handleChange('company_address', e.target.value)} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoicing & Finance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Invoice Prefix" 
                value={settings.invoice_prefix || ''} 
                onChange={(e) => handleChange('invoice_prefix', e.target.value)} 
                placeholder="e.g. INV, MT"
              />
              <Input 
                label="Terms & Conditions (Invoice)" 
                value={settings.invoice_terms || ''} 
                onChange={(e) => handleChange('invoice_terms', e.target.value)} 
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" isLoading={isSaving} size="lg">
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
