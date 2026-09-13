import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { SubscriptionStatus } from './types';

export interface SubscriptionState {
  status: SubscriptionStatus | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  loading: boolean;
}

const emptyState: SubscriptionState = {
  status: null,
  trialEnd: null,
  currentPeriodEnd: null,
  loading: true,
};

/** Loads the signed-in user's billing status. If no subscription row exists
 *  yet (first time this session has seen this user), asks the server to
 *  start a trial — eligibility (disposable email, IP throttling) is decided
 *  server-side, never trusted from the client. */
export function useSubscription() {
  const { session } = useAuth();
  const [state, setState] = useState<SubscriptionState>(emptyState);

  const refresh = useCallback(async () => {
    if (!session) {
      setState(emptyState);
      return;
    }

    const { data } = await supabase
      .from('subscriptions')
      .select('status, trial_end, current_period_end')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!data) {
      try {
        await fetch('/api/start-trial', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      } catch {
        // Network error reaching the trial endpoint — user just sees 'none'.
      }
      const { data: retried } = await supabase
        .from('subscriptions')
        .select('status, trial_end, current_period_end')
        .eq('user_id', session.user.id)
        .maybeSingle();

      setState({
        status: (retried?.status as SubscriptionStatus) ?? 'none',
        trialEnd: retried?.trial_end ?? null,
        currentPeriodEnd: retried?.current_period_end ?? null,
        loading: false,
      });
      return;
    }

    setState({
      status: (data.status as SubscriptionStatus) ?? 'none',
      trialEnd: data.trial_end ?? null,
      currentPeriodEnd: data.current_period_end ?? null,
      loading: false,
    });
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const trialActive = state.status === 'trialing' && !!state.trialEnd && new Date(state.trialEnd).getTime() > Date.now();
  const hasAccess = state.status === 'active' || trialActive;

  return { ...state, trialActive, hasAccess, refresh };
}
