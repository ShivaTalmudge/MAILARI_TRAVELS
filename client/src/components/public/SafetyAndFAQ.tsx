import { useState } from 'react';
import { ChevronDown, ShieldAlert, CheckCircle, FileText, UserCheck } from 'lucide-react';

export default function SafetyAndTrust() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const safetyFeatures = [
    { icon: UserCheck, title: 'Driver Verification', desc: 'Every driver undergoes strict background checks, including address verification and driving record analysis.' },
    { icon: ShieldAlert, title: 'Vehicle Maintenance', desc: 'Our fleet is regularly serviced and inspected before every long-distance journey to ensure complete safety.' },
    { icon: FileText, title: 'Transparent Billing', desc: 'No hidden charges. Your final invoice includes detailed breakdowns of tolls, taxes, and base fares.' },
    { icon: CheckCircle, title: 'Trip Monitoring', desc: 'Our central dispatch team monitors active trips to ensure on-time arrivals and emergency assistance if needed.' }
  ];

  const faqs = [
    { q: 'How do I book a trip?', a: 'You can book a trip directly through our website by entering your pickup and drop locations. Once you select a vehicle, you will be prompted to log in or create an account to confirm.' },
    { q: 'Can I book an airport transfer in advance?', a: 'Yes, you can schedule an airport transfer up to 30 days in advance. We recommend booking at least 4 hours before your flight departure.' },
    { q: 'Can I choose my vehicle?', a: 'Yes, during the booking process, you will be presented with a list of available vehicles (Sedans, SUVs, Tempo Travellers) tailored to your group size.' },
    { q: 'How do I pay?', a: 'We accept all major credit/debit cards, UPI, and net banking. You can choose to pay the full amount upfront or a partial advance depending on the trip type.' },
    { q: 'Do you provide invoices for corporate travel?', a: 'Absolutely. All completed trips automatically generate a GST-compliant digital invoice accessible from your dashboard.' },
    { q: 'How do I contact my driver?', a: 'Driver details are shared 2 hours before your scheduled pickup time via SMS and are available on your booking dashboard.' }
  ];

  return (
    <section className="py-24 bg-slate-50 border-y border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        
        {/* Safety Section */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Your Safety Comes First</h2>
            <p className="text-lg text-slate-600">We take every precaution to ensure your journey is safe, comfortable, and reliable.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {safetyFeatures.map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-brand-200 transition-colors text-center md:text-left">
                <div className="inline-flex bg-brand-50 text-brand-600 p-4 rounded-xl mb-6">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-slate-600">Everything you need to know about traveling with Mailari.</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className={`bg-white border rounded-xl overflow-hidden transition-all duration-300 ${
                  openFaqIndex === index ? 'border-brand-300 shadow-md' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  className="w-full text-left px-6 py-5 flex justify-between items-center focus:outline-none"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                >
                  <span className={`font-semibold ${openFaqIndex === index ? 'text-brand-600' : 'text-slate-900'}`}>
                    {faq.q}
                  </span>
                  <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${openFaqIndex === index ? 'transform rotate-180 text-brand-500' : 'text-slate-400'}`} />
                </button>
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaqIndex === index ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </section>
  );
}
