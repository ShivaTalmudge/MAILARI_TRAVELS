import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui/Button';

export default function InvoicePrintView() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/invoices/${id}`);
        setInvoice(data.data);
      } catch (error) {
        toast('Failed to load invoice', 'error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!invoice) return <div className="p-10 text-center">Loading Invoice...</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl bg-white p-10 shadow-sm print:shadow-none print:p-0">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
          <Button onClick={handlePrint}>Print as PDF</Button>
        </div>

        <div className="border-b border-slate-200 pb-8 text-center sm:text-left sm:flex sm:justify-between sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">MAILARI TRAVELS</h1>
            <p className="mt-2 text-sm text-slate-500">
              123 Transport Highway, Business District<br />
              Bangalore, India 560001<br />
              GSTIN: 29XXXXXXXXXXXX
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:text-right">
            <h2 className="text-xl font-semibold text-slate-900">INVOICE</h2>
            <p className="text-sm font-medium text-slate-600">#{invoice.invoiceNumber}</p>
            <p className="mt-1 text-sm text-slate-500">Date: {new Date(invoice.createdAt).toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 py-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Billed To</p>
            <p className="mt-2 font-medium text-slate-900">{invoice.booking?.customer?.fullName || 'Customer'}</p>
            <p className="text-sm text-slate-600">{invoice.booking?.customer?.user?.mobile}</p>
            <p className="text-sm text-slate-600">{invoice.booking?.customer?.user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trip Details</p>
            <p className="mt-2 text-sm text-slate-600"><span className="font-medium text-slate-900">Booking:</span> {invoice.booking?.bookingNumber}</p>
            <p className="text-sm text-slate-600"><span className="font-medium text-slate-900">Route:</span> {invoice.booking?.pickupLocation} to {invoice.booking?.dropLocation || 'N/A'}</p>
            <p className="text-sm text-slate-600"><span className="font-medium text-slate-900">Vehicle:</span> {invoice.booking?.vehicle?.registrationNumber || 'N/A'}</p>
          </div>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-4 font-semibold">Description</th>
              <th className="py-3 px-4 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items && invoice.items.map((item: any) => (
              <tr key={item.id}>
                <td className="py-3 px-4">{item.description}</td>
                <td className="py-3 px-4 text-right">₹{Number(item.amount).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex justify-end">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium">₹{Number(invoice.subtotal).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tax (GST)</span>
              <span className="font-medium">₹{Number(invoice.taxTotal).toLocaleString('en-IN')}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Discount</span>
                <span className="font-medium text-red-600">-₹{Number(invoice.discount).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-900">
              <span>Total Amount</span>
              <span>₹{Number(invoice.totalAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-16 border-t border-slate-200 pt-8 text-center text-xs text-slate-400">
          <p>Thank you for traveling with Mailari Travels!</p>
          <p>For any queries, please contact support@mailaritravels.com</p>
        </div>
      </div>
    </div>
  );
}
