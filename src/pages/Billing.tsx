import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../lib/useSubscription';

function hoursRemaining(trialEnd: string | null): number {
  if (!trialEnd) return 0;
  return Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (60 * 60 * 1000)));
}

export default function Billing() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const { status, trialEnd, currentPeriodEnd, trialActive, loading, refresh } = useSubscription();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkoutResult = searchParams.get('checkout');

  async function callBillingApi(path: '/api/create-checkout-session' | '/api/create-portal-session') {
    if (!session) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json();
      if (!res.ok || !body.url) {
        setError(body.error ?? 'Something went wrong. Please try again.');
        setWorking(false);
        return;
      }
      window.location.href = body.url;
    } catch {
      setError('Could not reach the billing service. Please try again.');
      setWorking(false);
    }
  }

  if (loading) {
    return <p className="text-slate-500">Loading...</p>;
  }

  const canManage = status === 'active' || status === 'past_due';

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Billing</h1>

      {checkoutResult === 'success' && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Payment received — thanks! It can take a few seconds to update below;{' '}
          <button onClick={() => refresh()} className="font-medium underline">
            refresh
          </button>{' '}
          if it still shows as unpaid.
        </div>
      )}
      {checkoutResult === 'cancelled' && (
        <div className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Checkout was cancelled — no charge was made.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {status === 'active' && (
          <>
            <p className="text-sm font-medium text-emerald-700">Your subscription is active.</p>
            {currentPeriodEnd && (
              <p className="mt-1 text-sm text-slate-500">
                Renews {new Date(currentPeriodEnd).toLocaleDateString('en-GB')}.
              </p>
            )}
          </>
        )}

        {status === 'past_due' && (
          <>
            <p className="text-sm font-medium text-red-700">Your last payment failed.</p>
            <p className="mt-1 text-sm text-slate-500">
              Update your payment method below to keep your subscription active.
            </p>
          </>
        )}

        {status === 'canceled' && (
          <p className="text-sm font-medium text-slate-700">Your subscription has been cancelled.</p>
        )}

        {trialActive && (
          <>
            <p className="text-sm font-medium text-brand-800">You're on a free trial.</p>
            <p className="mt-1 text-sm text-slate-500">
              {hoursRemaining(trialEnd)} hour{hoursRemaining(trialEnd) === 1 ? '' : 's'} left.
            </p>
          </>
        )}

        {status === 'none' && !trialActive && (
          <p className="text-sm font-medium text-slate-700">No active trial or subscription.</p>
        )}

        {status === 'trialing' && !trialActive && (
          <p className="text-sm font-medium text-red-700">Your free trial has ended.</p>
        )}

        <p className="mt-4 text-2xl font-bold text-slate-900">
          £9<span className="text-base font-normal text-slate-500">/month</span>
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4">
          {canManage ? (
            <button
              onClick={() => callBillingApi('/api/create-portal-session')}
              disabled={working}
              className="rounded-md bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {working ? 'Loading...' : 'Manage billing'}
            </button>
          ) : (
            <button
              onClick={() => callBillingApi('/api/create-checkout-session')}
              disabled={working}
              className="rounded-md bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {working ? 'Loading...' : 'Subscribe — £9/month'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
