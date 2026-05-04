import React from 'react';

const BookCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <div className="aspect-[2/3] shimmer" />
    <div className="p-3 space-y-2">
      <div className="h-3 w-3/4 shimmer rounded" />
      <div className="h-3 w-1/2 shimmer rounded" />
    </div>
  </div>
);

export const BooksGridSkeleton: React.FC<{ count?: number }> = ({ count = 10 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <BookCardSkeleton key={i} />
    ))}
  </div>
);

export default BookCardSkeleton;
