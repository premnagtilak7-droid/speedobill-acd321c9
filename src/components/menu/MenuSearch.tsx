import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Props { query: string; onChange: (q: string) => void; }

const MenuSearch = ({ query, onChange }: Props) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      value={query}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search menu..."
      className="pl-9 h-9 text-sm"
    />
  </div>
);

export default MenuSearch;
