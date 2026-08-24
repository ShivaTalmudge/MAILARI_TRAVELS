import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Select'; // Assuming Textarea was exported from there
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';

interface VehicleType {
  id: string;
  name: string;
  description: string;
}

export default function NewBooking() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const tripType = watch('tripType');

  useEffect(() => {
    api.get('/vehicle-types').then(({ data }) => setVehicleTypes(data.data)).catch(() => {});
  }, []);

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      await api.post('/bookings', data);
      toast('Booking created successfully! We will confirm your trip shortly.', 'success');
      // Redirect or reset would go here
    } catch (error: any) {
      toast(error.response?.data?.message || 'Failed to create booking', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Book a Trip</h1>
        <p className="text-slate-500 mt-1">Fill in the details below to request a vehicle.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Journey Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Trip Type" {...register('tripType', { required: 'Required' })} error={errors.tripType?.message as string}>
                <option value="">Select type...</option>
                <option value="LOCAL">Local Trip</option>
                <option value="OUTSTATION">Outstation</option>
                <option value="AIRPORT_TRANSFER">Airport Transfer</option>
                <option value="ONE_WAY">One Way Drop</option>
                <option value="ROUND_TRIP">Round Trip</option>
              </Select>
              
              <Select label="Preferred Vehicle" {...register('vehicleTypeId', { required: 'Required' })} error={errors.vehicleTypeId?.message as string}>
                <option value="">Select vehicle...</option>
                {vehicleTypes.map(vt => (
                  <option key={vt.id} value={vt.id}>{vt.name} - {vt.description}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Pickup Location" placeholder="Full address" {...register('pickupLocation', { required: 'Required' })} error={errors.pickupLocation?.message as string} />
              <Input label="Drop Location" placeholder="Full address (optional for Local)" {...register('dropLocation')} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input type="date" label="Pickup Date" {...register('pickupDate', { required: 'Required' })} error={errors.pickupDate?.message as string} />
              <Input type="time" label="Pickup Time" {...register('pickupTime', { required: 'Required' })} error={errors.pickupTime?.message as string} />
              <Input type="date" label="Return Date (Optional)" {...register('returnDate')} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="number" label="Number of Passengers" min="1" defaultValue="1" {...register('passengerCount', { required: 'Required' })} />
              <Input type="number" label="Luggage Count" min="0" defaultValue="0" {...register('luggageCount')} />
            </div>
          </CardContent>
        </Card>

        {tripType === 'AIRPORT_TRANSFER' && (
          <Card>
            <CardHeader>
              <CardTitle>Flight Details (Airport Transfer)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Flight Number" {...register('flightNumber')} placeholder="e.g. AI 101" />
              <Select label="Flight Type" {...register('flightType')}>
                <option value="">Select...</option>
                <option value="DOMESTIC">Domestic</option>
                <option value="INTERNATIONAL">International</option>
              </Select>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              label="Special Instructions" 
              placeholder="Any specific requirements or notes for the driver..."
              {...register('specialInstructions')} 
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" isLoading={isLoading}>
            Submit Booking Request
          </Button>
        </div>
      </form>
    </div>
  );
}
