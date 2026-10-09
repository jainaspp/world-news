/** Smooth scroll unless the reader asked for reduced motion. */
export function scrollBehavior(reduced = prefersReducedMotion()): ScrollBehavior {
  return reduced ? 'auto' : 'smooth';
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
