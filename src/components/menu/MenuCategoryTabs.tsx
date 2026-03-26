import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Props {
  categories: string[];
  activeCategory: string;
  onSelect: (cat: string) => void;
  itemCounts: Record<string, number>;
}

const MenuCategoryTabs = ({ categories, activeCategory, onSelect, itemCounts }: Props) => {
  const allCount = Object.values(itemCounts).reduce((a, b) => a + b, 0);

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-1.5 pb-1">
        <button
          onClick={() => onSelect("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          All ({allCount})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {cat} ({itemCounts[cat] || 0})
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default MenuCategoryTabs;
