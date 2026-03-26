import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
  image_url?: string;
}

interface Props {
  item: MenuItem;
  quantity: number;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showManagement?: boolean;
  dimmed?: boolean;
  size?: "compact" | "visual";
}

const DenseMenuCard = ({ item, quantity, onClick, onEdit, onDelete, showManagement, dimmed, size = "visual" }: Props) => {
  const isCompact = size === "compact";

  return (
    <div
      className={`relative rounded-xl border bg-card overflow-hidden transition-all duration-150 cursor-pointer select-none ${
        dimmed ? "opacity-50" : ""
      } ${quantity > 0 ? "border-primary/40 ring-1 ring-primary/20" : "border-border hover:border-primary/20 hover:shadow-sm"}`}
      onClick={onClick}
    >
      {/* Image area - always show */}
      <div className={`w-full bg-muted/50 ${isCompact ? "h-20" : "aspect-square"}`}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl opacity-30">🍽️</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={`${isCompact ? "p-1.5" : "p-2.5"}`}>
        <p className={`font-semibold leading-tight truncate ${isCompact ? "text-[11px]" : "text-[13px]"}`}>
          {item.name}
        </p>
        <p className={`text-primary font-bold mt-0.5 ${isCompact ? "text-[10px]" : "text-[12px]"}`}>
          ₹{item.price}
        </p>
        {!item.is_available && (
          <Badge variant="destructive" className="text-[8px] px-1 py-0 mt-1">Unavailable</Badge>
        )}
      </div>

      {/* Quantity badge */}
      {quantity > 0 && (
        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-qty-badge-in">
          {quantity}
        </div>
      )}

      {/* Management buttons */}
      {showManagement && (
        <div className="absolute top-1 right-1 flex gap-0.5">
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="h-5 w-5 rounded bg-background/80 flex items-center justify-center hover:bg-primary/10">
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="h-5 w-5 rounded bg-background/80 flex items-center justify-center hover:bg-destructive/10">
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DenseMenuCard;
