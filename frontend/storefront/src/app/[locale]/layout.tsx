import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import { StoreProvider } from '@/lib/store';
import { I18nProvider } from '@/i18n/I18nProvider';
import { getDict, isLocale, LOCALES } from '@/i18n/dictionaries';
import { theme } from '@/theme';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Toast from '@/components/Toast';
import ChatWidget from '@/components/ChatWidget';
import '../globals.css';

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

export function generateStaticParams() {
  return LOCALES.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDict(locale);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sacramento.md'),
    title: { default: dict.meta.title, template: dict.meta.titleTemplate },
    description: dict.meta.description,
    alternates: {
      languages: { ro: '/ro', ru: '/ru' },
    },
    openGraph: {
      type: 'website',
      siteName: 'SACRAMENTO Auto Parts',
      locale: locale === 'ru' ? 'ru_RU' : 'ro_RO',
      title: dict.meta.title,
      description: dict.meta.description,
    },
  };
}

export default async function RootLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);

  return (
    <html lang={locale} className={`${inter.variable} ${mono.variable}`}>
      <body style={{ background: '#f3f5f8', color: '#13161b', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <I18nProvider locale={locale} dict={dict}>
              <StoreProvider>
                <Header />
                <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', minHeight: '60vh' }}>
                  {children}
                </main>
                <Footer locale={locale} />
                <Toast />
                <ChatWidget />
              </StoreProvider>
            </I18nProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
