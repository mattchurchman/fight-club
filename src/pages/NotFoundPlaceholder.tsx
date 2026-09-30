import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';

export function NotFoundPlaceholder() {
  return (
    <EmptyState
      title="404"
      description="That page doesn't exist."
      action={
        <Link to="/" className="text-sm font-semibold text-red">
          Back to Fights
        </Link>
      }
    />
  );
}
