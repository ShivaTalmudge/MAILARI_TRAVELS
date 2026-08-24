import { useEffect } from 'react';
import { brand } from '../../config/brand';

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 border border-slate-100">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Terms and Conditions</h1>
          <p className="text-sm text-slate-500 mb-8">Last Updated: August 2026</p>
          
          <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Acceptance of Terms</h2>
              <p>By accessing and using {brand.name}'s services, you accept and agree to be bound by the terms and provision of this agreement.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Booking and Payments</h2>
              <p>All bookings are subject to availability. Fares provided at the time of booking are estimates and may change based on actual distance traveled and waiting times. {brand.name} reserves the right to charge cancellation fees as outlined in our Cancellation Policy.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">3. User Responsibilities</h2>
              <p>Users must provide accurate pickup and drop-off information. Any damage caused to the vehicle by the passenger will be charged directly to the passenger.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Limitation of Liability</h2>
              <p>{brand.name} shall not be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
