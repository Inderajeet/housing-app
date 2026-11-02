import Link from 'next/link';
import '../../styles/PrivacyPolicy.css';

const SITE_NAME = 'TN Property Mandi';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'tnpropertymandi@gmail.com';
const LAST_UPDATED = '2 November 2026';

export const metadata = {
  title: `Privacy Policy | ${SITE_NAME}`,
  description: `How ${SITE_NAME} collects, uses, shares and protects your personal information when you buy, sell or rent properties in Tamil Nadu.`,
  alternates: { canonical: `${SITE_URL}/privacy-policy` },
};

const sections = [
  { id: 'scope', title: 'Who this policy applies to' },
  { id: 'collect', title: 'Information we collect' },
  { id: 'use', title: 'How we use your information' },
  { id: 'share', title: 'Who we share it with' },
  { id: 'whatsapp', title: 'WhatsApp and phone communication' },
  { id: 'location', title: 'Location and maps' },
  { id: 'cookies', title: 'Cookies and analytics' },
  { id: 'listings', title: 'Property listings and photos' },
  { id: 'payments', title: 'Token and booking payments' },
  { id: 'retention', title: 'How long we keep data' },
  { id: 'security', title: 'Security' },
  { id: 'rights', title: 'Your rights and choices' },
  { id: 'children', title: "Children's privacy" },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact us' },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="pp-page">
      <article className="pp-container">
        <h1 className="pp-title">Privacy Policy</h1>
        <p className="pp-updated">Last updated: {LAST_UPDATED}</p>

        <p className="pp-intro">
          {SITE_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) helps people buy, sell and rent
          residential and commercial properties, plots and flats across Tamil Nadu. This policy explains what
          personal information we collect through {SITE_URL.replace(/^https?:\/\//, '')} (the &quot;Website&quot;),
          why we collect it, and the choices you have. By using the Website you agree to the practices
          described here.
        </p>

        <nav className="pp-toc" aria-label="Table of contents">
          <h2>Contents</h2>
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="scope" className="pp-section">
          <h2>1. Who this policy applies to</h2>
          <p>This policy covers everyone who uses the Website, including:</p>
          <ul>
            <li>Buyers and tenants who browse listings, send enquiries or book a plot or flat.</li>
            <li>Sellers, owners and agents who post a property for sale or rent.</li>
            <li>Visitors who only browse without sharing any details.</li>
          </ul>
        </section>

        <section id="collect" className="pp-section">
          <h2>2. Information we collect</h2>

          <h3>Information you give us</h3>
          <ul>
            <li>
              <strong>Contact details:</strong> name, mobile number, alternate mobile number and email address
              when you enquire about a property, book a unit or post a listing.
            </li>
            <li>
              <strong>Enquiry content:</strong> the messages you send about a property and the property or unit
              you are interested in.
            </li>
            <li>
              <strong>Listing details:</strong> property type, address or street, village, taluk and district,
              area and size, price or rent, description, and the contact person for the listing.
            </li>
            <li>
              <strong>Photos, videos and documents:</strong> images and media you upload for a listing.
            </li>
            <li>
              <strong>Booking information:</strong> the plot or flat you select, token or advance amount, and
              booking status.
            </li>
          </ul>

          <h3>Information collected automatically</h3>
          <ul>
            <li>
              <strong>Usage data:</strong> pages viewed, searches and filters used, listings opened, and the
              time you spend on the Website.
            </li>
            <li>
              <strong>Device data:</strong> browser type, operating system, screen size, IP address and
              approximate location derived from it.
            </li>
            <li>
              <strong>Precise location:</strong> only if you allow your browser to share it (see Location and
              maps below).
            </li>
          </ul>

          <h3>Information we do not ask for</h3>
          <p>
            We do not ask you to enter card numbers, UPI PINs, bank passwords or OTPs on the Website. Never
            share these with anyone claiming to represent us.
          </p>
        </section>

        <section id="use" className="pp-section">
          <h2>3. How we use your information</h2>
          <ul>
            <li>To show you relevant properties and let you search by location, price and type.</li>
            <li>To connect buyers and tenants with sellers and owners when you send an enquiry.</li>
            <li>To create, display and manage property listings you post.</li>
            <li>To process and confirm bookings, token amounts and their expiry.</li>
            <li>
              To contact you by phone, SMS or WhatsApp about your enquiry, booking or listing, including
              reminders and status updates.
            </li>
            <li>To verify listings, prevent fraud, spam and misuse, and keep the Website secure.</li>
            <li>To understand how the Website is used and to improve its speed, design and content.</li>
            <li>To meet legal and regulatory obligations.</li>
          </ul>
          <p>We do not sell your personal information.</p>
        </section>

        <section id="share" className="pp-section">
          <h2>4. Who we share it with</h2>
          <ul>
            <li>
              <strong>Sellers and owners:</strong> when you enquire about or book a property, your name and
              contact number are shared with the person who listed it so they can respond.
            </li>
            <li>
              <strong>Buyers and tenants:</strong> the contact details on a listing may be shown to people who
              enquire about that property. Some details may be hidden until an enquiry or booking is made.
            </li>
            <li>
              <strong>Service providers:</strong> hosting and database providers, Google (Maps and Analytics),
              and Meta (WhatsApp Business messaging) who process data on our behalf.
            </li>
            <li>
              <strong>Authorities:</strong> when required by law, court order or to protect our rights, users or
              the public.
            </li>
            <li>
              <strong>Business transfers:</strong> if we merge with or are acquired by another business, your
              data may transfer to the new owner under the same protections.
            </li>
          </ul>
        </section>

        <section id="whatsapp" className="pp-section">
          <h2>5. WhatsApp and phone communication</h2>
          <p>
            When you give us your mobile number we may send you messages about your enquiry, booking, token
            expiry or listing through the WhatsApp Business Platform (Meta), SMS or phone calls. WhatsApp
            messages are subject to WhatsApp&apos;s own terms and privacy policy.
          </p>
          <p>
            You can opt out of non-essential messages at any time by replying STOP or by contacting us. We may
            still send service messages that are necessary for a booking you have made.
          </p>
        </section>

        <section id="location" className="pp-section">
          <h2>6. Location and maps</h2>
          <p>
            The Website uses Google Maps to show where properties are and to help you find them on a map. When
            you use maps, Google may collect data under its own privacy policy.
          </p>
          <p>
            If you use a &quot;live location&quot; or similar feature, your browser asks for permission first.
            You can refuse or withdraw this in your browser settings, and the Website will still work. We also
            convert addresses you enter into map coordinates (geocoding) to place listings on the map.
          </p>
        </section>

        <section id="cookies" className="pp-section">
          <h2>7. Cookies and analytics</h2>
          <p>
            We use Google Analytics (GA4) to record page views and general usage so we can see which pages and
            listings are useful. This uses cookies and similar identifiers that collect your IP address, device
            and browsing information in aggregated form.
          </p>
          <p>
            Your browser may also store small amounts of data (local storage) to remember choices such as
            filters. You can clear cookies or block them in your browser settings, and you can install the
            Google Analytics opt-out browser add-on. Blocking cookies may affect some features.
          </p>
        </section>

        <section id="listings" className="pp-section">
          <h2>8. Property listings and photos</h2>
          <p>
            Anything you put in a listing, such as the property address, price, description and photos, is
            public once approved. Do not include personal documents, ID numbers or information about other
            people in listing text or images.
          </p>
          <p>
            We may blur or edit images, for example to hide a name board, phone number or other identifying
            detail, and we may remove listings that break our rules.
          </p>
          <div className="pp-note">
            By posting a listing you confirm you are the owner, or are authorised by the owner, to share the
            property details and photos.
          </div>
        </section>

        <section id="payments" className="pp-section">
          <h2>9. Token and booking payments</h2>
          <p>
            When you book a plot or flat we record the booking, token amount, who the token was paid to and the
            booking status. A booking may expire automatically if it is not confirmed in time. We keep
            these records for accounting, dispute resolution and legal compliance.
          </p>
        </section>

        <section id="retention" className="pp-section">
          <h2>10. How long we keep data</h2>
          <p>
            We keep personal information only as long as needed for the purposes above. Enquiry, booking and
            payment records are kept for as long as needed for business, tax and legal reasons. Listing data
            is removed or archived when a listing is taken down or expires, subject to those same
            obligations.
          </p>
        </section>

        <section id="security" className="pp-section">
          <h2>11. Security</h2>
          <p>
            We use reasonable technical and organisational measures to protect your data, including access
            controls for our admin tools and secured connections to our database. No system is completely
            secure, so we cannot guarantee absolute security. Please protect your phone and accounts and report
            anything suspicious to us.
          </p>
        </section>

        <section id="rights" className="pp-section">
          <h2>12. Your rights and choices</h2>
          <p>
            Under applicable Indian law, including the Digital Personal Data Protection Act, 2023, you may
            ask us to:
          </p>
          <ul>
            <li>Tell you what personal data we hold about you.</li>
            <li>Correct or update inaccurate details.</li>
            <li>Delete your data or remove your listing, unless we must keep it by law.</li>
            <li>Withdraw consent for calls, SMS or WhatsApp messages.</li>
            <li>Raise a grievance about how your data is handled.</li>
          </ul>
          <p>
            To use any of these rights, write to us at the address below. We may need to verify your identity
            first, and we will respond within a reasonable time.
          </p>
        </section>

        <section id="children" className="pp-section">
          <h2>13. Children&apos;s privacy</h2>
          <p>
            The Website is meant for adults who are legally able to enter into property transactions. We do
            not knowingly collect personal information from anyone under 18. If you believe a child has given
            us their data, contact us and we will delete it.
          </p>
        </section>

        <section id="changes" className="pp-section">
          <h2>14. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. The &quot;Last updated&quot; date at the top shows
            when it last changed. If the changes are significant we will make that clear on the Website.
            Continued use after an update means you accept the revised policy.
          </p>
        </section>

        <section id="contact" className="pp-section">
          <h2>15. Contact us</h2>
          <p>
            For questions, requests or complaints about this policy or your data, contact the {SITE_NAME}{' '}
            team:
          </p>
          <ul>
            <li>
              Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
            <li>
              Website: <Link href="/">{SITE_URL.replace(/^https?:\/\//, '')}</Link>
            </li>
          </ul>
        </section>
      </article>
    </main>
  );
}
