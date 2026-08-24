import { Outlet, Link } from 'react-router-dom';
import { brand } from '../config/brand';
import { PlaneTakeoff } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left side - Auth form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-500/20">
              <PlaneTakeoff size={24} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-brand-900">{brand.name}</span>
          </Link>
          
          <Outlet />
        </div>
      </div>
      
      {/* Right side - Image/Branding */}
      <div className="hidden lg:relative lg:block lg:w-1/2 overflow-hidden bg-brand-900">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800 to-brand-950 opacity-90" />
        {/* Placeholder abstract design since we don't have images */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFFFFF" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,97.1,-2.4C97.4,13.2,92.1,29,82.8,42C73.5,55,60.2,65.3,45.8,71.6C31.4,77.9,15.7,80.2,0.7,78.9C-14.3,77.6,-28.5,72.7,-42,65.8C-55.5,58.9,-68.1,50,-77.1,38.1C-86.1,26.2,-91.4,11.3,-91.3,-3.6C-91.2,-18.5,-85.7,-33.4,-76.5,-45.5C-67.3,-57.6,-54.3,-66.9,-40.8,-74.6C-27.3,-82.3,-13.7,-88.4,1,-90.1C15.7,-91.8,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>
        
        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <h2 className="text-4xl font-bold mb-4">{brand.tagline}</h2>
          <p className="text-brand-200 text-lg max-w-md">
            Premium fleet, verified drivers, and transparent pricing for all your travel needs across India.
          </p>
          
          <div className="mt-12 grid grid-cols-2 gap-8 border-t border-brand-700/50 pt-12">
            <div>
              <div className="text-3xl font-bold text-white mb-1">500+</div>
              <div className="text-brand-300 text-sm">Premium Vehicles</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">24/7</div>
              <div className="text-brand-300 text-sm">Customer Support</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
