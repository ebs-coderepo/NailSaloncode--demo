import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | AI Voice Receptionist',
    default: 'AI Voice Receptionist — Nail Salon Dashboard',
  },
  description: "Manage your nail salon's AI voice receptionist, appointments, services, and staff.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
