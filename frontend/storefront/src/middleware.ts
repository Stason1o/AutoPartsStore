import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/dictionaries';

/** Все страницы живут под /ro и /ru; без префикса — редирект на сохранённый язык. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split('/')[1];
  if (isLocale(first)) {
    return NextResponse.next();
  }
  const saved = request.cookies.get('locale')?.value;
  const locale = saved && isLocale(saved) ? saved : DEFAULT_LOCALE;
  return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
}

export const config = {
  // не трогаем API, статику и служебные файлы
  matcher: ['/((?!api|_next|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)'],
};
