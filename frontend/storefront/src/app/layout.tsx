import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import { StoreProvider } from '@/lib/store';
import { theme } from '@/theme';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Toast from '@/components/Toast';
import ChatWidget from '@/components/ChatWidget';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sacramento.md'),
  title: {
    default: 'SACRAMENTO — автозапчасти в Кишинёве | подбор по автомобилю',
    template: '%s | SACRAMENTO',
  },
  description:
    'Запчасти для европейских и азиатских авто. Наличие на складе в Кишинёве, самовывоз сегодня и доставка курьером по Кишинёву. Подбор по марке, модели и году.',
  openGraph: {
    type: 'website',
    siteName: 'SACRAMENTO Auto Parts',
    locale: 'ru_RU',
    title: 'SACRAMENTO — автозапчасти в Кишинёве',
    description: 'Подбор запчастей по марке, модели и году. Наличие на складе, самовывоз сегодня.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${mono.variable}`}>
      <body style={{ background: '#f3f5f8', color: '#13161b', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <StoreProvider>
              <Header />
              <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', minHeight: '60vh' }}>
                {children}
              </main>
              <Footer />
              <Toast />
              <ChatWidget />
            </StoreProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
