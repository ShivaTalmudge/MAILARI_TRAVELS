import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Card, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../hooks/useToast';
import { FileText, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

interface Invoice {
  id: string;
  invoiceNumber: string;
  subtotal: string | number;
  taxTotal: string | number;
  discount: string | number;
  totalAmount: string | number;
  paymentStatus: string;
  createdAt: string;
  booking: { bookingNumber: string } | null;
}

const formatMoney = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`;

export default function CustomerInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get('/invoices', { params: { limit: 100 } });
        setInvoices(data.data);
      } catch (error) {
        toast('Failed to load invoices', 'error');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Invoices</h1>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-slate-500">
            <FileText className="h-10 w-10 text-slate-300" />
            <p>No invoices yet. An invoice is generated once your trip is completed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Subtotal</th>
                <th className="px-4 py-3">Tax</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.booking?.bookingNumber || '—'}</td>
                  <td className="px-4 py-3">{formatMoney(inv.subtotal)}</td>
                  <td className="px-4 py-3">{formatMoney(inv.taxTotal)}</td>
                  <td className="px-4 py-3 font-semibold">{formatMoney(inv.totalAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.paymentStatus} /></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/customer/invoices/${inv.id}/print`)}>
                      <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
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
