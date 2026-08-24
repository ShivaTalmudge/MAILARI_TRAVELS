import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import api from '../../services/api';
import { format } from 'date-fns';

export default function DriverVehicle() {
  const [vehicle, setVehicle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Driver dashboard returns driver profile which includes assignedVehicle
    api.get('/dashboard/driver').then(({ data }) => {
      setVehicle(data.data.driver.assignedVehicle);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading vehicle details...</div>;

  if (!vehicle) {
    return (
      <div className="space-y-6 text-center py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">My Vehicle</h1>
        <div className="rounded-xl border border-slate-200 border-dashed bg-slate-50 p-12 max-w-lg mx-auto">
          <p className="text-slate-500 mb-2">You don't have a vehicle assigned currently.</p>
          <p className="text-sm text-slate-400">Please contact the admin to get a vehicle assigned for your trips.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Assigned Vehicle</h1>
        <StatusBadge status={vehicle.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-sm text-slate-500">Registration No.</p>
                <p className="font-semibold text-lg">{vehicle.registrationNumber}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Make & Model</p>
                <p className="font-semibold">{vehicle.make} {vehicle.model}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Type</p>
                <p className="font-semibold">{vehicle.vehicleType?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Fuel Type</p>
                <p className="font-semibold">{vehicle.fuelType}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Color</p>
                <p className="font-semibold">{vehicle.color || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Seating Capacity</p>
                <p className="font-semibold">{vehicle.seatingCapacity} seats</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents & Expiries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-600">Insurance Expiry</span>
              <span className="font-medium">{vehicle.insuranceExpiry ? format(new Date(vehicle.insuranceExpiry), 'dd MMM yyyy') : 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-600">Permit Expiry</span>
              <span className="font-medium">{vehicle.permitExpiry ? format(new Date(vehicle.permitExpiry), 'dd MMM yyyy') : 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-600">Fitness Expiry</span>
              <span className="font-medium">{vehicle.fitnessExpiry ? format(new Date(vehicle.fitnessExpiry), 'dd MMM yyyy') : 'N/A'}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-slate-600">PUC Expiry</span>
              <span className="font-medium">{vehicle.pucExpiry ? format(new Date(vehicle.pucExpiry), 'dd MMM yyyy') : 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
