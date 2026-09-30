import { useState } from 'react';
import clsx from 'clsx';

type Corner = 'red' | 'blue' | 'none';

interface AvatarProps {
  name: string;
  src?: string;
  corner?: Corner;
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

const ringClasses: Record<Corner, string> = {
  red: 'ring-red',
  blue: 'ring-blue',
  none: 'ring-line',
};

export function Avatar({ name, src, corner = 'none', size = 40, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-surface-2 font-semibold text-text ring-2',
        ringClasses[corner],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={name}>{getInitials(name)}</span>
      )}
    </span>
  );
}
