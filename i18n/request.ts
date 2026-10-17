import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './routing';

export default getRequestConfig(async ({ locale }) => {
    const isSupported = locales.includes(locale as Locale);
    const resolvedLocale = (isSupported ? locale : defaultLocale) as Locale;

    const messages = (await import(`../messages/${resolvedLocale}.json`)).default;



    return {
        locale: resolvedLocale,
        messages
    };
});