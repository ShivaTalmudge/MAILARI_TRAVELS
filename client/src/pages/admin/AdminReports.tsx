import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

interface RevenueReport { totalRevenue: number; totalPayments: number; byMethod: Record<string, number>; }
interface BookingReportSummary { total: number; totalRevenue: number; byStatus: Record<string, number>; byTripType: Record<string, number>; }
interface GstReport { totals: { subtotal: number; taxTotal: number; totalAmount: number; }; }
interface DriverReport { driverId: string; driver: { fullName: string; } | null; totalTrips: number; totalRevenue: number; }
interface VehicleReport { id: string; registrationNumber: string; make: string; model: string; _count: { bookings: number; }; }

const formatMoney = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;

export default function AdminReports() {
  const toast = useToast();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [bookingSummary, setBookingSummary] = useState<BookingReportSummary | null>(null);
  const [gstReport, setGstReport] = useState<GstReport | null>(null);
  const [driverReports, setDriverReports] = useState<DriverReport[]>([]);
  const [vehicleReports, setVehicleReports] = useState<VehicleReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = { fromDate: fromDate || undefined, toDate: toDate || undefined };
      const [rev, book, gst, drivers, vehicles] = await Promise.all([
        api.get('/reports/revenue', { params }),
        api.get('/reports/bookings', { params }),
        api.get('/reports/gst', { params }),
        api.get('/reports/drivers', { params }),
        api.get('/reports/vehicles'),
      ]);
      setRevenue(rev.data.data);
      setBookingSummary(book.data.data.summary);
      setGstReport(gst.data.data);
      setDriverReports(drivers.data.data);
      setVehicleReports(vehicles.data.data);
    } catch (error) {
      toast('Failed to load reports', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, toast]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <Button onClick={fetchReports} isLoading={isLoading}>Apply</Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Total Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatMoney(revenue?.totalRevenue || 0)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Payments Collected</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{revenue?.totalPayments || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Bookings</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{bookingSummary?.total || 0}</div></CardContent></Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Revenue by Payment Method</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {revenue && Object.keys(revenue.byMethod).length > 0 ? (
                  Object.entries(revenue.byMethod).map(([method, amount]) => (
                    <div key={method} className="flex justify-between border-b border-slate-100 py-1.5 text-sm last:border-0">
                      <span className="text-slate-600">{method}</span>
                      <span className="font-medium">{formatMoney(amount)}</span>
                    </div>
                  ))
                ) : <p className="text-sm text-slate-400">No payments in this period.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Bookings by Status</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {bookingSummary && Object.keys(bookingSummary.byStatus).length > 0 ? (
                  Object.entries(bookingSummary.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between border-b border-slate-100 py-1.5 text-sm last:border-0">
                      <span className="text-slate-600">{status}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))
                ) : <p className="text-sm text-slate-400">No bookings in this period.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <Card>
              <CardHeader><CardTitle>Tax & GST Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-100 py-1.5"><span className="text-slate-600">Subtotal</span><span className="font-medium">{formatMoney(gstReport?.totals?.subtotal || 0)}</span></div>
                <div className="flex justify-between border-b border-slate-100 py-1.5"><span className="text-slate-600">Total Tax (GST)</span><span className="font-medium">{formatMoney(gstReport?.totals?.taxTotal || 0)}</span></div>
                <div className="flex justify-between border-b border-slate-100 py-1.5"><span className="text-slate-600">Gross Total</span><span className="font-bold">{formatMoney(gstReport?.totals?.totalAmount || 0)}</span></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader><CardTitle>Driver Performance</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {driverReports.length > 0 ? (
                  driverReports.map((d) => (
                    <div key={d.driverId} className="flex justify-between border-b border-slate-100 py-1.5 text-sm last:border-0">
                      <span className="text-slate-600">{d.driver?.fullName || 'Unknown'}</span>
                      <span className="font-medium">{d.totalTrips} trips ({formatMoney(d.totalRevenue)})</span>
                    </div>
                  ))
                ) : <p className="text-sm text-slate-400">No driver data.</p>}
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Vehicle Utilization</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {vehicleReports.map((v) => (
                  <div key={v.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                    <p className="font-semibold text-slate-900">{v.registrationNumber}</p>
                    <p className="text-xs text-slate-500 mb-1">{v.make} {v.model}</p>
                    <p className="text-sm font-medium text-brand-600">{v._count?.bookings || 0} Trips</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
