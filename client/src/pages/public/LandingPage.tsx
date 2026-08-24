import { useEffect } from 'react';
import Hero from '../../components/public/Hero';
import BookingWidget from '../../components/public/BookingWidget';
import TrustStrip from '../../components/public/TrustStrip';
import ServicesOverview from '../../components/public/ServicesOverview';
import FleetShowcase from '../../components/public/FleetShowcase';
import DestinationsAndRoutes from '../../components/public/DestinationsAndRoutes';
import CorporateCTA from '../../components/public/CorporateCTA';
import HowItWorks from '../../components/public/HowItWorks';
import SafetyAndFAQ from '../../components/public/SafetyAndFAQ';
import ContactSection from '../../components/public/ContactSection';
import { brand } from '../../config/brand';

export default function LandingPage() {
  useEffect(() => {
    document.title = `${brand.name} | Premium Indian Travel & Transportation`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Book outstation cabs, local rentals, and airport transfers with verified drivers, transparent pricing, and 24/7 support across India.');
    }
  }, []);

  return (
    <div className="flex flex-col w-full overflow-hidden">
        <Hero>
          <BookingWidget />
        </Hero>
        
        <TrustStrip />
        <ServicesOverview />
        <FleetShowcase />
        <CorporateCTA />
        <DestinationsAndRoutes />
        <HowItWorks />
        <SafetyAndFAQ />
        <ContactSection />
      </div>
  );
}
