import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Card, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../hooks/useToast';
import { Receipt } from 'lucide-react';

interface Payment {
  id: string;
  paymentNumber: string;
  amount: string | number;
  paymentMethod: string;
  status: string;
  transactionRef: string | null;
  paymentDate: string | null;
  createdAt: string;
  booking: { bookingNumber: string; totalAmount: string | number } | null;
}

const formatMoney = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`;

export default function CustomerPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get('/payments', { params: { limit: 100 } });
        setPayments(data.data);
      } catch (error) {
        toast('Failed to load payment history', 'error');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Payments</h1>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-slate-500">
            <Receipt className="h-10 w-10 text-slate-300" />
            <p>No payments yet. Payments will appear here once recorded against your bookings.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Payment #</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.paymentNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{p.booking?.bookingNumber || '—'}</td>
                  <td className="px-4 py-3 font-semibold">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.paymentMethod}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.transactionRef || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : new Date(p.createdAt).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
