import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

interface RevenueReport { totalRevenue: number; totalPayments: number; byMethod: Record<string, number>; }
interface BookingReportSummary { total: number; totalRevenue: number; byStatus: Record<string, number>; byTripType: Record<string, number>; }

const formatMoney = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;

export default function AdminReports() {
  const toast = useToast();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [bookingSummary, setBookingSummary] = useState<BookingReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = { fromDate: fromDate || undefined, toDate: toDate || undefined };
      const [rev, book] = await Promise.all([
        api.get('/reports/revenue', { params }),
        api.get('/reports/bookings', { params }),
      ]);
      setRevenue(rev.data.data);
      setBookingSummary(book.data.data.summary);
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
        </>
      )}
    </div>
  );
}
