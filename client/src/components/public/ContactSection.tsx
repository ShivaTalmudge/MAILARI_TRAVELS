import { useState } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { brand } from '../../config/brand';

export default function ContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Thank you for your inquiry. Our team will contact you shortly.');
    }, 1000);
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors";

  return (
    <section id="contact" className="py-24 bg-white relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Let's Plan Your Journey</h2>
          <p className="text-lg text-slate-600">Have questions about a route? Need to arrange a corporate contract? Our team is here to help.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          
          {/* Contact Info */}
          <div>
            <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-800">
              <h3 className="text-2xl font-bold mb-8">Get in Touch</h3>
              
              <div className="space-y-8">
                <div className="flex">
                  <div className="mt-1 bg-brand-500/20 text-brand-400 p-3 rounded-xl h-12 w-12 flex items-center justify-center shrink-0">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div className="ml-6">
                    <h4 className="text-lg font-semibold text-white">Call Us 24/7</h4>
                    <p className="text-slate-400 mt-1">{brand.supportPhone}</p>
                    <p className="text-sm text-slate-500 mt-1">For immediate booking assistance</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="mt-1 bg-brand-500/20 text-brand-400 p-3 rounded-xl h-12 w-12 flex items-center justify-center shrink-0">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="ml-6">
                    <h4 className="text-lg font-semibold text-white">Email Us</h4>
                    <p className="text-slate-400 mt-1">{brand.supportEmail}</p>
                    <p className="text-sm text-slate-500 mt-1">For corporate inquiries and support</p>
                  </div>
                </div>

                <div className="flex">
                  <div className="mt-1 bg-brand-500/20 text-brand-400 p-3 rounded-xl h-12 w-12 flex items-center justify-center shrink-0">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="ml-6">
                    <h4 className="text-lg font-semibold text-white">Office Location</h4>
                    <p className="text-slate-400 mt-1 leading-relaxed max-w-xs">{brand.address}</p>
                  </div>
                </div>

                <div className="flex">
                  <div className="mt-1 bg-brand-500/20 text-brand-400 p-3 rounded-xl h-12 w-12 flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="ml-6">
                    <h4 className="text-lg font-semibold text-white">Business Hours</h4>
                    <p className="text-slate-400 mt-1">Dispatch & Support: 24/7</p>
                    <p className="text-slate-400">Corporate Office: Mon-Fri, 9AM-6PM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-3xl p-8 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/50">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Send an Inquiry</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <input type="text" className={inputClass} placeholder="John Doe" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile Number</label>
                  <input type="tel" className={inputClass} placeholder="+91" required />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <input type="email" className={inputClass} placeholder="john@example.com" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Type</label>
                <select className={inputClass} required defaultValue="">
                  <option value="" disabled>Select a service</option>
                  <option value="outstation">Outstation Taxi</option>
                  <option value="local">Local City Rental</option>
                  <option value="airport">Airport Transfer</option>
                  <option value="corporate">Corporate Contract</option>
                  <option value="event">Wedding/Event</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message / Requirements</label>
                <textarea className={inputClass} rows={4} placeholder="Please provide details about your trip..." required />
              </div>

              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </div>

        </div>
      </div>
    </section>
  );
}
