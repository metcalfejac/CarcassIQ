import { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ScaleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path d="M12 3v18" strokeLinecap="round" />
      <path d="M5 7h14" strokeLinecap="round" />
      <path d="M5 7 2.5 13a2.5 2.5 0 0 0 5 0L5 7Z" strokeLinejoin="round" />
      <path d="M19 7l-2.5 6a2.5 2.5 0 0 0 5 0L19 7Z" strokeLinejoin="round" />
      <path d="M9 21h6" strokeLinecap="round" />
    </svg>
  );
}

function CutsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M9 10v10.5" />
      <path d="M15 3.5V10" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" strokeLinejoin="round" />
      <path d="M4 7l8 4 8-4" strokeLinejoin="round" />
      <path d="M12 11v10" />
    </svg>
  );
}

const calculators: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Single product',
    body: 'Enter what you paid and what you sold, and see your true cost per kg after trim and waste.',
    icon: <ScaleIcon />,
  },
  {
    title: 'Whole carcass',
    body: 'Break a whole animal into cuts and see the cost and margin on each one.',
    icon: <CutsIcon />,
  },
  {
    title: 'Manufactured product',
    body: 'Cost burgers, sausages, pies and ready meals from a list of ingredients.',
    icon: <PackageIcon />,
  },
];

const steps = [
  {
    title: 'Enter what you paid',
    body: 'Purchase weight and price per kg — for a single cut, a whole carcass, or a batch of ingredients.',
  },
  {
    title: 'Enter what you got out',
    body: 'Saleable weight, trim, and waste. CarcassIQ works out your real yield automatically.',
  },
  {
    title: 'See your true cost & margin',
    body: 'Instantly get your true cost per kg, your margin at your current price, and what to charge to hit your target.',
  },
];

const included = [
  'Single product, whole carcass & manufactured product costing',
  'Saved costings and supplier history',
  'Autocomplete from things you’ve entered before',
  'kg / lb weight toggle for manufactured products',
  'Works on your phone, tablet or laptop',
];

const faqs = [
  {
    q: 'Do I need a card to try it?',
    a: 'No. You get a free trial with no card required. If you want to keep using CarcassIQ afterwards, you can add a card from the Billing page.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Billing is handled through Stripe’s secure customer portal, and you can cancel whenever you like from the Billing page in the app.',
  },
  {
    q: 'What units does it use?',
    a: 'Everything is priced in GBP and weighed in kg by default, with an optional lb toggle for the manufactured product calculator.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your costings and supplier data belong to your account only — no one else using CarcassIQ can see them.',
  },
];

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M5 12h14" strokeLinecap="round" />
      <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExampleCard() {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-lg shadow-slate-200/60">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Worked example</p>
      <p className="mt-1 text-sm text-slate-500">Whole sirloin, purchased for £16.00/kg</p>
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-sm text-slate-600">Purchase weight</span>
          <span className="text-sm font-medium text-slate-900">4.5 kg</span>
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-sm text-slate-600">Saleable weight after trim</span>
          <span className="text-sm font-medium text-slate-900">3.7 kg</span>
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-sm text-slate-600">True usable cost/kg</span>
          <span className="text-sm font-medium text-slate-900">£19.46</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Gross margin at £28.00/kg</span>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-800">32.4%</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { session, loading } = useAuth();

  if (!loading && session) {
    return <Navigate to="/new" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-xl font-bold text-brand-800">CarcassIQ</span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="hidden rounded-md bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:inline-block"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-x-0 -top-24 -z-10 mx-auto h-72 max-w-3xl rounded-full bg-brand-100/60 blur-3xl"
          />
          <div className="mx-auto max-w-3xl px-4 pb-4 pt-16 text-center sm:pt-20">
            <p className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
              For butchers, farm shops &amp; small meat businesses
            </p>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Know your real cost, before you set your price
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
              Work out true cost per kg after trim and waste, cost a whole carcass across every cut,
              or cost a manufactured product like sausages or pies — in under a minute.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-md bg-brand-800 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Start your free trial
                <ArrowRightIcon />
              </Link>
              <span className="text-sm text-slate-500">No card required to try it</span>
            </div>
            <ExampleCard />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Three ways to cost your meat</h2>
            <p className="mt-3 text-slate-600">
              Whichever way you buy it in — one cut at a time, by the whole carcass, or as ingredients
              for a batch — CarcassIQ has a calculator built for it.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {calculators.map((c) => (
              <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
                  {c.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">How it works</h2>
              <p className="mt-3 text-slate-600">No spreadsheets, no formulas to remember.</p>
            </div>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {steps.map((step, i) => (
                <div key={step.title} className="relative pl-12 sm:pl-0 sm:text-center">
                  <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white sm:static sm:mx-auto">
                    {i + 1}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 sm:mt-4">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Simple pricing</p>
            <p className="mt-3 text-5xl font-bold text-slate-900">
              £9<span className="text-lg font-normal text-slate-500">/month</span>
            </p>
            <p className="mt-2 text-sm text-slate-600">Free trial, no card required. Cancel anytime.</p>
            <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
                  >
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/login"
              className="mt-8 inline-block rounded-md bg-brand-800 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Get started
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-20">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Common questions</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-slate-200 bg-white p-5 open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-900">
                  {faq.q}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-45"
                  >
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-brand-800">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Stop guessing your margins</h2>
            <p className="mt-3 text-brand-100">
              Start your free trial today and know exactly what your meat really costs.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-md bg-white px-6 py-3 text-sm font-semibold text-brand-800 shadow-sm hover:bg-brand-50"
            >
              Start your free trial
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
