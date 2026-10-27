export const AUTH_CONFIG = {
    appName: "Fang",
    siteUrl: process.env.SITE_URL || "",
    logoUrl: "fangapp.vercel.app/fang-logo.png",
    supportEmail: "support@fangapp.io",
    publicIdPrefix: "FR",
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "",
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "",
    emailCodePepper: process.env.EMAIL_CODE || "",
    resendApiKey: process.env.RESEND_API_KEY || "",
    emailFrom: "no-reply@fangapp.io",
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    facebookAppId: process.env.FACEBOOK_APP_ID || "",
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET || "",
    appleClientID: process.env.APPLE_CLIENT_ID || "",
    appleRedirectUri: process.env.APPLE_REDIRECT_URI || ""
};

