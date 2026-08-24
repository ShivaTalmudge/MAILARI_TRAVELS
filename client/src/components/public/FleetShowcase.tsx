import { Users, Briefcase, CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

export default function FleetShowcase() {
  const fleet = [
    { 
      name: 'Swift Dzire', 
      models: 'Premium Sedan',
      capacity: 4, 
      luggage: 2,
      desc: 'Comfortable rides for small families or business travel. Efficient and smooth.', 
      tag: 'Popular',
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600'
    },
    { 
      name: 'Ertiga', 
      models: 'Comfortable 6-Seater SUV',
      capacity: 6, 
      luggage: 3,
      desc: 'Spacious and luxurious for longer outstation trips and airport transfers.', 
      tag: 'Premium',
      image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=600'
    },
    { 
      name: 'Tempo Traveller', 
      models: 'Force Traveller 12-17 Seater',
      capacity: 17, 
      luggage: 6,
      desc: 'Perfect for group tours, corporate outings, and family event transportation.', 
      tag: 'Group',
      image: 'https://images.unsplash.com/photo-1570125909232-eb263c85f48c?auto=format&fit=crop&q=80&w=600'
    },
  ];

  return (
    <section id="fleet" className="py-24 bg-slate-50 border-y border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-brand-500 font-semibold tracking-wide uppercase text-sm mb-3">Our Premium Fleet</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900">A Vehicle For Every Occasion</h3>
            <p className="mt-4 text-lg text-slate-600">
              Well-maintained, thoroughly cleaned, and driven by professionals. Choose the right vehicle for your journey size and style.
            </p>
          </div>
          <Link to="/fleet" className="hidden md:inline-flex">
            <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100">
              View All Vehicles <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {fleet.map((car, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl bg-white shadow-md border border-slate-200 hover:shadow-xl transition-all duration-300 flex flex-col">
              <div className="absolute top-4 right-4 z-10 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                {car.tag}
              </div>
              
              <div className="relative h-56 overflow-hidden bg-slate-100">
                <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors z-0" />
                <img 
                  src={car.image} 
                  alt={car.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>

              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-2xl font-bold text-slate-900 mb-1">{car.name}</h3>
                <p className="text-sm text-slate-500 mb-5">{car.models}</p>
                
                <div className="flex items-center gap-4 text-sm text-slate-700 mb-5 pb-5 border-b border-slate-100">
                  <span className="flex items-center"><Users className="mr-1.5 h-4 w-4 text-brand-500" /> {car.capacity} Seats</span>
                  <span className="flex items-center"><Briefcase className="mr-1.5 h-4 w-4 text-brand-500" /> {car.luggage} Bags</span>
                  <span className="flex items-center"><CheckCircle2 className="mr-1.5 h-4 w-4 text-brand-500" /> AC</span>
                </div>
                
                <p className="text-slate-600 text-sm mb-6 flex-grow leading-relaxed">{car.desc}</p>
                
                <Link to="/book">
                  <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3">
                    Book This Vehicle
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center md:hidden">
          <Link to="/fleet">
            <Button variant="outline" className="border-slate-300 text-slate-700 w-full">
              View All Vehicles <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
