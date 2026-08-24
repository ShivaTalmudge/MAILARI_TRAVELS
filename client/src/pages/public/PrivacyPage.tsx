import { useEffect } from 'react';
import { brand } from '../../config/brand';

export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 border border-slate-100">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
          <p className="text-sm text-slate-500 mb-8">Last Updated: August 2026</p>
          
          <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Information Collection</h2>
              <p>We collect information you provide directly to us when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, payment method, and other information you choose to provide.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Use of Information</h2>
              <p>We may use the information we collect about you to provide, maintain, and improve our Services, such as to facilitate payments, send receipts, provide products and services you request, develop new features, provide customer support to Users and Drivers, develop safety features, authenticate users, and send product updates and administrative messages.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Location Information</h2>
              <p>When you use the Services for transportation, we collect precise location data about the trip from the {brand.name} app used by the Driver. If you permit the {brand.name} app to access location services, we may also collect the precise location of your device when the app is running in the foreground or background.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
