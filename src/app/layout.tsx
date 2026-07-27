import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { PwaRegister } from '@/components/pwa-register';
import { BRAND } from '@/lib/constants';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// Endereco publico do app (usado nas imagens de compartilhamento).
// Na Vercel a variavel NEXT_PUBLIC_SITE_URL pode apontar para o dominio final.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  manifest: '/manifest.webmanifest',
  applicationName: BRAND.name,
  // Tags de iOS: `capable` + `title` fazem o Safari abrir em tela cheia com o
  // nome curto; a barra de status clara combina com o tema branco.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND.short,
    startupImage: [BRAND.logo],
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: BRAND.name,
    description: BRAND.description,
    locale: 'pt_BR',
    url: siteUrl,
    images: [
      {
        // Logo oficial — e a imagem que aparece ao compartilhar no WhatsApp.
        url: BRAND.logo,
        width: 1254,
        height: 1254,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: BRAND.name,
    description: BRAND.description,
    images: [BRAND.logo],
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/icons/favicon-32.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        {/*
          As tags `apple-mobile-web-app-*` sao geradas pelo `appleWebApp` da
          metadata acima. Falta apenas a versao padronizada, que o Next 14
          ainda nao emite — e sem ela o Chrome registra um aviso.
        */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
