import { ShieldCheck, Map, Clock, CreditCard } from 'lucide-react';

export default function TrustStrip() {
  const trustItems = [
    { icon: ShieldCheck, title: 'Professional Drivers', desc: 'Verified & Background-Checked' },
    { icon: Map, title: 'Safe & Reliable', desc: 'Premium Well-Maintained Vehicles' },
    { icon: CreditCard, title: 'Transparent Pricing', desc: 'No Hidden Charges' },
    { icon: Clock, title: '24/7 Support', desc: 'Round-the-clock Assistance' },
  ];

  return (
    <section className="bg-brand-50 border-b border-brand-100 py-6 sm:py-8 relative z-20 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 divide-x-0 md:divide-x md:divide-brand-200">
          {trustItems.map((item, index) => (
            <div key={index} className="flex flex-col items-center text-center px-2">
              <div className="bg-brand-100 text-brand-600 p-3 rounded-full mb-3">
                <item.icon className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm md:text-base">{item.title}</h4>
              <p className="text-xs md:text-sm text-slate-600 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
