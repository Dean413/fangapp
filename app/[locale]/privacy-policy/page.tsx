const PrivacyPolicy = () => {
  return (
    <div className="w-full flex justify-center py-4 md:py-10 bg-gray-50 dark:bg-dark">
      <div className="w-[90%] text-black dark:text-white space-y-8 bg-white dark:bg-dark-card p-5 md:p-8">
        <h1 className="text-4xl text-center mb-8 font-bold">Privacy Policy</h1>

        <div className="space-y-3">
          <p className="font-semibold">Powered by FANGVAULT</p>

          <p>Effective Date: August 18, 2026</p>

          <p>
            FANG (“FANG,” “we,” “our,” or “us”) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, share, and protect information when you use the FANG mobile application, website, writer portal, and related services (collectively, the “Services”). FANG is owned and operated by IFO DIGITAL MEDIA, LLC.
          </p>
        </div>

        {/* 1 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">1. Company Information</h2>

          <div className="space-y-1">
            <p>IFO DIGITAL MEDIA, LLC</p>
            <p>1111B S Governors Ave STE 52111</p>
            <p>Dover, DE 19904</p>
            <p>United States</p>

            <p>Support: support@fangapp.io</p>
            <p>Legal: legal@fangapp.io</p>
          </div>

          <p className="font-semibold">Finality of Sale</p>
          <p>
            All purchases of Coins completed on the FANG website or mobile applications are absolute, permanent, instant, and completely non-refundable.
          </p>

          <p className="font-semibold">No Cash Value</p>
          <p>
            Coins possess zero real-world monetary value, are completely non-transferable, and can never be exchanged, redeemed, or reversed for fiat cash or external credit.
          </p>

          <p className="font-semibold">Instant Consumption Waiver</p>
          <p>
            Digital coin top-ups deliver instant database utility. The exact second Coins are credited to your user wallet profile, the contract of sale is fulfilled in its entirety. You explicitly waive any statutory right of withdrawal, consumer cooling-off periods, or transaction cancellations.
          </p>

          <p className="font-semibold">User Error Protection</p>
          <p>
            FANG does not issue refunds, replacements, or credits for Coins purchased accidentally, Coins spent unlocking chapters inadvertently, or Coins lost due to an account password compromise resulting from user negligence.
          </p>

          <p className="font-semibold">Exceptional Technical Errors</p>
          <p>
            If an authentic banking failure occurs where funds were cleared from your card but Coins were not delivered due to a system glitch, you must contact support@fangapp.io within forty-eight (48) hours with verified transaction logs. FANG may, at its sole discretion, issue digital Coin replacements.
          </p>
        </div>

        {/* 2 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">2. Information We Collect</h2>

          <p>
            We collect information you provide directly to us, information collected automatically through your use of the Services, and information received from third-party providers.
          </p>

          <p className="font-semibold">2.1 Information You Provide</p>
          <p>When you create an account or interact with FANG, we may collect:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Username, legal name, and email address;</li>
            <li>Password or secure login credentials;</li>
            <li>Profile pictures and biography details;</li>
            <li>Comments, reviews, direct messages, and user-generated literary content;</li>
            <li>Purchase, subscription history, and payout ledger preferences;</li>
            <li>Customer support communications and basic account verification details.</li>
          </ul>

          <p className="font-semibold">2.2 Device Permissions</p>
          <p>
            Depending on the features you use, FANG may request access to your device’s camera, photo library, storage, and push notifications. You may choose to deny these permissions, though some platform features may become unavailable.
          </p>

          <p className="font-semibold">2.3 Information Collected Automatically</p>
          <p>When you interact with our Services, we automatically collect:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Device type, hardware model, browser version, and operating system;</li>
            <li>Application version and unique device identifiers;</li>
            <li>IP address, language settings, and local time zone;</li>
            <li>Reading activity, preferences, view timestamps, and book interaction statistics;</li>
            <li>Crash reports, system diagnostics, and account log dates.</li>
          </ul>

          <p className="font-semibold">2.4 Information from Third Parties</p>
          <p>
            If you sign in or link your account through third-party services such as Apple, Google, Facebook, or X (Twitter), we may receive your username, email address, profile information, and basic authentication details from those systems.
          </p>
        </div>

        {/* 3 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">3. How We Use Information</h2>
          <p>We process your personal information to fulfill our business services, including to:</p>

          <ul className="list-disc pl-6 space-y-1">
            <li>Create, manage, and secure user and creator accounts;</li>
            <li>Provide, maintain, and optimize platform functionality;</li>
            <li>Personalize reading recommendations and content discovery tracking;</li>
            <li>Securely process coin purchases, premium subscriptions, and creator payouts;</li>
            <li>Deliver responsive customer support and technical troubleshooting;</li>
            <li>Detect, investigate, and prevent fraud, platform abuse, spam, or security risks;</li>
            <li>Ensure full compliance with relevant tax regulations, anti-money laundering (AML) laws, and legal mandates.</li>
          </ul>
        </div>

        {/* 4 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">4. Recommendations and Advertising</h2>
          <p>
            FANG uses data activity to recommend relevant stories, optimize creator visibility, and measure advertising performance. We may work with verified analytics and advertising partners who utilize cookies or SDKs to help evaluate platform trends. Where legally mandated by regional privacy laws, we will explicitly obtain your consent before processing data for target-advertising tracks.
          </p>
        </div>

        {/* 5 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">5. Cookies and Similar Technologies</h2>
          <p>
            We use cookies, web beacons, and mobile SDKs to keep users safely signed in, remember system preferences, analyze user engagement, and support marketing tracking. You can manage or disable cookies through your browser settings, though doing so may prevent certain e-commerce and login features from functioning properly.
          </p>
        </div>

        {/* 6 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">6. Sharing of Information</h2>
          <p>FANG does not sell personal information. We only disclose information under the following corporate guidelines:</p>

          <p className="font-semibold">6.1 Service Providers and Platform Partners</p>
          <p>
            We share data with verified third-party vendors who assist our core operations, including cloud hosting providers, analytics systems, communication tools, and our merchant payment infrastructure partners (such as Stripe and PayPal).
          </p>

          <p className="font-semibold">6.2 Legal Compliance and Platform Protection</p>
          <p>
            We may disclose information where required to comply with court orders, enforce our Terms of Service, defend against legal liabilities, protect public safety, or secure our infrastructure against active fraudulent or cyber threats.
          </p>

          <p className="font-semibold">6.3 Business Transfers</p>
          <p>
            In the event of a corporate merger, acquisition, structural reorganization, or asset sale, user database information may be transferred as a part of standard corporate assets.
          </p>

          <p className="font-semibold">6.4 Public Platform Content</p>
          <p>
            Information you intentionally place on public areas of the application including your username, public profile pictures, published novels, comments, book reviews, and community posts is visible to all users across the FANG ecosystem.
          </p>
        </div>

        {/* 7 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">7. Payment Information</h2>

          <p>
            All commercial financial transactions are handled securely by authorized third-party payment gateways, including Apple App Store, Google Play, Stripe, and PayPal. FANG operates on a marketplace structure where consumer coin sales occur on fangapp.io and creator tools are managed separately through FangWriters.com.
          </p>

          <p>
            FANG does not store full credit card or bank account details on our servers. For accounting, fraud prevention, and audit tracking, we securely maintain:
          </p>

          <ul className="list-disc pl-6 space-y-1">
            <li>Numerical transaction IDs and reference keys;</li>
            <li>Platform purchase and subscription records;</li>
            <li>Timestamps and order amounts.</li>
          </ul>
        </div>

        {/* 8 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">8. Data Retention</h2>
          <p>
            We retain personal data only as long as necessary to provide platform availability, manage active accounts, resolve disputes, prevent ongoing fraud, or satisfy federal financial and legal reporting criteria.
          </p>
        </div>

        {/* 9 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">9. Account Deletion and User Rights</h2>
          <p>
            You can request full account deletion at any time through available in-app software settings or by emailing support@fangapp.io. Please note that certain historical transaction data and ledger values may be permanently archived due to strict tax and legal auditing obligations. Deleting an account will immediately permanently terminate access to your purchased coin balances and premium digital libraries. Depending on your physical jurisdiction (such as under GDPR or CCPA frameworks), you have the right to access, correct, or completely delete your personal information, withdraw data consent, or restrict specific processing tracks.
          </p>
        </div>

        {/* 10 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">10. International Data Transfers</h2>
          <p>
            FANG operates via globally distributed cloud servers, with primary operations running in the United States. By utilizing our services, you acknowledge that your personal information may be transferred and securely processed outside of your home country under data protection regulations that may vary from your local laws.
          </p>
        </div>

        {/* 11 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">11. Security Protection</h2>
          <p>
            We implement administrative, technical, and physical security measures to guard your information against unauthorized access, loss, or manipulation. However, no method of data transmission across the internet can be guaranteed as 100% secure. You hold full responsibility for protecting your individual login profile credentials.
          </p>
        </div>

        {/* 12 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">12. Children’s Privacy</h2>
          <p>
            FANG is strictly an adult web novel platform. In full alignment with our Terms of Use, the Service is not directed toward or intended for children under the age of 18. We do not knowingly collect information from minors. If a parent or guardian believes data has been processed improperly, contact us immediately at support@fangapp.io.
          </p>
        </div>

        {/* 13 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">13. Third-Party Services</h2>
          <p>
            Our Services natively interface with external systems, websites, or application links (such as developer tracking links and creator platforms like FangWriters.com). FANG holds no operational responsibility for the distinct privacy policies or data practices managed by third-party systems.
          </p>
        </div>

        {/* 14 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">14. Marketing and Communication Alerts</h2>
          <p>
            We may occasionally distribute service announcements, strict security warnings, database platform updates, and optional promotional email newsletters. You can easily opt out of promotional newsletters at any time by clicking the “Unsubscribe” links provided in our footers.
          </p>
        </div>

        {/* 15 */}
        <div className="space-y-3">
          <h2 className="font-bold text-xl">15. Changes to This Privacy Policy</h2>
          <p>
            We reserve the right to modify this Privacy Policy at any time. If material alterations occur, we will notify our community via prominent in-app update warnings, website layout announcements, or direct email alerts.
          </p>
        </div>

        {/* 16 */}
        <div className="space-y-2">
          <h2 className="font-bold text-xl">16. Contact Us</h2>

          <p>
            If you have questions, requests, or concerns regarding this Privacy Policy or your information, please contact:
          </p>

          <p>FANG / IFO DIGITAL MEDIA, LLC</p>
          <p>1111B S Governors Ave STE 52111</p>
          <p>Dover, DE 19904</p>
          <p>United States</p>

          <p>Support: support@fangapp.io</p>
          <p>Legal: legal@fangapp.io</p>

          <p className="font-semibold">Powered by FANGVAULT</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;