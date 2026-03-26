import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

interface Props {
  selectedItems: { id: string; name: string; price: number; quantity: number }[];
  totalAmount: number;
  onViewSelection: () => void;
}

const MenuCartBar = ({ selectedItems, totalAmount, onViewSelection }: Props) => {
  const totalQty = selectedItems.reduce((s, i) => s + i.quantity, 0);
  if (totalQty === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 md:pl-60">
      <div className="mx-auto max-w-lg rounded-2xl bg-primary p-3 text-primary-foreground shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          <span className="text-sm font-bold">{totalQty} items · ₹{totalAmount}</span>
        </div>
        <Button size="sm" variant="secondary" onClick={onViewSelection}>
          View Selection
        </Button>
      </div>
    </div>
  );
};

export default MenuCartBar;
