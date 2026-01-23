import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/AppLayout';

export const metadata: Metadata = {
  title: 'Investor OS | Red Beard Ventures x Denarii Labs',
  description: 'Operating system for Red Beard Ventures and Denarii Labs - Knowledge graph for investor relations and portfolio management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
