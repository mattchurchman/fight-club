interface BrandProps {
  className?: string;
}

export function Lockup({ className }: BrandProps) {
  return <img src="/brand/logo-lockup.svg" alt="Fight Club" className={className} />;
}

export function Coin({ className }: BrandProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      <polygon
        points="30.00,10.00 70.00,10.00 90.00,30.00 90.00,70.00 70.00,90.00 30.00,90.00 10.00,70.00 10.00,30.00"
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinejoin="miter"
      />
      <polygon points="42.50,35.00 57.50,35.00 65.00,42.50 65.00,57.50 57.50,65.00 42.50,65.00 35.00,57.50 35.00,42.50" />
    </svg>
  );
}
