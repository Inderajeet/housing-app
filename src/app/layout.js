import './globals.css';
import '../styles/MenuBar.css';
import '../styles/Modal.css';
import { AppProvider } from './AppContext';
import AppShell from './AppShell';

export const metadata = {
  title: 'TN Property Mandi | Buy, Sell & Rent Properties in Tamil Nadu',
  description: 'Find the best residential and commercial properties for sale or rent across Tamil Nadu.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
      </head>
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
