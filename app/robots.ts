import type { MetadataRoute } from "next";

const RAW_SITE = (process.env.SITE_URL || "https://fangapp.io").trim().replace(/\/+$/, "");
const SITE = /^https?:\/\//i.test(RAW_SITE)
    ? RAW_SITE
    : `${/^(localhost|127\.)/i.test(RAW_SITE) ? "http" : "https"}://${RAW_SITE}`;

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Server routes and the signed-in reader's own pages (profile, library) aren't content to index
            disallow: ["/api/", "/profile", "/*/profile", "/library", "/*/library"],
        },
        sitemap: `${SITE}/sitemap.xml`,
    };
}
