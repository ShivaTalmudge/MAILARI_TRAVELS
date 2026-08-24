import { ReactNode } from 'react';

export default function Hero({ children }: { children?: ReactNode }) {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-24 pb-16 overflow-hidden bg-slate-900">
      {/* Premium Cinematic Background with Dark Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80')",
          backgroundPosition: "center 60%"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-slate-900/40" />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Content */}
          <div className="lg:col-span-6 lg:pr-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-300 mb-6 backdrop-blur-sm shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
              Premium Travel in India
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              Travel in Comfort.<br />
              <span className="text-brand-400">Arrive with Confidence.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Providing reliable local, outstation, airport and corporate transportation with professionally managed vehicles and verified drivers.
            </p>

            <div className="hidden lg:flex items-center space-x-6">
              <div className="flex -space-x-3">
                <img className="w-10 h-10 rounded-full border-2 border-slate-900" src="https://i.pravatar.cc/100?img=1" alt="User" />
                <img className="w-10 h-10 rounded-full border-2 border-slate-900" src="https://i.pravatar.cc/100?img=2" alt="User" />
                <img className="w-10 h-10 rounded-full border-2 border-slate-900" src="https://i.pravatar.cc/100?img=3" alt="User" />
                <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-brand-500 flex items-center justify-center text-xs font-bold text-white">4.9★</div>
              </div>
              <div className="text-sm text-slate-300">
                <span className="font-semibold text-white">Top Rated</span><br/>Travel Partner
              </div>
            </div>
          </div>

          {/* Booking Widget Container */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-md w-full">
              {children}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
