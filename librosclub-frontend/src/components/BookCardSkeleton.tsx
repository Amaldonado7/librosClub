import React from 'react';

const BookCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex gap-4">
        <div className="w-20 h-28 shimmer rounded-md" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-3/4 shimmer rounded" />
          <div className="h-4 w-1/2 shimmer rounded" />
          <div className="h-6 w-20 shimmer rounded-full" />
          <div className="h-3 w-full shimmer rounded" />
        </div>
      </div>
    </div>
  );
};

export const BooksGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
    {Array.from({ length: count }).map((_, i) => (
      <BookCardSkeleton key={i} />
    ))}
  </div>
);

export default BookCardSkeleton;
