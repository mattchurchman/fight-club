import { useState } from 'react';
import clsx from 'clsx';

interface AvatarProps {
  name: string;
  src?: string;
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

export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <span
      className={clsx(
        'octagon inline-flex shrink-0 items-center justify-center overflow-hidden',
        'bg-surface-2 text-text',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="octagon size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span aria-label={name} className="font-display">
          {getInitials(name)}
        </span>
      )}
    </span>
  );
}
