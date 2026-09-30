import { useState } from 'react';
import { Button } from '../../components/ui/Button.tsx';
import { Tabs } from '../../components/ui/Tabs.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import { InvitesSection } from './InvitesSection.tsx';
import { PeopleSection } from './PeopleSection.tsx';
import { useAllUsers, useAllowlist } from './hooks.ts';
import { postPendingStartingGrants } from './postStartingGrants.ts';

type Tab = 'invites' | 'people';

function PostStartingGrantsButton() {
  const { user } = useSession();
  const { users, loading: usersLoading } = useAllUsers();
  const { entries, loading: entriesLoading } = useAllowlist();
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState('');

  const handleClick = async () => {
    if (!user?.uid) return;
    setPosting(true);
    setMessage('');
    try {
      const posted = await postPendingStartingGrants(users, entries, user.uid);
      setMessage(posted === 0 ? 'Everyone is already granted.' : `Posted ${posted} starting grant${posted === 1 ? '' : 's'}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to post starting grants.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        onClick={handleClick}
        disabled={posting || usersLoading || entriesLoading}
        className="min-h-9 self-start px-3 text-xs"
      >
        {posting ? 'Posting…' : 'Post pending starting grants'}
      </Button>
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}

export function PeoplePage() {
  const [tab, setTab] = useState<Tab>('invites');
  const { users, loading: usersLoading } = useAllUsers();

  return (
    <div className="flex flex-col gap-4 p-4">
      <PostStartingGrantsButton />

      <Tabs
        items={[
          { value: 'invites', label: 'Invites' },
          { value: 'people', label: 'People' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
      />

      {tab === 'invites' ? (
        <InvitesSection users={users} usersLoading={usersLoading} />
      ) : (
        <PeopleSection users={users} loading={usersLoading} />
      )}
    </div>
  );
}
