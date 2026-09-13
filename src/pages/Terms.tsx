import LegalPageLayout, { Section } from '../components/LegalPageLayout';

export default function Terms() {
  return (
    <LegalPageLayout title="Terms of Service" updated="13 September 2026">
      <Section heading="1. About these terms">
        <p>
          These terms govern your use of CarcassIQ (the "Service"), a web-based costing tool for
          butchers, farm shops and small meat businesses. By creating an account or using the
          Service, you agree to these terms. If you don't agree, please don't use the Service.
        </p>
      </Section>

      <Section heading="2. The Service">
        <p>
          CarcassIQ helps you calculate yields, costs and margins on meat products you purchase,
          break down, and sell — single products, whole carcasses, and manufactured products made
          from multiple ingredients. It's a calculation aid based on the figures you enter. It
          doesn't verify your inputs, connect to any supplier or accounting system, or replace your
          own judgement — you're responsible for checking important pricing decisions yourself.
        </p>
      </Section>

      <Section heading="3. Your account">
        <p>
          You need an account to use the Service. You're responsible for keeping your login details
          secure and for all activity under your account. Provide accurate information when signing
          up, and let us know if you believe your account has been compromised.
        </p>
      </Section>

      <Section heading="4. Free trial">
        <p>
          New accounts get a free trial with no payment card required. We may limit trial
          eligibility (for example, based on your email address or network connection) to prevent
          abuse of repeated free trials. We may change the length or availability of the trial at
          any time.
        </p>
      </Section>

      <Section heading="5. Subscription and billing">
        <p>
          After your trial, continued use of the Service requires a paid subscription, billed
          monthly in advance through our payment processor, Stripe. Your subscription renews
          automatically each month until you cancel.
        </p>
        <p>
          You can cancel at any time from the Billing page — cancellation takes effect at the end of
          your current billing period, and you'll keep access until then. We don't provide refunds
          for partial billing periods. We'll give reasonable notice by email before any price change
          takes effect for existing subscribers.
        </p>
      </Section>

      <Section heading="6. Your data">
        <p>
          You own the business data you enter into CarcassIQ — product names, suppliers, prices,
          ingredients and costings. We use it only to provide the Service to you (see our{' '}
          <a href="/privacy" className="text-brand-800 underline">
            Privacy Policy
          </a>{' '}
          for details) and don't sell it or share it with other businesses.
        </p>
      </Section>

      <Section heading="7. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>create multiple accounts to obtain repeated free trials;</li>
          <li>use the Service for any unlawful purpose;</li>
          <li>attempt to disrupt, reverse-engineer, or gain unauthorised access to the Service; or</li>
          <li>resell or provide the Service to third parties without our agreement.</li>
        </ul>
      </Section>

      <Section heading="8. Availability">
        <p>
          We aim to keep the Service available and reliable, but we don't guarantee uninterrupted
          or error-free access. We're not liable for losses arising from downtime, maintenance, or
          issues with third-party services we rely on (such as our hosting, database, or payment
          providers).
        </p>
      </Section>

      <Section heading="9. Limitation of liability">
        <p>
          The Service is provided as a calculation aid "as is." To the fullest extent permitted by
          law, we're not liable for indirect or consequential losses, or for business decisions made
          using figures produced by the Service. Where liability can't be excluded, our total
          liability to you is limited to the amount you paid us in the 12 months before the claim
          arose.
        </p>
      </Section>

      <Section heading="10. Ending your access">
        <p>
          You can stop using the Service and cancel your subscription at any time. We may suspend or
          terminate accounts that breach these terms, or that don't pay for an active subscription,
          with notice where reasonably possible.
        </p>
      </Section>

      <Section heading="11. Changes to these terms">
        <p>
          We may update these terms from time to time. If we make material changes, we'll let you
          know by email or an in-app notice. Continuing to use the Service after changes take effect
          means you accept the updated terms.
        </p>
      </Section>

      <Section heading="12. Governing law">
        <p>These terms are governed by the laws of England and Wales.</p>
      </Section>

      <Section heading="13. Contact">
        <p>
          Questions about these terms? Email{' '}
          <a href="mailto:metcalfejac@gmail.com" className="text-brand-800 underline">
            metcalfejac@gmail.com
          </a>
          .
        </p>
      </Section>
    </LegalPageLayout>
  );
}
