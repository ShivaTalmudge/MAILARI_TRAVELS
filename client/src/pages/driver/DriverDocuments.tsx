import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useToast } from '../../hooks/useToast';
import { format } from 'date-fns';

interface DriverInfo {
  licenceNumber: string | null;
  licenceExpiry: string | null;
  emergencyName: string | null;
  emergencyContact: string | null;
  assignedVehicle: {
    registrationNumber: string;
    insuranceExpiry: string | null;
    permitExpiry: string | null;
    fitnessExpiry: string | null;
    pucExpiry: string | null;
  } | null;
}

function ExpiryRow({ label, date }: { label: string; date: string | null }) {
  const expired = date ? new Date(date) < new Date() : false;
  const soon = date ? !expired && new Date(date).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 : false;
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className={`font-medium ${expired ? 'text-red-600' : soon ? 'text-amber-600' : ''}`}>
        {date ? format(new Date(date), 'dd MMM yyyy') : 'Not on file'}
        {expired ? ' (expired)' : soon ? ' (expiring soon)' : ''}
      </span>
    </div>
  );
}

export default function DriverDocuments() {
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get('/dashboard/driver').then(({ data }) => setDriver(data.data.driver)).catch(() => toast('Failed to load documents', 'error')).finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading documents...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Documents</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Driving Licence</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-between border-b border-slate-100 py-2">
              <span className="text-slate-600">Number</span>
              <span className="font-medium">{driver?.licenceNumber || 'Not on file'}</span>
            </div>
            <ExpiryRow label="Expiry" date={driver?.licenceExpiry || null} />
            <p className="pt-3 text-xs text-slate-500">Licence details can only be updated by an administrator.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-100 py-2">
              <span className="text-slate-600">Name</span>
              <span className="font-medium">{driver?.emergencyName || 'Not on file'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Number</span>
              <span className="font-medium">{driver?.emergencyContact || 'Not on file'}</span>
            </div>
          </CardContent>
        </Card>

        {driver?.assignedVehicle && (
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Assigned Vehicle Documents — {driver.assignedVehicle.registrationNumber}</CardTitle></CardHeader>
            <CardContent>
              <ExpiryRow label="Insurance" date={driver.assignedVehicle.insuranceExpiry} />
              <ExpiryRow label="Permit" date={driver.assignedVehicle.permitExpiry} />
              <ExpiryRow label="Fitness Certificate" date={driver.assignedVehicle.fitnessExpiry} />
              <ExpiryRow label="PUC" date={driver.assignedVehicle.pucExpiry} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
