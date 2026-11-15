import Link from 'next/link';
import '../styles/Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav className="site-footer-links" aria-label="Footer">
          <Link href="/contact-us">Contact Us</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
        </nav>
        <span className="site-footer-copy">
          &copy; 2026 TN PROPERTY MANDI PRIVATE LIMITED. All Rights Reserved.
        </span>
      </div>
    </footer>
  );
}
