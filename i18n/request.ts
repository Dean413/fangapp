import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { locales, defaultLocale } from './routing';

export default getRequestConfig(async ({ locale, requestLocale }) => {
    // `locale` is set when a locale is passed explicitly (e.g. getTranslations({ locale }) in API routes)
    const requested = locale ?? (await requestLocale);
    const resolvedLocale = hasLocale(locales, requested) ? requested : defaultLocale;

    const messages = (await import(`../messages/${resolvedLocale}.json`)).default;

    return {
        locale: resolvedLocale,
        messages
    };
});
