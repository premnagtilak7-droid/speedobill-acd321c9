import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TermsConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Terms & Conditions</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Last updated: March 27, 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using Speedo Bill ("Service"), 
            you agree to be bound by these Terms & Conditions. If you do not agree, you must not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Service Description</h2>
          <p className="text-muted-foreground">
            Speedo Bill is a cloud-based canteen and restaurant management platform that provides:
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Table management and QR-based customer ordering.</li>
            <li>Kitchen Order Ticket (KOT) and Kitchen Display System (KDS).</li>
            <li>Billing, GST calculation, and payment tracking.</li>
            <li>Staff management, shift scheduling, and performance tracking.</li>
            <li>Inventory management, recipe linking, and wastage tracking.</li>
            <li>Analytics, reporting, and data export capabilities.</li>
            <li>Third-party integration support (Zomato, Swiggy, etc.).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Account Registration</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>You must provide accurate and complete registration information.</li>
            <li>You are responsible for maintaining the confidentiality of your login credentials and Security PIN.</li>
            <li>You are responsible for all activities that occur under your account.</li>
            <li>Hotel owners may create staff accounts (Waiter, Chef, Manager) under their hotel. Owners are responsible for managing staff access.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Subscription & Payment</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Speedo Bill offers Free, Basic, and Premium subscription tiers.</li>
            <li>New accounts receive a 7-day free trial with full access to all features.</li>
            <li>Paid subscriptions can be activated via License Keys or Razorpay online payment.</li>
            <li>Subscription fees are non-refundable once the license period has begun.</li>
            <li>If your subscription expires, access to premium features will be restricted until renewal.</li>
            <li>Speedo Bill reserves the right to modify pricing with 30 days advance notice.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. UPI & Payment Integration</h2>
          <p className="text-muted-foreground">
            Speedo Bill allows you to upload UPI QR codes for customer-facing payments. You acknowledge that:
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>All UPI transactions occur directly between your business and the customer via your bank/UPI provider.</li>
            <li>Speedo Bill is not a payment processor and does not handle, hold, or process customer payment funds.</li>
            <li>You are solely responsible for verifying payment receipt and reconciling transactions.</li>
            <li>Subscription payments processed via Razorpay are subject to Razorpay's terms of service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Data Ownership</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>You retain full ownership of all business data (menus, orders, customer records, financials) entered into Speedo Bill.</li>
            <li>You may export your data at any time using the built-in Data Export feature.</li>
            <li>Mangal Multiproduct will not use your business data for commercial purposes without your consent.</li>
            <li>Aggregated, anonymized data may be used for platform improvement and analytics.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Acceptable Use</h2>
          <p className="text-muted-foreground">You agree not to:</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Use the Service for any unlawful purpose.</li>
            <li>Attempt to reverse-engineer, copy, or redistribute the platform.</li>
            <li>Share login credentials or license keys with unauthorized parties.</li>
            <li>Transmit viruses, malware, or malicious code through the Service.</li>
            <li>Overload the platform with automated requests or scraping.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">8. Service Availability</h2>
          <p className="text-muted-foreground">
            We strive for 99.9% uptime but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to 
            maintenance, updates, or factors beyond our control. We will provide advance notice for planned maintenance when possible.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">9. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            To the maximum extent permitted by Indian law, Mangal Multiproduct shall not be liable for any indirect, incidental, 
            special, or consequential damages arising from your use of the Service, including but not limited to lost profits, 
            data loss, or business interruption. Our total liability shall not exceed the subscription fees paid by you in the 
            preceding 12 months.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">10. Termination</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>You may cancel your account at any time. Data will be retained for 30 days post-cancellation before permanent deletion.</li>
            <li>We may suspend or terminate accounts that violate these Terms or engage in fraudulent activity.</li>
            <li>Upon termination, your right to use the Service ceases immediately.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">11. Governing Law</h2>
          <p className="text-muted-foreground">
            These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be 
            subject to the exclusive jurisdiction of the courts in India.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">12. Contact</h2>
          <p className="text-muted-foreground">
            For questions regarding these Terms:<br />
            <strong className="text-foreground">Mangal Multiproduct</strong><br />
            Email: support@speedobill.com<br />
            These terms may be updated periodically. Continued use constitutes acceptance.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsConditions;
