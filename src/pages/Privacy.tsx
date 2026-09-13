import LegalPageLayout, { Section } from '../components/LegalPageLayout';

export default function Privacy() {
  return (
    <LegalPageLayout title="Privacy Policy" updated="13 September 2026">
      <Section heading="1. Who we are">
        <p>
          CarcassIQ is a costing tool for butchers, farm shops and small meat businesses. This
          policy explains what data we collect when you use it, why, and what your rights are. If
          you have questions, email{' '}
          <a href="mailto:metcalfejac@gmail.com" className="text-brand-800 underline">
            metcalfejac@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section heading="2. What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account details</strong> — your email address and password (your password is
            never visible to us; it's handled securely by our authentication provider).
          </li>
          <li>
            <strong>Costing data you enter</strong> — product names, suppliers, weights, prices,
            ingredients and margins you record while using the Service.
          </li>
          <li>
            <strong>Billing information</strong> — handled entirely by our payment processor,
            Stripe. We never see or store your card details ourselves; we only hold your
            subscription status and Stripe's reference IDs for your account.
          </li>
          <li>
            <strong>Technical data</strong> — your IP address is checked briefly when you sign up,
            purely to prevent repeated free-trial abuse. We don't otherwise track or log your
            browsing activity.
          </li>
        </ul>
      </Section>

      <Section heading="3. How we use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>to provide and operate the Service you've signed up for;</li>
          <li>to process your subscription payments;</li>
          <li>to send service-related emails (e.g. account confirmation, billing receipts); and</li>
          <li>to prevent abuse of the free trial.</li>
        </ul>
        <p>We don't use your data for advertising, and we don't sell it to anyone.</p>
      </Section>

      <Section heading="4. Who we share it with">
        <p>
          We use a small number of trusted providers to run CarcassIQ, each of whom processes data
          on our behalf under their own security and privacy commitments:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong> — our database and authentication provider, storing your
            account and costing data.
          </li>
          <li>
            <strong>Stripe</strong> — our payment processor, handling your subscription and card
            details.
          </li>
          <li>
            <strong>Vercel</strong> — hosts the application itself.
          </li>
        </ul>
        <p>We don't share your data with any other third party.</p>
      </Section>

      <Section heading="5. Where your data is stored">
        <p>
          Our providers may process and store data outside the UK/EEA (including in the United
          States), under the data protection safeguards those providers maintain (such as standard
          contractual clauses).
        </p>
      </Section>

      <Section heading="6. How long we keep it">
        <p>
          We keep your account and costing data for as long as your account is active. If you'd
          like your account and data deleted, email us and we'll action the request — we don't yet
          have a fully automated self-service deletion tool, so for now this is handled manually on
          request.
        </p>
      </Section>

      <Section heading="7. Your rights">
        <p>
          Under UK GDPR, you have the right to access the personal data we hold about you, ask us to
          correct or delete it, object to how we process it, or request a copy in a portable format.
          To exercise any of these, email{' '}
          <a href="mailto:metcalfejac@gmail.com" className="text-brand-800 underline">
            metcalfejac@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section heading="8. Cookies and similar technology">
        <p>
          We only use what's strictly necessary to keep you signed in and the Service working (a
          session token, and your own browser's local storage for small preferences). We don't use
          advertising or tracking cookies.
        </p>
      </Section>

      <Section heading="9. Children">
        <p>CarcassIQ is a business tool and isn't intended for use by children.</p>
      </Section>

      <Section heading="10. Changes to this policy">
        <p>
          We may update this policy from time to time. If we make material changes, we'll let you
          know by email or an in-app notice.
        </p>
      </Section>
    </LegalPageLayout>
  );
}
