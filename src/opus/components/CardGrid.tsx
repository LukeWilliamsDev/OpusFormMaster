import React, { ReactNode } from "react";

interface CardGridProps<T> {
  items: T[];
  renderCard: (item: T, index: number) => ReactNode;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  loading?: boolean;
  className?: string;
}

/**
 * Reusable card grid component for consistent layouts
 * Eliminates repetitive grid + card + empty state patterns
 */
export const CardGrid = <T,>({
  items,
  renderCard,
  emptyMessage = "No items found",
  emptyIcon,
  loading,
  className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
}: CardGridProps<T>) => {
  if (loading) {
    return (
      <div className={className}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-32" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
        {emptyIcon && <div className="mb-3 flex justify-center">{emptyIcon}</div>}
        <p className="font-semibold text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return <div className={className}>{items.map((item, i) => renderCard(item, i))}</div>;
};
