import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface Props { compact?: boolean; hotelId: string; existingCategories: string[]; onComplete: () => void; }

const AiMenuScanner = ({ compact }: Props) => (
  <Button variant="outline" size="sm" className={compact ? "h-8 text-xs gap-1" : "gap-1"}>
    <Sparkles className="h-3.5 w-3.5" /> {compact ? "AI Scan" : "AI Scanner"}
  </Button>
);

export default AiMenuScanner;
