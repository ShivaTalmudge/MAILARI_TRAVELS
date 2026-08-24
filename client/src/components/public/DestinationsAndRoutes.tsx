import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

export default function DestinationsAndRoutes() {
  const destinations = [
    { name: 'Mysuru', desc: 'The Heritage City', image: 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&q=80&w=600' },
    { name: 'Ooty', desc: 'Queen of Hill Stations', image: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&q=80&w=600' },
    { name: 'Coorg', desc: 'Scotland of India', image: 'https://images.unsplash.com/photo-1627896157734-44b462c18db3?auto=format&fit=crop&q=80&w=600' },
  ];

  const routes = [
    { from: 'Bengaluru', to: 'Mysuru', price: '₹3,000' },
    { from: 'Bengaluru', to: 'Ooty', price: '₹6,500' },
    { from: 'Kempegowda Airport', to: 'City Center', price: '₹900' },
    { from: 'Bengaluru', to: 'Coorg', price: '₹5,500' },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        
        {/* Popular Destinations */}
        <div className="mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Popular Destinations</h2>
              <p className="mt-4 text-lg text-slate-600">Discover our most frequently traveled cities and getaways.</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {destinations.map((dest, i) => (
              <div key={i} className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-80">
                <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/40 transition-colors z-10" />
                <img src={dest.image} alt={dest.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                  <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-md">{dest.name}</h3>
                  <p className="text-brand-50 mb-4 drop-shadow-md">{dest.desc}</p>
                  <Link to={`/book?destination=${dest.name}`} className="inline-flex items-center text-white font-medium hover:text-brand-400 transition-colors">
                    Explore Trips <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Routes */}
        <div className="bg-slate-50 rounded-3xl p-8 md:p-12 border border-slate-100">
          <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-8 text-center">Frequently Booked Routes</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {routes.map((route, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-brand-300 transition-colors flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-semibold text-slate-900">{route.from}</div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <div className="font-semibold text-slate-900">{route.to}</div>
                </div>
                <div className="flex items-end justify-between mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Starting from</span>
                    <span className="font-bold text-brand-600">{route.price}</span>
                  </div>
                  <Link to={`/book?pickup=${route.from}&destination=${route.to}`}>
                    <Button variant="outline" size="sm" className="text-xs px-3 py-1.5 h-auto">Book</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </section>
  );
}
