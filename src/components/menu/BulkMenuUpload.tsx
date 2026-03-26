import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface Props { compact?: boolean; hotelId: string; existingCategories: string[]; onComplete: () => void; }

const BulkMenuUpload = ({ compact }: Props) => (
  <Button variant="outline" size="sm" className={compact ? "h-8 text-xs gap-1" : "gap-1"}>
    <Upload className="h-3.5 w-3.5" /> {compact ? "CSV Upload" : "Bulk Upload"}
  </Button>
);

export default BulkMenuUpload;
