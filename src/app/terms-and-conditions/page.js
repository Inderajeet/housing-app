import Link from 'next/link';
import '../../styles/PrivacyPolicy.css';

const SITE_NAME = 'TN Property Mandi';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';

export const metadata = {
  title: `Terms & Conditions | ${SITE_NAME}`,
  description: `Terms of use for ${SITE_NAME}.`,
  alternates: { canonical: `${SITE_URL}/terms-and-conditions` },
};

export default function TermsPage() {
  return (
    <main className="pp-page">
      <article className="pp-container">
        <h1 className="pp-title">Terms &amp; Conditions</h1>

        <section className="pp-section">
          <h2>Use of the Website</h2>
          <p>
            {SITE_NAME} is operated by TN PROPERTY MANDI PRIVATE LIMITED. By using this Website you agree to
            use it only for lawful purposes and to provide accurate information in enquiries, bookings and
            listings.
          </p>
        </section>

        <section className="pp-section">
          <h2>Listings</h2>
          <p>
            Listings are posted by owners, sellers and agents. We try to keep details accurate but do not
            guarantee them. Please verify property details and documents before making any payment.
          </p>
        </section>

        <section className="pp-section">
          <h2>Bookings and payments</h2>
          <p>
            Token or booking amounts are subject to the terms shown at the time of booking, including expiry
            of unconfirmed bookings.
          </p>
        </section>

        <section className="pp-section">
          <h2>Privacy and contact</h2>
          <p>
            See our <Link href="/privacy-policy">Privacy Policy</Link> for how we handle your data. For any
            questions, reach us via <Link href="/contact-us">Contact Us</Link>.
          </p>
        </section>
      </article>
    </main>
  );
}
