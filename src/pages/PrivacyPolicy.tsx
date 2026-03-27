import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Last updated: March 27, 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Company Information</h2>
          <p className="text-muted-foreground">
            Speedo Bill is a smart canteen and restaurant management platform. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform ("Service").
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li><strong className="text-foreground">Account Data:</strong> Name, email address, phone number, and business details when you register.</li>
            <li><strong className="text-foreground">Business Data:</strong> Menu items, orders, billing records, staff details, and inventory data you enter into the platform.</li>
            <li><strong className="text-foreground">Customer Data:</strong> Customer names, phone numbers, order history, and feedback collected via QR ordering.</li>
            <li><strong className="text-foreground">Payment Information:</strong> UPI transaction references and payment method selections. We do not store card numbers or UPI PINs.</li>
            <li><strong className="text-foreground">Device Data:</strong> Browser type, IP address, device identifiers, and usage analytics for service improvement.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>To provide and maintain the Speedo Bill canteen management service.</li>
            <li>To process orders, generate bills, and manage inventory.</li>
            <li>To enable QR-based customer ordering and table management.</li>
            <li>To send service notifications, subscription reminders, and support communications.</li>
            <li>To analyze usage patterns and improve platform performance.</li>
            <li>To comply with legal obligations and prevent fraud.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. UPI Payments & Financial Data</h2>
          <p className="text-muted-foreground">
            Speedo Bill integrates with Razorpay for subscription payments. All payment processing is handled by certified PCI-DSS compliant payment processors. 
            We store only transaction references and payment confirmation status — never your UPI PIN, bank account details, or card information. 
            UPI QR codes uploaded for customer payments are stored securely and are accessible only to your hotel account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Data Security</h2>
          <p className="text-muted-foreground">
            We implement industry-standard security measures including:
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>End-to-end encryption for data in transit (TLS 1.3).</li>
            <li>Row-Level Security (RLS) ensuring each hotel can only access its own data.</li>
            <li>4-digit Security PIN protection for sensitive sections (financials, settings).</li>
            <li>Role-based access control (Owner, Manager, Waiter, Chef) with granular permissions.</li>
            <li>Regular security audits and vulnerability assessments.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Data Sharing</h2>
          <p className="text-muted-foreground">
            We do not sell your personal or business data. Data may be shared with:
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li><strong className="text-foreground">Service Providers:</strong> Supabase (hosting), Razorpay (payments), and cloud infrastructure providers under strict data processing agreements.</li>
            <li><strong className="text-foreground">Legal Requirements:</strong> When required by law, court order, or government regulation.</li>
            <li><strong className="text-foreground">Business Transfers:</strong> In case of merger, acquisition, or asset sale, with prior notice.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Data Retention</h2>
          <p className="text-muted-foreground">
            Your data is retained as long as your account is active. Order history and financial records are kept for a minimum of 8 years as required by Indian tax and accounting regulations. 
            You may request data export or deletion by contacting our support team.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">8. Your Rights</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Access and download your data at any time via the Data Export feature.</li>
            <li>Request correction of inaccurate personal information.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Withdraw consent for marketing communications.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">9. Children's Privacy</h2>
          <p className="text-muted-foreground">
            Speedo Bill is a business management tool and is not intended for use by individuals under 18 years of age. We do not knowingly collect data from minors.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">10. Contact Us</h2>
          <p className="text-muted-foreground">
            For privacy-related queries, data requests, or concerns:<br />
            <strong className="text-foreground">Mangal Multiproduct</strong><br />
            Email: support@speedobill.com<br />
            This policy may be updated periodically. Continued use of the Service constitutes acceptance of any modifications.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
