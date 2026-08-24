import { ArrowRight, MapPin, PlaneTakeoff, Car, Briefcase, Users, CalendarHeart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ServicesOverview() {
  const services = [
    {
      icon: MapPin,
      title: 'Daily Cabs',
      description: 'Reliable point-to-point travel within Bengaluru. Hourly and full-day vehicle rentals for all your local commuting needs.',
      link: '/services/local',
      features: ['Point-to-point', 'Hourly rentals', 'Business travel']
    },
    {
      icon: Car,
      title: 'Intercity',
      description: 'One-way and round-trip outstation travel with experienced highway drivers and comfortable premium vehicles.',
      link: '/services/outstation',
      features: ['One-way trips', 'Round trips', 'Multi-day journeys']
    },
    {
      icon: PlaneTakeoff,
      title: 'Airport to City',
      description: 'Punctual KIA airport pickup and drop with scheduled travel and flight-aware tracking for complete peace of mind.',
      link: '/services/airport',
      features: ['Scheduled pickup', 'Luggage-friendly', 'Flight tracking']
    },
    {
      icon: Briefcase,
      title: 'Corporate Travel',
      description: 'Employee transportation, client pickups, and executive mobility solutions with centralized billing.',
      link: '/services/corporate',
      features: ['Monthly billing', 'Dedicated support', 'Executive fleet']
    },
    {
      icon: Users,
      title: 'Group Travel',
      description: 'Tempo Traveller and larger group transportation for family trips, outings, and pilgrimage travel.',
      link: '/services/group',
      features: ['Tempo Travellers', 'Mini Buses', 'Coordinated travel']
    },
    {
      icon: CalendarHeart,
      title: 'Weddings & Events',
      description: 'Premium transportation for weddings, events and functions with multi-vehicle coordination.',
      link: '/services/events',
      features: ['Guest transport', 'Venue transfers', 'Event scheduling']
    }
  ];

  return (
    <section id="services" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-brand-500 font-semibold tracking-wide uppercase text-sm mb-3">Our Travel Services</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">Premium Mobility for Every Occasion</h3>
          <p className="text-lg text-slate-600">
            From quick city drops to multi-day outstation journeys, Mailari Travels provides professional transportation solutions tailored to your specific requirements.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="group border border-slate-100 rounded-2xl p-8 hover:shadow-xl hover:border-brand-100 transition-all duration-300 bg-white flex flex-col h-full">
              <div className="bg-brand-50 w-14 h-14 rounded-xl flex items-center justify-center text-brand-600 mb-6 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
                <service.icon className="h-7 w-7" />
              </div>
              
              <h4 className="text-xl font-bold text-slate-900 mb-3">{service.title}</h4>
              <p className="text-slate-600 mb-6 flex-grow">{service.description}</p>
              
              <ul className="space-y-2 mb-8">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-sm text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link to={service.link} className="inline-flex items-center text-brand-600 font-semibold hover:text-brand-700 transition-colors mt-auto">
                Explore Service <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
