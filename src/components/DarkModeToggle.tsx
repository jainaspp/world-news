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
      {checked ? '淺色' : '深色'}
    </button>
  );
}
