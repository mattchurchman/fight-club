import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Stepper } from '../../components/ui/Stepper';
import { Avatar } from '../../components/ui/Avatar';
import { Sheet } from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/Toast';
import { Skeleton } from '../../components/ui/Skeleton';
import { Countdown } from '../../components/ui/Countdown';
import { TokenPill } from '../../components/ui/TokenPill';
import { EmptyState } from '../../components/ui/EmptyState';
import { Tabs } from '../../components/ui/Tabs';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-line py-6 first:pt-0">
      <h2 className="font-display text-lg uppercase text-muted">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export function UiGallery() {
  const [chipSelected, setChipSelected] = useState(false);
  const [stake, setStake] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState('one');
  const [countdownTarget] = useState(() => Date.now() + 2 * 60 * 60 * 1000 + 14 * 60 * 1000);
  const { show } = useToast();

  return (
    <div className="flex flex-col gap-2 p-4">
      <h1 className="font-display text-2xl uppercase">UI Gallery</h1>

      <Section title="Button">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button loading>Loading</Button>
      </Section>

      <Section title="Card">
        <Card>A card with some content.</Card>
      </Section>

      <Section title="Chip">
        <Chip selected={chipSelected} onSelect={() => setChipSelected((v) => !v)}>
          KO/TKO
        </Chip>
      </Section>

      <Section title="Stepper">
        <Stepper value={stake} min={0} max={1000} onChange={setStake} />
      </Section>

      <Section title="Avatar">
        <Avatar name="Matt Churchman" corner="red" />
        <Avatar name="Jane Doe" corner="blue" />
        <Avatar name="No Image" src="/does-not-exist.png" corner="none" />
      </Section>

      <Section title="Sheet">
        <Button onClick={() => setSheetOpen(true)}>Open sheet</Button>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Bottom sheet">
          <p className="text-sm text-muted">Sheet content goes here.</p>
        </Sheet>
      </Section>

      <Section title="Toast">
        <Button onClick={() => show('Picks locked. No take-backs.', { variant: 'success' })}>
          Success toast
        </Button>
        <Button onClick={() => show('You’re broke. Beg the admin.', { variant: 'error' })}>
          Error toast
        </Button>
      </Section>

      <Section title="Skeleton">
        <Skeleton className="h-10 w-32" />
      </Section>

      <Section title="Countdown">
        <Countdown target={countdownTarget} />
      </Section>

      <Section title="TokenPill">
        <TokenPill balance={850} />
      </Section>

      <Section title="EmptyState">
        <EmptyState title="Nothing here" description="Example empty state." />
      </Section>

      <Section title="Tabs">
        <Tabs
          items={[
            { value: 'one', label: 'One' },
            { value: 'two', label: 'Two' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Section>
    </div>
  );
}
