export function SkeletonCard() {
  return (
    <div className="card skeleton" aria-hidden="true">
      <div className="skeleton-line short" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
    </div>
  );
}
