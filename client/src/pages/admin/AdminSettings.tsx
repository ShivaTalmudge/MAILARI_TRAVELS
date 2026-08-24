import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import api from '../../services/api';

interface PaymentQrConfig {
  id: string;
  displayName: string;
  upiId: string;
  qrImageUrl: string;
  instructions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByEmail?: string | null;
  updatedByEmail?: string | null;
}

function PaymentQrSettings() {
  const [configs, setConfigs] = useState<PaymentQrConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [displayName, setDisplayName] = useState('Mailari Travels');
  const [upiId, setUpiId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const toast = useToast();

  const activeConfig = configs.find((c) => c.isActive) || null;

  const fetchConfigs = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/payment-qr');
      setConfigs(data.data);
    } catch (error) {
      toast('Failed to load payment QR settings', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast('Select a QR image to upload', 'error'); return; }
    if (!upiId.trim()) { toast('UPI ID is required', 'error'); return; }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('qrImage', file);
      formData.append('displayName', displayName);
      formData.append('upiId', upiId);
      formData.append('instructions', instructions);
      // Let the browser compute the multipart boundary — an explicit JSON
      // Content-Type (the api client's default) would corrupt this upload.
      await api.post('/payment-qr', formData, { headers: { 'Content-Type': undefined } });
      toast('Payment QR updated', 'success');
      setFile(null);
      setInstructions('');
      fetchConfigs();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to upload QR', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleActive = async (config: PaymentQrConfig) => {
    try {
      await api.patch(`/payment-qr/${config.id}/${config.isActive ? 'deactivate' : 'activate'}`);
      toast(config.isActive ? 'QR deactivated' : 'QR activated', 'success');
      fetchConfigs();
    } catch (error) {
      toast('Failed to update QR status', 'error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment &middot; UPI / QR Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Currently Active</p>
                {activeConfig ? (
                  <div className="rounded-lg border border-slate-200 p-4 text-center">
                    <img
                      src={`${activeConfig.qrImageUrl}?v=${new Date(activeConfig.updatedAt).getTime()}`}
                      alt="Active payment QR"
                      className="mx-auto h-40 w-40 rounded-md border border-slate-100 object-contain"
                    />
                    <p className="mt-3 font-semibold">{activeConfig.displayName}</p>
                    <p className="text-sm text-slate-600 font-mono">{activeConfig.upiId}</p>
                    {activeConfig.instructions && <p className="mt-1 text-xs text-slate-500">{activeConfig.instructions}</p>}
                    <p className="mt-2 text-xs text-slate-400">Updated {new Date(activeConfig.updatedAt).toLocaleString('en-IN')}{activeConfig.updatedByEmail ? ` by ${activeConfig.updatedByEmail}` : ''}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => toggleActive(activeConfig)}>
                      Deactivate
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    No active payment QR. Drivers will see "Payment QR has not been configured" until one is uploaded and activated below.
                  </div>
                )}
              </div>

              <form onSubmit={handleUpload} className="space-y-3">
                <p className="mb-2 text-sm font-medium text-slate-700">Replace QR</p>
                <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                <Input label="UPI ID" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="mailaritravels@upi" required />
                <Input label="Payment Instructions (optional)" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Ask the customer to scan and pay." />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">QR Image (PNG, JPEG, or WEBP)</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                  />
                </div>
                <Button type="submit" isLoading={isUploading} className="w-full">Upload &amp; Activate</Button>
              </form>
            </div>

            {configs.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">History</p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">UPI ID</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Updated</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {configs.map((c) => (
                        <tr key={c.id}>
                          <td className="px-4 py-2 font-mono">{c.upiId}</td>
                          <td className="px-4 py-2">
                            <span className={c.isActive ? 'text-green-700 font-medium' : 'text-slate-500'}>{c.isActive ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td className="px-4 py-2 text-slate-500">{new Date(c.updatedAt).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-2 text-right">
                            {!c.isActive && (
                              <Button size="sm" variant="outline" onClick={() => toggleActive(c)}>Activate</Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const fetchSettings = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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

      <PaymentQrSettings />
    </div>
  );
}
