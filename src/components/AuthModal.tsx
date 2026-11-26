import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthModalProps {
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
}

export function AuthModal({ onClose, onGoogleSignIn }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
        await sendEmailVerification(credential.user);
        setMessage('Account created. A verification link has been sent to your email.');
      } else if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onClose();
      } else {
        await sendPasswordResetEmail(auth, email.trim());
        setMessage('Password reset link sent. Check your email.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/55 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="feggy-auth-title">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Close sign in" className="absolute right-4 top-4 text-slate-500 hover:text-slate-900 text-2xl leading-none">×</button>
        <p className="text-xs font-bold uppercase tracking-widest text-green-800">FEGGY FOODSTUFF</p>
        <h2 id="feggy-auth-title" className="mt-2 text-2xl font-bold text-slate-900">
          {mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}
        </h2>
        <p className="mt-1 text-sm text-slate-600">Sign in to manage orders and Pay Small Small plans.</p>

        <button type="button" onClick={async () => { setBusy(true); setMessage(''); try { await onGoogleSignIn(); onClose(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Google sign-in failed.'); } finally { setBusy(false); } }} disabled={busy} className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60">
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />OR USE EMAIL<span className="h-px flex-1 bg-slate-200" /></div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" required className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700" />}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" required className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700" />
          {mode !== 'reset' && <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (at least 6 characters)" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700" />}
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60">
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in with email'}
          </button>
        </form>

        {message && <p role="status" className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900 break-words">{message}</p>}

        <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
          {mode !== 'signup' && <button type="button" onClick={() => { setMode('signup'); setMessage(''); }} className="font-semibold text-green-800">Create account</button>}
          {mode !== 'signin' && <button type="button" onClick={() => { setMode('signin'); setMessage(''); }} className="font-semibold text-green-800">Back to sign in</button>}
          {mode === 'signin' && <button type="button" onClick={() => { setMode('reset'); setMessage(''); }} className="text-slate-600 hover:text-green-800">Forgot password?</button>}
        </div>
      </div>
    </div>
  );
}
