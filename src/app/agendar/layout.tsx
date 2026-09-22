import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BRAND } from '@/lib/constants';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const TITLE = 'Agende seu horário | HR Barber Shop';
const DESCRIPTION = 'Escolha seu serviço, data e horário na HR Barber Shop.';

export const metadata: Metadata = {
  // `absolute` evita o template "%s · HR Barber Shop" do layout raiz.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/agendar' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${siteUrl}/agendar`,
    type: 'website',
    siteName: BRAND.name,
    locale: 'pt_BR',
    images: [{ url: BRAND.logo, width: 1254, height: 1254, alt: BRAND.name }],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: [BRAND.logo],
  },
};

/** A página pública vive fora do painel: fundo branco, sem shell nem login. */
export default function AgendarLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-white text-ink-900">{children}</div>;
}
