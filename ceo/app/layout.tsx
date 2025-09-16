import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Wonder — CEO LLM Chooser',
  description: 'Compare outputs from your engines',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
