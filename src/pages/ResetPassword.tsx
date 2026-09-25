import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(password);
    if (result.error) {
      setError(
        result.error.toLowerCase().includes('session')
          ? 'This reset link has expired or has already been used. Please request a new one.'
          : result.error
      );
    } else {
      setDone(true);
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-800">CarcassIQ</h1>

        {done ? (
          <>
            <p className="mt-1 text-sm text-slate-500">Your password has been updated.</p>
            <Link
              to="/new"
              className="mt-6 inline-block w-full rounded-md bg-brand-800 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
            >
              Continue to CarcassIQ
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">Choose a new password</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">New password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Confirm new password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Update password
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-slate-400">
              Trouble with your link?{' '}
              <Link to="/login" className="underline hover:text-brand-800">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
