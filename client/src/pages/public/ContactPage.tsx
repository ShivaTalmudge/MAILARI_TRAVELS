export default function ContactPage() {
  return (
    <div className="py-24 bg-white min-h-screen">
      <div className="container mx-auto max-w-3xl px-4 text-center">
        <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
        <p className="text-lg text-slate-600 mb-12">We are here to help. Reach out to us anytime.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <div className="p-8 border border-slate-200 rounded-2xl bg-slate-50">
            <h3 className="text-xl font-semibold mb-4">Customer Support</h3>
            <p className="text-slate-600 mb-2">Phone: +91 98765 43210</p>
            <p className="text-slate-600 mb-2">Email: support@mailaritravels.com</p>
            <p className="text-slate-600">Available 24/7</p>
          </div>
          <div className="p-8 border border-slate-200 rounded-2xl bg-slate-50">
            <h3 className="text-xl font-semibold mb-4">Corporate Office</h3>
            <p className="text-slate-600 mb-2">123, MG Road, Andheri West</p>
            <p className="text-slate-600 mb-2">Mumbai, Maharashtra 400053</p>
            <p className="text-slate-600">Mon - Sat, 9 AM - 6 PM</p>
          </div>
        </div>
      </div>
    </div>
  );
}
