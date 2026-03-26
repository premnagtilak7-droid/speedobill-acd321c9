import { ReactNode } from "react";

interface Props {
  items: any[];
  renderItem: (item: any) => ReactNode;
  className?: string;
}

const DenseMenuGrid = ({ items, renderItem, className }: Props) => (
  <div className={`grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${className || ""}`}>
    {items.map((item) => renderItem(item))}
  </div>
);

export default DenseMenuGrid;
