export function SkeletonCard() {
  return (
    <div className="story skeleton" aria-hidden="true">
      <div className="thumb thumb-fallback" />
      <div className="story-body">
        <div className="skeleton-line short" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
      </div>
    </div>
  );
}
