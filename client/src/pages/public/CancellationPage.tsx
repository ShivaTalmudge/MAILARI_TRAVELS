import { useEffect } from 'react';
import { brand } from '../../config/brand';

export default function CancellationPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 border border-slate-100">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Cancellation & Refund Policy</h1>
          <p className="text-sm text-slate-500 mb-8">Last Updated: August 2026</p>
          
          <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Local Trips</h2>
              <p>For daily city cabs, you may cancel your booking free of charge up to 1 hour before the scheduled pickup time. Cancellations made within 1 hour of pickup may incur a cancellation fee of up to ₹150.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Outstation & Intercity Trips</h2>
              <p>For intercity travel, free cancellation is available up to 12 hours before the journey. Cancellations made within 12 hours will be subject to a 20% cancellation fee based on the estimated trip cost. If the driver has already reached the pickup location, a 30% fee applies.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Airport Transfers</h2>
              <p>Airport pickups can be cancelled without penalty up to 3 hours before the scheduled time. Later cancellations will incur a flat fee of ₹200.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Refund Processing</h2>
              <p>Eligible refunds for pre-paid bookings will be processed to the original payment method within 5-7 business days. {brand.name} reserves the right to waive fees in cases of extenuating circumstances at our sole discretion.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
