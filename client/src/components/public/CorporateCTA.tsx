import { Link } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export default function CorporateCTA() {
  return (
    <section id="corporate" className="py-24 bg-slate-900 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-400 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 md:p-16 lg:flex lg:items-center lg:justify-between shadow-2xl">
          <div className="lg:w-2/3 mb-10 lg:mb-0 lg:pr-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-400 mb-6">
              <Building2 className="h-4 w-4" />
              B2B Transportation Solutions
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
              Need Regular <span className="text-brand-400">Business Transport?</span>
            </h2>
            
            <p className="text-lg text-slate-300 leading-relaxed mb-8">
              Manage recurring travel requirements for employees and clients with our centralized booking platform, monthly invoicing, dedicated account manager, and enterprise-grade SLA.
            </p>

            <ul className="grid sm:grid-cols-2 gap-4 text-slate-300 mb-8">
              {['Centralized Booking Portal', 'Monthly Consolidated Invoicing', 'Dedicated Priority Support', 'Automated Ride Tracking'].map((item, i) => (
                <li key={i} className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-3" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="lg:w-1/3 flex flex-col gap-4">
            <Link to="/corporate/contact" className="w-full">
              <Button size="lg" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-brand-500/25">
                Talk to Our Team
              </Button>
            </Link>
            <Link to="/services/corporate" className="w-full">
              <Button size="lg" variant="outline" className="w-full border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white py-4 rounded-xl">
                Explore Corporate Plans <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
