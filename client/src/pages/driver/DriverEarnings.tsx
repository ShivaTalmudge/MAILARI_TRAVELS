import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../hooks/useToast';
import { Wallet } from 'lucide-react';

interface Payment {
  id: string;
  paymentNumber: string;
  amount: string | number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  booking: { bookingNumber: string } | null;
}

const formatMoney = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DriverEarnings() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get('/payments', { params: { limit: 200 } });
        setPayments(data.data);
      } catch (error) {
        toast('Failed to load earnings', 'error');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const paid = payments.filter((p) => p.status === 'PAID');
  const sum = (list: Payment[]) => list.reduce((acc, p) => acc + Number(p.amount), 0);

  const today = sum(paid.filter((p) => isSameDay(new Date(p.createdAt), now)));
  const week = sum(paid.filter((p) => new Date(p.createdAt) >= startOfWeek));
  const month = sum(paid.filter((p) => new Date(p.createdAt) >= startOfMonth));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Earnings</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatMoney(today)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">This Week</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatMoney(week)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">This Month</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatMoney(month)}</div></CardContent></Card>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-slate-500">
            <Wallet className="h-10 w-10 text-slate-300" />
            <p>No payments collected yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-slate-600">{p.booking?.bookingNumber || '—'}</td>
                  <td className="px-4 py-3 font-semibold">{formatMoney(Number(p.amount))}</td>
                  <td className="px-4 py-3 text-slate-600">{p.paymentMethod}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
