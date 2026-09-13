import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const calculators = [
  {
    title: 'Single product',
    body: 'Enter what you paid and what you sold, and see your true cost per kg after trim and waste.',
  },
  {
    title: 'Whole carcass',
    body: 'Break a whole animal into cuts and see the cost and margin on each one.',
  },
  {
    title: 'Manufactured product',
    body: 'Cost burgers, sausages, pies and ready meals from a list of ingredients.',
  },
];

export default function Landing() {
  const { session, loading } = useAuth();

  if (!loading && session) {
    return <Navigate to="/new" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-xl font-bold text-brand-800">CarcassIQ</span>
          <Link
            to="/login"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Know your real cost, before you set your price
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            CarcassIQ is a simple costing tool for butchers, farm shops and small meat businesses.
            Work out true cost per kg after trim and waste, cost a whole carcass across every cut,
            or cost a manufactured product like sausages or pies — in under a minute.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="rounded-md bg-brand-800 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Start your free trial
            </Link>
            <span className="text-sm text-slate-500">No card required to try it</span>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16">
          <div className="grid gap-4 sm:grid-cols-3">
            {calculators.map((c) => (
              <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">{c.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-20">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">Simple pricing</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">
              £9<span className="text-lg font-normal text-slate-500">/month</span>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Free trial, no card required. Cancel anytime.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-md bg-brand-800 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} CarcassIQ</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-brand-800 hover:underline">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-brand-800 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
