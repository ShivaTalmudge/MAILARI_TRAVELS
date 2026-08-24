import { MousePointerClick, Car, CalendarCheck, Map } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: MousePointerClick,
      title: '01. Choose Your Trip',
      desc: 'Enter your pickup and drop locations, select local or outstation, and pick your travel dates.'
    },
    {
      icon: Car,
      title: '02. Select Your Vehicle',
      desc: 'Browse our premium fleet of sedans, SUVs, and Tempo Travellers. See transparent pricing upfront.'
    },
    {
      icon: CalendarCheck,
      title: '03. Confirm Booking',
      desc: 'Review your trip details, authenticate safely, and receive instant confirmation.'
    },
    {
      icon: Map,
      title: '04. Travel with Confidence',
      desc: 'Your verified driver will arrive on time. Track your trip and enjoy a comfortable journey.'
    }
  ];

  return (
    <section className="py-24 bg-white relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">How Mailari Works</h2>
          <p className="text-lg text-slate-600">Booking your next premium ride is just a few clicks away.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 relative">
          {/* Connecting Line for Desktop */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-slate-100 -z-10" />

          {steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center group">
              <div className="w-24 h-24 rounded-full bg-white border-4 border-slate-50 flex items-center justify-center shadow-sm mb-6 group-hover:border-brand-100 group-hover:shadow-md transition-all duration-300 relative z-10">
                <step.icon className="h-8 w-8 text-brand-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
