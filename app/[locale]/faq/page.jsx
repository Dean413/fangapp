const FANGFAQ = () => {
  return (
    <div className="w-full flex justify-center py-10 bg-gray-50">
      <div className="w-[90%] text-black space-y-8 bg-white p-8">
        <h1 className="text-4xl text-center mb-8 font-bold">FANG Faq</h1>

        {/* 1 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">1. Virtual Currency &amp; Content Access</h2>

          <p className="font-semibold">Q: What is the difference between Normal Coins and Bonus Coins?</p>

          <p><b>A:</b></p>

          <p>
            <b>Normal Coins:</b> Acquired via direct standard wallet top-ups on our platform. These coins have no expiration date and can be used to unlock premium content tiers across the FANG application interface.
          </p>

          <p>
            <b>Bonus Coins:</b> Promotional currency granted through daily check-in rewards, video ad engagement tasks, or specific platform reading events. Bonus Coins carry a structural expiration window of exactly two (2) days from the credit timestamp and should be utilized within that timeframe.
          </p>

          <br />

          <p className="font-semibold">Q: How much does a premium chapter cost to unlock?</p>
          <p>
            <b>A:</b> Premium text content scales dynamically based on the story’s depth and placement structure within the book’s volume arc. Early premium launch chapters require 25 Coins, middle progression chapters adjust to 35 Coins, and final high-tension climax chapters scale to 45 Coins.
          </p>

          <br />

          <p className="font-semibold">Q: Why do I receive extra promotional rewards when buying packages directly on the FANG Web Portal?</p>
          <p>
            <b>A:</b> Processing transactions directly through our native secure web checkout infrastructure minimizes processing overhead compared to third-party app stores. We route these efficiency savings directly back to our community by granting up to 60% extra promotional Bonus Coins for packages cleared through our direct web gateway.
          </p>

          <br />

          <p className="font-semibold">Q: Can I access my virtual balance across multiple mobile devices?</p>
          <p>
            <b>A:</b> Yes. Your virtual balance is linked directly to your authenticated, unified FANG account profile. The moment your account updates, your coin balances and reading history will automatically sync across any authorized device interface where you log in.
          </p>
        </div>

        {/* 2 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">2. Billing, Subscriptions &amp; Cancellations</h2>

          <p className="font-semibold">Q: Can I request a refund if I purchase a coin bundle accidentally?</p>
          <p>
            <b>A:</b> No. In accordance with our global Terms of Sale, all virtual currency transactions completed across the FANG platform deliver immediate database utility and are absolute, final, and non-refundable. We do not issue cash refunds, ledger reversals, or promotional credits for inadvertent user choices or unused balances.
          </p>

          <br />

          <p className="font-semibold">Q: What global payment channels are currently accepted on the platform?</p>
          <p>
            <b>A:</b> We support all major international credit/debit card merchant systems (including Visa, Mastercard, American Express, and Discover), encrypted mobile checkout wallets (Apple Pay and Google Pay), and authorized payment partner portals. All financial transactions are settled securely in USD currency.
          </p>

          <br />

          <p className="font-semibold">Q: How do the FANG VIP membership plans and passes operate?</p>
          <p>
            <b>A:</b> VIP plans offer premium, enhanced reading environments tailored to your binging preferences across two distinct structural tiers:
          </p>

          <ul className="list-disc pl-6 space-y-1">
            <li>
              <b>Weekly VIP ($9.99 / week):</b> Grants full weekly access including daily promotional bonus coin distribution drops, completely reduced ad layout profiles, early chapter access privileges, small top-up account bonus triggers, and an exclusive VIP profile status badge.
            </li>
            <li>
              <b>Monthly VIP ($29.99 / month):</b> Our designated best-value framework granting much larger daily coin distribution rewards, maximized top-up bonus multipliers, enhanced premium chapter discounts, entry into platform exclusive content events, maximum monthly coin value utility, and priority tier access to trending premium stories.
            </li>
          </ul>

          <br />

          <p className="font-semibold">Q: How do I terminate my recurring VIP membership?</p>
          <p>
            <b>A:</b> You can cancel your active membership at any time. If you initialized your subscription inside our mobile software interfaces, cancellations must be managed directly within your Apple App Store or Google Play Store account subscription panels. If you subscribed directly on our web platform, you can disable the auto-renewal toggle within your native Account Settings menu. All cancellations must be logged at least 24 hours prior to the next billing cycle timestamp to prevent automated renewal charges.
          </p>
        </div>

        {/* 3 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">3. Account Safety &amp; Technical Support</h2>

          <p className="font-semibold">Q: What happens if a user bypasses support and initiates a formal bank dispute?</p>
          <p>
            <b>A:</b> FANG maintains strict protection mechanisms against payment abuse and unauthorized chargebacks. If an official transaction dispute or chargeback is initiated through a credit card issuer or banking institution without first utilizing our standard dispute desk, our backend system reserves the right to immediately suspend or permanently close the associated account profile to safeguard system integrity.
          </p>

          <br />

          <p className="font-semibold">Q: I completed a coin purchase but my wallet hasn’t updated. What steps should I take?</p>
          <p>
            <b>A:</b> Brief network or database latency can occasionally delay transaction synchronization. We recommend closing and fully restarting your application interface. If your coin balance does not reflect your transaction within 1 hour, please forward a digital copy of your official Stripe, Apple, or Google payment confirmation receipt directly to our team at support@fangapp.io so our technical support engineers can manually verify the ledger entry and credit your account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FANGFAQ;