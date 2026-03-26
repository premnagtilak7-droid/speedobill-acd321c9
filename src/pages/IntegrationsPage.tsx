import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Globe, Truck, CreditCard, MessageSquare, Printer, Bell,
  ExternalLink, Settings, Zap, ShoppingBag, UtensilsCrossed,
  Smartphone, QrCode, BarChart3, Link2, CheckCircle2,
  ArrowRight, Clock, IndianRupee, BookOpen, AlertTriangle,
  Copy, ChevronRight
} from "lucide-react";

interface SetupStep {
  step: number;
  title: string;
  description: string;
}

interface Integration {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  category: "delivery" | "payments" | "marketing" | "operations" | "analytics";
  status: "active" | "setup_required" | "coming_soon";
  color: string;
  features: string[];
  setupSteps: SetupStep[];
  portalUrl?: string;
  portalLabel?: string;
  whyUse: string;
  estimatedTime?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "qr_ordering",
    name: "QR Table Ordering",
    tagline: "Already active in your restaurant",
    description: "Customers scan a QR code on their table, browse your menu, and place orders — no app download needed. Orders appear instantly in your POS and Kitchen Display.",
    icon: <QrCode className="h-6 w-6" />,
    category: "operations",
    status: "active",
    color: "text-primary",
    whyUse: "Reduces waiter dependency, speeds up ordering, eliminates order-taking errors. Customers love the convenience.",
    features: ["Table-wise unique QR codes", "Live menu with images & prices", "Customer self-ordering", "Modifier & special instruction support", "No app download required", "Works on any smartphone"],
    setupSteps: [
      { step: 1, title: "Go to Tables page", description: "Navigate to Tables → Table QR section in your dashboard." },
      { step: 2, title: "Generate QR codes", description: "Click 'Generate QR' for each table. Each QR is unique to that table." },
      { step: 3, title: "Print & place on tables", description: "Download and print the QR codes. Place them on each table with a small stand." },
    ],
  },
  {
    id: "razorpay",
    name: "Razorpay Payments",
    tagline: "Payment gateway for online orders",
    description: "Accept UPI, credit/debit cards, net banking, and wallets from customers ordering online. Payments are auto-reconciled with your bills.",
    icon: <CreditCard className="h-6 w-6" />,
    category: "payments",
    status: "active",
    color: "text-blue-600",
    whyUse: "Essential for online ordering. Customers can pay digitally instead of cash-only. Auto-reconciliation saves hours of manual accounting.",
    features: ["UPI payments (Google Pay, PhonePe, Paytm)", "Credit & Debit cards", "Net banking", "Auto-reconciliation with bills", "Refund management", "Payment links for delivery orders"],
    setupSteps: [
      { step: 1, title: "Already configured", description: "Razorpay is already set up with your Speedo Bill account." },
      { step: 2, title: "Test a payment", description: "Place a test order via QR ordering and complete payment to verify." },
    ],
  },
  {
    id: "zomato",
    name: "Zomato",
    tagline: "India's largest food delivery platform",
    description: "When connected, Zomato orders will automatically appear in your Speedo Bill POS and Kitchen Display. No manual re-entry needed. Your menu stays in sync between Zomato and Speedo Bill.",
    icon: <UtensilsCrossed className="h-6 w-6" />,
    category: "delivery",
    status: "setup_required",
    color: "text-red-500",
    whyUse: "Zomato brings you customers who search for food online. Without integration, you'd manually re-enter every Zomato order into your POS — wasting time and causing errors.",
    estimatedTime: "3-5 business days",
    portalUrl: "https://www.zomato.com/partner-with-us",
    portalLabel: "Zomato Partner Portal",
    features: ["Auto-import Zomato orders to POS", "Menu sync (add/remove items)", "Price & availability sync", "Order status updates back to Zomato", "Consolidated revenue reports"],
    setupSteps: [
      { step: 1, title: "Register as Zomato Restaurant Partner", description: "Visit restaurant.zomato.com and sign up with your restaurant's FSSAI license, GST, and bank details." },
      { step: 2, title: "Get your Restaurant ID & API Key", description: "After approval (2-5 days), you'll find your Restaurant ID and API credentials in Zomato's Restaurant Dashboard → Settings → API." },
      { step: 3, title: "Enter credentials in Speedo Bill", description: "Come back here, enter your Zomato Restaurant ID and API Key. We'll auto-sync your menu and start receiving orders." },
      { step: 4, title: "Verify menu sync", description: "Check that your Speedo Bill menu items match Zomato. Update prices or availability from either platform." },
    ],
  },
  {
    id: "swiggy",
    name: "Swiggy",
    tagline: "India's fastest food delivery",
    description: "Swiggy orders flow directly into your kitchen display. Menu changes in Speedo Bill auto-update on Swiggy. Track delivery status in real-time.",
    icon: <ShoppingBag className="h-6 w-6" />,
    category: "delivery",
    status: "setup_required",
    color: "text-orange-500",
    whyUse: "Swiggy has millions of daily food orders. Integration means zero manual order entry, fewer errors, and faster kitchen throughput.",
    estimatedTime: "3-7 business days",
    portalUrl: "https://partner.swiggy.com",
    portalLabel: "Swiggy Partner Portal",
    features: ["Auto-import orders to KDS", "Menu management from Speedo Bill", "Delivery tracking", "Revenue reports", "Item out-of-stock sync"],
    setupSteps: [
      { step: 1, title: "Register on Swiggy Partner Portal", description: "Go to partner.swiggy.com and register your restaurant. You'll need FSSAI license, PAN, GST, menu photos, and bank account." },
      { step: 2, title: "Wait for onboarding approval", description: "Swiggy's team will verify your restaurant (3-7 days). They may visit for a photo shoot." },
      { step: 3, title: "Get your Swiggy Vendor ID & API Token", description: "After approval, find your Vendor ID in Swiggy Partner Dashboard → Account → API Settings." },
      { step: 4, title: "Enter credentials in Speedo Bill", description: "Paste your Swiggy Vendor ID and API Token here. Orders will start flowing into your POS automatically." },
    ],
  },
  {
    id: "website_orders",
    name: "Direct Website Orders",
    tagline: "Your own ordering website — zero commission",
    description: "Get your own restaurant ordering website. Customers find you on Google, see your menu, and order directly. You keep 100% of the revenue — no Zomato/Swiggy commission.",
    icon: <Globe className="h-6 w-6" />,
    category: "delivery",
    status: "setup_required",
    color: "text-blue-500",
    whyUse: "Zomato/Swiggy charge 15-30% commission. Your own website means zero commission. Regular customers prefer ordering directly once they know your site.",
    estimatedTime: "1 day",
    features: ["Zero commission on orders", "Your own brand & domain", "SEO optimized menu page", "Online payments via Razorpay", "Order tracking for customers", "Google search visibility"],
    setupSteps: [
      { step: 1, title: "Ensure your menu is complete", description: "Add all items with prices, categories, and images in Speedo Bill's Menu section." },
      { step: 2, title: "Share your QR/order link", description: "Your customer ordering page is already live! Share the link on social media, Google Business, and print it on bills." },
      { step: 3, title: "Optional: Custom domain", description: "Want 'order.yourrestaurant.com'? Contact support to set up a custom domain pointing to your ordering page." },
    ],
  },
  {
    id: "whatsapp_biz",
    name: "WhatsApp Business",
    tagline: "Send bills & promos on WhatsApp",
    description: "Automatically send digital bills, order confirmations, and promotional messages to customers on WhatsApp. Great for building repeat customers.",
    icon: <MessageSquare className="h-6 w-6" />,
    category: "marketing",
    status: "setup_required",
    color: "text-green-600",
    whyUse: "98% of Indians open WhatsApp messages. Sending bills digitally saves paper, and promo messages bring customers back. Birthday wishes with discount coupons = guaranteed revisits.",
    estimatedTime: "1-2 days",
    portalUrl: "https://business.facebook.com/latest/whatsapp_manager",
    portalLabel: "WhatsApp Business Manager",
    features: ["Auto-send digital bills after payment", "Order confirmation messages", "Promotional broadcasts to customers", "Birthday wishes with coupons", "Feedback collection", "Reservation reminders"],
    setupSteps: [
      { step: 1, title: "Get WhatsApp Business API access", description: "Sign up at business.facebook.com → WhatsApp Manager. You need a Facebook Business account and a phone number dedicated for the business." },
      { step: 2, title: "Get API Key", description: "After approval, go to WhatsApp Manager → API Setup → Generate a permanent API token." },
      { step: 3, title: "Create message templates", description: "Create templates for: Bill receipt, Order confirmation, and Promotional message. WhatsApp must approve each template (24-48 hours)." },
      { step: 4, title: "Enter API Key in Speedo Bill", description: "Paste your WhatsApp API Token here. We'll start sending automated bills and confirmations." },
    ],
  },
  {
    id: "phonepe_biz",
    name: "PhonePe Business",
    tagline: "UPI sound-box payments at counter",
    description: "Accept PhonePe UPI payments at your counter with audio confirmation (sound-box). Great for dine-in billing where customers pay at the counter.",
    icon: <IndianRupee className="h-6 w-6" />,
    category: "payments",
    status: "setup_required",
    color: "text-purple-600",
    whyUse: "Sound-box confirms payment audibly — no need to check phone. Customers trust the confirmation sound. Faster checkout at counter.",
    estimatedTime: "5-7 business days",
    portalUrl: "https://www.phonepe.com/business-solutions/payment-solutions/",
    portalLabel: "PhonePe Business Portal",
    features: ["UPI QR payments", "Sound-box audio alerts", "Auto-settlement to bank", "Transaction history & reports"],
    setupSteps: [
      { step: 1, title: "Apply for PhonePe Business account", description: "Visit phonepe.com/business and apply. You'll need GST, PAN, bank account, and Aadhaar." },
      { step: 2, title: "Receive sound-box device", description: "PhonePe ships a sound-box device to your restaurant (₹500-1000 one-time, varies)." },
      { step: 3, title: "Get Merchant ID", description: "Find your Merchant ID in PhonePe Business Dashboard → Settings." },
      { step: 4, title: "Enter Merchant ID here", description: "We'll link PhonePe payments to your Speedo Bill transactions for auto-reconciliation." },
    ],
  },
  {
    id: "printer",
    name: "Thermal Printer (KOT & Bills)",
    tagline: "Print KOT tickets and customer bills",
    description: "Connect a thermal printer to print KOT tickets for the kitchen and formatted bills for customers. Works with any 80mm or 58mm thermal printer via USB or Bluetooth.",
    icon: <Printer className="h-6 w-6" />,
    category: "operations",
    status: "setup_required",
    color: "text-foreground",
    whyUse: "Printed KOT tickets prevent kitchen miscommunication. Printed bills look professional and are required for GST compliance.",
    estimatedTime: "30 minutes",
    features: ["KOT ticket printing", "Customer bill printing", "80mm & 58mm printer support", "USB & Bluetooth connection", "Custom bill template with logo", "Auto-print on order placement"],
    setupSteps: [
      { step: 1, title: "Buy a thermal printer", description: "Get any 80mm thermal printer (₹3,000-8,000). Popular: TVS RP 3200 Star, Epson TM-T82. For Bluetooth: get a BT-enabled model." },
      { step: 2, title: "Connect to your device", description: "USB: Plug into your PC/tablet. Bluetooth: Pair from your device's Bluetooth settings." },
      { step: 3, title: "Use browser print", description: "Speedo Bill uses browser's print dialog. Click 'Print KOT' or 'Print Bill' buttons → select your printer." },
    ],
  },
  {
    id: "push_notifications",
    name: "Push Notifications",
    tagline: "Real-time alerts for your team",
    description: "Get instant browser/mobile notifications for new orders, KDS updates, low stock warnings, and customer service calls. Never miss an order again.",
    icon: <Bell className="h-6 w-6" />,
    category: "operations",
    status: "setup_required",
    color: "text-amber-500",
    whyUse: "In a busy kitchen, you can't keep watching the screen. Push notifications alert your phone/tablet the moment a new order comes in or stock runs low.",
    estimatedTime: "5 minutes",
    features: ["New order alerts", "KDS ready notifications", "Low stock warnings", "Service call alerts from customers"],
    setupSteps: [
      { step: 1, title: "Allow notifications in browser", description: "When prompted by Speedo Bill, click 'Allow' on the notification permission popup." },
      { step: 2, title: "Keep the app tab open", description: "Notifications work when Speedo Bill is open in a browser tab (can be in background)." },
      { step: 3, title: "For mobile", description: "On Android/iOS, add Speedo Bill to your home screen ('Add to Home Screen') for app-like notification experience." },
    ],
  },
  {
    id: "dunzo",
    name: "Dunzo Delivery",
    tagline: "Hyperlocal delivery partner",
    description: "Use Dunzo riders to deliver orders placed on your own website. You take the order, Dunzo handles delivery. Lower cost than Zomato/Swiggy delivery.",
    icon: <Truck className="h-6 w-6" />,
    category: "delivery",
    status: "coming_soon",
    color: "text-green-500",
    whyUse: "When you have your own ordering website, you need delivery riders. Dunzo provides riders on-demand at lower rates than running your own fleet.",
    features: ["On-demand rider dispatch", "Live GPS tracking", "Auto-dispatch on new order", "Delivery cost estimation", "COD & prepaid support"],
    setupSteps: [
      { step: 1, title: "Coming soon", description: "We're building this integration. You'll be notified when it's ready." },
    ],
  },
  {
    id: "google_business",
    name: "Google Business Profile",
    tagline: "Get found on Google Search & Maps",
    description: "Keep your Google listing updated with current menu, hours, and photos. Respond to reviews from your Speedo Bill dashboard.",
    icon: <Globe className="h-6 w-6" />,
    category: "marketing",
    status: "coming_soon",
    color: "text-yellow-500",
    whyUse: "Most customers search 'restaurants near me' on Google. An updated Google profile with your menu and photos brings more walk-in and online customers.",
    features: ["Auto-sync menu to Google", "Update business hours", "Photo management", "Review management", "Search insights"],
    setupSteps: [
      { step: 1, title: "Coming soon", description: "We're building this integration. You'll be notified when it's ready." },
    ],
  },
  {
    id: "google_analytics",
    name: "Google Analytics",
    tagline: "Track your ordering page traffic",
    description: "See how many people visit your ordering page, which items they view, and where they drop off. Data-driven menu optimization.",
    icon: <BarChart3 className="h-6 w-6" />,
    category: "analytics",
    status: "coming_soon",
    color: "text-yellow-600",
    whyUse: "Know which menu items get the most views but fewest orders (maybe price is too high). Know where your customers come from (Google, Instagram, WhatsApp).",
    features: ["Page view tracking", "Menu item click tracking", "Conversion rates", "Traffic source analysis"],
    setupSteps: [
      { step: 1, title: "Coming soon", description: "We're building this integration. You'll be notified when it's ready." },
    ],
  },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  delivery: { label: "Delivery & Orders", icon: <Truck className="h-4 w-4" /> },
  payments: { label: "Payments", icon: <CreditCard className="h-4 w-4" /> },
  marketing: { label: "Marketing", icon: <MessageSquare className="h-4 w-4" /> },
  operations: { label: "Operations", icon: <Settings className="h-4 w-4" /> },
  analytics: { label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
};

const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const filtered = activeTab === "all"
    ? INTEGRATIONS
    : INTEGRATIONS.filter(i => i.category === activeTab);

  const activeCount = INTEGRATIONS.filter(i => i.status === "active").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3 mr-1" /> Active</Badge>;
      case "setup_required":
        return <Badge variant="outline" className="border-primary/30 text-primary"><BookOpen className="h-3 w-3 mr-1" /> Setup Guide</Badge>;
      case "coming_soon":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Coming Soon</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" /> Integrations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your restaurant with delivery platforms, payment gateways & more. Each integration has a step-by-step setup guide.
        </p>
      </div>

      {/* Quick Info */}
      <Card className="glass-card border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">How integrations work</p>
            <p className="text-muted-foreground mt-1">
              Most integrations require you to register on the partner platform first (Zomato, Swiggy, WhatsApp etc.), get API credentials, and then enter them here. Each card below has a detailed setup guide. <strong>{activeCount} integrations</strong> are already active.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">All ({INTEGRATIONS.length})</TabsTrigger>
          {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => {
            const count = INTEGRATIONS.filter(i => i.category === key).length;
            return (
              <TabsTrigger key={key} value={key} className="text-xs flex items-center gap-1">
                {icon} {label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(integration => (
              <Card
                key={integration.id}
                className={`glass-card hover:border-primary/30 transition-all cursor-pointer group ${
                  integration.status === "coming_soon" ? "opacity-60" : ""
                }`}
                onClick={() => setSelectedIntegration(integration)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl bg-muted/50 flex items-center justify-center ${integration.color}`}>
                        {integration.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{integration.name}</h3>
                        <p className="text-[10px] text-muted-foreground">{integration.tagline}</p>
                      </div>
                    </div>
                    {getStatusBadge(integration.status)}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {integration.whyUse}
                  </p>

                  {integration.estimatedTime && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Setup time: ~{integration.estimatedTime}
                    </p>
                  )}

                  <Button
                    variant={integration.status === "active" ? "outline" : integration.status === "coming_soon" ? "ghost" : "default"}
                    size="sm"
                    className="w-full text-xs"
                  >
                    {integration.status === "active" ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> View Details</>
                    ) : integration.status === "coming_soon" ? (
                      <><Clock className="h-3.5 w-3.5 mr-1" /> Coming Soon</>
                    ) : (
                      <><BookOpen className="h-3.5 w-3.5 mr-1" /> View Setup Guide</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedIntegration} onOpenChange={(o) => !o && setSelectedIntegration(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center ${selectedIntegration.color}`}>
                    {selectedIntegration.icon}
                  </div>
                  <div>
                    <p>{selectedIntegration.name}</p>
                    <p className="text-sm text-muted-foreground font-normal">{selectedIntegration.tagline}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {getStatusBadge(selectedIntegration.status)}

                {/* Why use this */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-primary" /> Why use this?
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedIntegration.whyUse}</p>
                </div>

                {/* What it does */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">What it does:</h4>
                  <p className="text-sm text-muted-foreground">{selectedIntegration.description}</p>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Features:</h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {selectedIntegration.features.map(f => (
                      <div key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Setup Guide */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    Step-by-step setup
                    {selectedIntegration.estimatedTime && (
                      <Badge variant="secondary" className="text-[10px] ml-auto font-normal">
                        <Clock className="h-3 w-3 mr-1" /> ~{selectedIntegration.estimatedTime}
                      </Badge>
                    )}
                  </h4>
                  <div className="space-y-3">
                    {selectedIntegration.setupSteps.map(step => (
                      <div key={step.step} className="flex gap-3">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {step.step}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{step.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Portal Link */}
                {selectedIntegration.portalUrl && (
                  <Button
                    variant="outline"
                    className="w-full text-sm"
                    onClick={() => window.open(selectedIntegration.portalUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open {selectedIntegration.portalLabel || "Partner Portal"}
                  </Button>
                )}

                {/* Status-specific footer */}
                {selectedIntegration.status === "active" && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> This integration is active and working
                    </p>
                  </div>
                )}

                {selectedIntegration.status === "coming_soon" && (
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-sm text-muted-foreground">
                      🚧 This integration is under development. We'll notify you when it's ready.
                    </p>
                  </div>
                )}

                {selectedIntegration.status === "setup_required" && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      💡 Follow the steps above to get your API credentials from the partner platform, then enter them here to activate.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;
