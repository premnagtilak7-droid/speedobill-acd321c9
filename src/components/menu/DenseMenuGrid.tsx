import { ReactNode } from "react";

interface Props {
  items: any[];
  renderItem: (item: any) => ReactNode;
  className?: string;
  size?: "compact" | "visual";
}

const DenseMenuGrid = ({ items, renderItem, className, size = "visual" }: Props) => (
  <div className={`grid ${
    size === "compact"
      ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
      : "grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
  } ${className || ""}`}>
    {items.map((item) => renderItem(item))}
  </div>
);

export default DenseMenuGrid;
