import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Besonc — Cape Coast',
  description: 'Order food, groceries, laundry, and more. Delivered across Cape Coast.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
