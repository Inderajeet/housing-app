import '../../styles/PrivacyPolicy.css';
import '../../styles/ContactUs.css';

const SITE_NAME = 'TN Property Mandi';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tnpropertymandi.in';

export const metadata = {
  title: `Contact Us | ${SITE_NAME}`,
  description: `Get in touch with ${SITE_NAME} for buying, selling or renting properties in Tamil Nadu.`,
  alternates: { canonical: `${SITE_URL}/contact-us` },
};

export default function ContactUsPage() {
  return (
    <main className="pp-page">
      <article className="pp-container">
        <h1 className="pp-title">Contact Us</h1>
        <p className="cu-sub">We&apos;d love to hear from you. Reach out using the details below.</p>

        <div className="cu-grid">
          <div className="cu-card">
            <div className="cu-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h2>Visit us</h2>
            <p>
              TN PROPERTY MANDI PRIVATE LIMITED
              <br />
              Eden Park Ph2, Jasmine Tower, MR Radha Road Siruseri,
              <br />
              Near SIPCOT IT Park Siruseri, Pudupakkam,
              <br />
              Chennai, India 603103
            </p>
          </div>

          <div className="cu-card">
            <div className="cu-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h2>Call us</h2>
            <p>
              <a href="tel:+919500288350">+91 95002 88350</a>
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}
