import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const font = Plus_Jakarta_Sans({
  subsets: ['latin', 'cyrillic-ext'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Опрос — Региональная конференция',
  description: 'Оцените владение стандартами СПП',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={font.variable}>
      <body>
        {children}
        <Toaster
          position="bottom-left"
          toastOptions={{ duration: 6000 }}
          offset="24px"
          dir="ltr"
        />
      </body>
    </html>
  );
}
