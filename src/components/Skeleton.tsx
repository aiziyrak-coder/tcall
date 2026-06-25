"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden />;
}

export function ChatConvSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="chat-conv-list" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="skeleton-conv-item">
          <Skeleton className="skeleton-avatar" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="skeleton-line skeleton-line-md" />
            <Skeleton className="skeleton-line skeleton-line-sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="ios-list" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="ios-list-item skeleton-list-item">
          <Skeleton className="skeleton-icon" />
          <div className="flex-1 space-y-2">
            <Skeleton className="skeleton-line skeleton-line-md" />
            <Skeleton className="skeleton-line skeleton-line-sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}
