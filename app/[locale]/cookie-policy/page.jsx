const CookiePolicy = () => {
  return (
    <div className="w-full flex justify-center py-10 bg-gray-50">
      <div className="w-[90%] text-black space-y-8 bg-white p-8">
        <h1 className="text-4xl text-center mb-8 font-bold">Cookie Policy</h1>

        <div className="space-y-3">
          <p className="font-semibold">Powered by FANGVAULT</p>

          <p>Effective Date: August 18, 2026</p>

          <p>
            FANG (“FANG,” “we,” “our,” or “us”) uses cookies and similar tracking technologies (“Cookies”) to operate, improve, secure, and personalize the FANG platform, including our mobile applications, website, writer portal, and related services (collectively, the “Services”).
          </p>

          <p>
            This Cookie Policy explains what Cookies are, how we use them, how third-party services interface with our platform, and how you can manage your preferences. FANG is operated by IFO DIGITAL MEDIA, LLC.
          </p>
        </div>

        {/* 1 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">1. Company Information</h2>

          <div className="space-y-1">
            <p>IFO DIGITAL MEDIA, LLC</p>
            <p>1111B S Governors Ave STE 52111</p>
            <p>Dover, DE 19904</p>
            <p>United States</p>

            <p>Support: support@fangapp.io</p>
            <p>Legal: legal@fangapp.io</p>
          </div>
        </div>

        {/* 2 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">2. What Are Cookies?</h2>

          <p>
            Cookies are small text files stored on your browser or device when you visit or interact with online applications. They help websites and applications recognize unique devices, preserve secure sessions, remember user choices, analyze system performance, and support content recommendation frameworks.
          </p>

          <div className="space-y-2">
            <p>Similar tracking technologies utilized across our ecosystem include:</p>

            <ul className="list-disc pl-6 space-y-1">
              <li>
                <span className="font-semibold">Software Development Kits (SDKs):</span> Embedded mobile code blocks that track app stability and event interactions;
              </li>
              <li>
                <span className="font-semibold">Pixels and Web Beacons:</span> Small graphic strings used to monitor user actions and measure marketing campaign conversions;
              </li>
              <li>
                <span className="font-semibold">Local Storage:</span> Browser database storage used to cache platform preferences and session parameters.
              </li>
            </ul>
          </div>

          <p>
            For clarity across this document, all such tracking methods are collectively referred to as “Cookies.”
          </p>
        </div>

        {/* 3 */}
        <div className="space-y-5">
          <h2 className="font-bold text-xl">3. Types of Cookies We Use</h2>

          <p>FANG deploys Cookies across the following functional classifications:</p>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">3.1 Strictly Necessary Cookies</h3>

            <p>These Cookies are essential for our application to operate safely and correctly.</p>

            <div className="space-y-2">
              <p>They are utilized to:</p>

              <ul className="list-disc pl-6 space-y-1">
                <li>Authenticate user profiles and maintain active login sessions;</li>
                <li>Keep track of virtual wallet balances and coin allocations;</li>
                <li>Detect, investigate, and prevent automated script abuse, malicious bots, or security threats;</li>
                <li>Ensure core platform navigation paths function properly.</li>
              </ul>
            </div>

            <p>
              Note: Disabling necessary cookies via your browser settings will break core account actions and checkout flows.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">3.2 Functionality Cookies</h3>

            <p>These Cookies preserve your custom application choices to improve usability.</p>

            <div className="space-y-2">
              <p>They are utilized to:</p>

              <ul className="list-disc pl-6 space-y-1">
                <li>Save structural display choices (such as light or dark mode preferences);</li>
                <li>Maintain specific reading configurations (including text sizing, font choices, and chapter page positions);</li>
                <li>Remember preferred language settings and system location parameters.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">3.3 Analytics Cookies</h3>

            <p>These Cookies track how readers navigate and interact with our reading environment.</p>

            <div className="space-y-2">
              <p>They gather data regarding:</p>

              <ul className="list-disc pl-6 space-y-1">
                <li>Daily pages viewed, reading session durations, and genre preferences;</li>
                <li>App features utilized and specific book engagement statistics;</li>
                <li>System crash events, performance lag alerts, and technical loading failures.</li>
              </ul>
            </div>

            <p>
              We use this anonymized data strictly to optimize platform speeds, resolve backend bugs, and improve overall content delivery algorithms.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">3.4 Advertising and Marketing Cookies</h3>

            <div className="space-y-2">
              <p>These tracking tools evaluate promotion performance. They are utilized to:</p>

              <ul className="list-disc pl-6 space-y-1">
                <li>Track how users find our website through external ad campaigns;</li>
                <li>Recommend tailored book genres based on historical library additions;</li>
                <li>Prevent showing identical, repetitive promotional banners to the same user profile.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 4 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">4. Third-Party Technologies</h2>

          <p>
            FANG partners with secure external networks to support our platform infrastructure. These verified providers deploy tracking scripts to handle specialized operations:
          </p>

          <ul className="list-disc pl-6 space-y-1">
            <li>
              <span className="font-semibold">Payment Gateways:</span> Systems like Stripe and PayPal use security cookies to analyze device risk metrics, process secure checkout screens, and mitigate payment fraud;
            </li>
            <li>
              <span className="font-semibold">Cloud Infrastructure:</span> Enterprise hosting networks use server cache cookies to balance text delivery traffic and keep loading speeds lightning-fast;
            </li>
            <li>
              <span className="font-semibold">Social Identity Links:</span> Providers like Apple, Google, and Facebook deploy secure authentication cookies to connect your social login profile seamlessly.
            </li>
          </ul>

          <p>
            All third-party cookie activity is governed directly by the respective tracking policies of those independent providers.
          </p>
        </div>

        {/* 5 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">5. Managing Cookie Preferences</h2>

          <p>You have the complete right to control or restrict how Cookies are stored on your device:</p>

          <ul className="list-disc pl-6 space-y-1">
            <li>
              <span className="font-semibold">Browser Rules:</span> You can adjust your desktop or mobile browser configurations to block all third-party tracking or alert you when a new cookie is sent;
            </li>
            <li>
              <span className="font-semibold">Device Settings:</span> You can modify operating system settings on your mobile device to toggle off targeted advertising tracking or reset unique identifier keys.
            </li>
          </ul>

          <p>
            Please be aware that restricting non-essential tracking will change how easily the platform remembers your custom layout settings.
          </p>
        </div>

        {/* 6 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">6. Cookie Consent Management</h2>

          <p>
            In strict accordance with global digital privacy laws, FANG will request explicit user consent through an interface banner before initializing any non-essential analytical or marketing tracking cookies. You may access your preferences to update or withdraw consent configurations at any time.
          </p>
        </div>

        {/* 7 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">7. Changes to This Cookie Policy</h2>

          <p>
            We may update this Cookie Policy periodically to match infrastructure updates or regulatory changes. If a material shift occurs, we will notify our reading community via prominent in-app notification alerts, layout dashboard banners, or direct email announcements.
          </p>
        </div>

        {/* 8 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">8. Contact Us</h2>

          <p>
            If you have any technical questions or data-compliance concerns regarding our tracking policies, please reach out to us:
          </p>

          <div className="space-y-1">
            <p>Email: legal@fangapp.io</p>
            <p>Corporate Office: FANG / IFO DIGITAL MEDIA, LLC</p>
            <p>1111B S Governors Ave STE 52111</p>
            <p>Dover, DE 19904</p>
            <p>United States</p>
          </div>
        </div>

        <p className="font-semibold">Powered by FANGVAULT</p>
      </div>
    </div>
  );
};

export default CookiePolicy;