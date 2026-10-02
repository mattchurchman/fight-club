import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import { auth } from '../../lib/firebase.ts';
import { isMobile } from '../install/useInstallPrompt.ts';
import { mapAuthError } from './authErrors.ts';
import { useSession } from './SessionProvider.tsx';

type Mode = 'signIn' | 'signUp';

const inputClasses =
  'min-h-11 rounded-xl border border-line bg-surface-2 px-3 text-text placeholder:text-muted';

export function LoginPage() {
  const { status } = useSession();
  const navigate = useNavigate();
  const { show } = useToast();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once auth resolves, everything past "signedOut" belongs on other screens (the gate in
  // src/app/RouteGuards.tsx renders them), so bounce away from the login form.
  useEffect(() => {
    if (status !== 'signedOut' && status !== 'loading') navigate('/', { replace: true });
  }, [status, navigate]);

  useEffect(() => {
    getRedirectResult(auth).catch((err: unknown) => {
      const code = (err as { code?: string }).code;
      if (code) setError(mapAuthError(code));
    });
  }, []);

  async function withBusy(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(mapAuthError((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  }

  const onGoogle = () =>
    withBusy(async () => {
      const provider = new GoogleAuthProvider();
      // signInWithPopup is unreliable on mobile browsers (not just an installed iOS PWA) — the
      // popup/opener handoff silently breaks under iOS Safari's storage restrictions. Redirect
      // everywhere on mobile; popup stays on desktop for the nicer no-navigation UX.
      if (isMobile()) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void withBusy(async () => {
      if (mode === 'signIn') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    });
  };

  const onForgotPassword = () => {
    if (!email) {
      setError(mapAuthError('auth/missing-email'));
      return;
    }
    void withBusy(async () => {
      await sendPasswordResetEmail(auth, email);
      show('Password reset email sent.', { variant: 'success' });
    });
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="font-display text-3xl uppercase text-text">Fight Club</h1>
        <p className="text-sm text-muted">Invite only. Sign in to continue.</p>
      </div>

      <Card className="flex flex-col gap-4">
        <Button type="button" variant="secondary" loading={busy} onClick={onGoogle}>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase text-muted">
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          or
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </div>

        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClasses}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Password
            <input
              type="password"
              required
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClasses}
            />
          </label>

          {error ? (
            <p className="text-sm text-loss" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" loading={busy}>
            {mode === 'signIn' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="min-h-11 text-muted underline"
            onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          >
            {mode === 'signIn' ? 'Need an account?' : 'Have an account?'}
          </button>
          <button type="button" className="min-h-11 text-muted underline" onClick={onForgotPassword}>
            Forgot password?
          </button>
        </div>
      </Card>
    </div>
  );
}
