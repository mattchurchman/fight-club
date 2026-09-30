import type { Corner, FirstBloodPick } from '@shared/index.ts';
import { Card } from '../../components/ui/Card.tsx';
import { Chip } from '../../components/ui/Chip.tsx';
import type { BoutWithId } from '../events/hooks.ts';

interface FirstBloodPickerProps {
  bouts: BoutWithId[];
  activeIds: readonly string[];
  value: FirstBloodPick | null;
  readOnly: boolean;
  errorMessage?: string;
  onChange: (boutId: string, fighter: Corner) => void;
}

/** docs/GAME_RULES.md §3/§4.6: entry-level prop, independent of who wins. Only shown when enabled. */
export function FirstBloodPicker({
  bouts,
  activeIds,
  value,
  readOnly,
  errorMessage,
  onChange,
}: FirstBloodPickerProps) {
  const active = bouts.filter((bout) => activeIds.includes(bout.id));
  const selectedBout = active.find((bout) => bout.id === value?.boutId) ?? null;

  return (
    <Card className="mx-4 flex flex-col gap-3">
      <div>
        <p className="font-display text-sm uppercase tracking-wide text-text">First Blood</p>
        <p className="text-xs text-muted">Who draws first blood — independent of who wins.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {active.map((bout) => (
          <Chip
            key={bout.id}
            selected={value?.boutId === bout.id}
            disabled={readOnly}
            onSelect={() => onChange(bout.id, value?.boutId === bout.id ? value.fighter : 'A')}
          >
            {bout.a.name} / {bout.b.name}
          </Chip>
        ))}
      </div>
      {selectedBout ? (
        <div className="flex gap-2">
          <Chip
            selected={value?.fighter === 'A'}
            disabled={readOnly}
            onSelect={() => onChange(selectedBout.id, 'A')}
          >
            {selectedBout.a.name}
          </Chip>
          <Chip
            selected={value?.fighter === 'B'}
            disabled={readOnly}
            onSelect={() => onChange(selectedBout.id, 'B')}
          >
            {selectedBout.b.name}
          </Chip>
        </div>
      ) : null}
      {errorMessage ? <p className="text-xs text-loss">{errorMessage}</p> : null}
    </Card>
  );
}
