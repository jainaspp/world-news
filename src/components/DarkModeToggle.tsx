interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function DarkModeToggle({ checked, onChange }: Props) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-pressed={checked}
      aria-label={checked ? '切換至淺色模式' : '切換至深色模式'}
      onClick={() => onChange(!checked)}
    >
      {checked ? (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
