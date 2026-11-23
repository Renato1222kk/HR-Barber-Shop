import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BRAND } from '@/lib/constants';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const TITLE = 'Horários marcados | HR Barber Shop';
const DESCRIPTION = 'Confira os horários já reservados na HR Barber Shop.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/horarios' },
  // Lista do dia muda o tempo todo: não vale a pena indexar.
  robots: { index: false, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${siteUrl}/horarios`,
    type: 'website',
    siteName: BRAND.name,
    locale: 'pt_BR',
    images: [{ url: BRAND.logo, width: 1254, height: 1254, alt: BRAND.name }],
  },
};

/** Página pública: fundo branco, sem shell nem login (igual a /agendar). */
export default function HorariosLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-white text-ink-900">{children}</div>;
}
