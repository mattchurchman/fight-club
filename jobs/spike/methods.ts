// T02 probe: walk completed events and collect the distinct `status.result` vocabulary. Throwaway.
// usage: npm run job -- jobs/spike/methods.ts <eventId> [<eventId> ...]
const CORE = 'https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc';
const UA = { 'User-Agent': 'fight-club-private/1.0' };

type Competition = { id: string; competitors?: { winner?: boolean }[] };
type Event = { competitions?: Competition[] };
type Status = {
  period?: number;
  displayClock?: string;
  result?: {
    id: number;
    name: string;
    displayName: string;
    shortDisplayName?: string;
    description?: string;
  };
};

const get = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
};

type Row = { key: string; count: number; sample: string };
const seen = new Map<string, Row>();
let bouts = 0;
let noResult = 0;

for (const eventId of process.argv.slice(2)) {
  const ev = await get<Event>(`${CORE}/events/${eventId}`);
  for (const comp of ev.competitions ?? []) {
    bouts++;
    const st = await get<Status>(`${CORE}/events/${eventId}/competitions/${comp.id}/status`);
    const r = st.result;
    if (!r) {
      noResult++;
      continue;
    }
    const key = `${r.id}|${r.name}|${r.displayName}|${r.shortDisplayName ?? ''}`;
    const winners = (comp.competitors ?? []).filter((c) => c.winner).length;
    const row = seen.get(key) ?? {
      key,
      count: 0,
      sample: `${eventId}/${comp.id} p${st.period} ${st.displayClock} winners=${winners} desc=${r.description ?? '-'}`,
    };
    row.count++;
    seen.set(key, row);
  }
}

console.log(`bouts=${bouts} withoutResult=${noResult}`);
for (const r of [...seen.values()].sort((a, b) => b.count - a.count)) {
  console.log(`${String(r.count).padStart(3)}  ${r.key}   e.g. ${r.sample}`);
}
