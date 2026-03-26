import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: { id: string; name: string; price: number; quantity: number }[];
  totalAmount: number;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onConfirm: () => void;
}

const MenuSelectionSheet = ({ open, onOpenChange, selectedItems, totalAmount, onRemoveItem, onClearAll, onConfirm }: Props) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Selected Items</SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-3 flex-1 overflow-y-auto">
        {selectedItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">₹{item.price} × {item.quantity}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">₹{item.price * item.quantity}</span>
              <button onClick={() => onRemoveItem(item.id)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>₹{totalAmount}</span>
        </div>
        <Button className="w-full" onClick={onConfirm}>Confirm Selection</Button>
        <Button variant="outline" className="w-full" onClick={onClearAll}>Clear All</Button>
      </div>
    </SheetContent>
  </Sheet>
);

export default MenuSelectionSheet;
