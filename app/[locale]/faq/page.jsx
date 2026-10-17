const FANGFAQ = () => {
  return (
    <div className="w-full flex justify-center py-10 bg-gray-50">
      <div className="w-[90%] text-black space-y-8 bg-white p-8">
        <h1 className="text-4xl text-center mb-8 font-bold">FANG Faq</h1>


        <div className="space-y-3">
          <p className="font-semibold">FANG ECOSYSTEM — READER & SUBSCRIPTION SUPPORT FAQ</p>
        </div>

        {/* 1 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">1. VIRTUAL COINS & READING ACCESS</h2>

          <p className="font-semibold">Q: What is the difference between Normal Coins and Bonus Coins?</p>

          <p><b>ANSWER:</b></p>

          <p>
            <b>Normal Coins:</b> Purchased directly using your credit card, digital wallet, or mobile store billing.
            These coins never expire and can be used to unlock any premium chapter across FANG, FANG Nova, and FANGVerse.
          </p>

          <p>
            <b>Bonus Coins:</b> Free rewards given to you as a gift for checking in daily, watching short video ads, or completing reading tasks.
            Bonus Coins expire exactly seven (7) days after you receive them, so be sure to spend them right away on your favorite books!
          </p>

          <br />

          <p className="font-semibold">Q: How much does a premium chapter cost to unlock?</p>
          <p>
            <b>ANSWER:</b> Our system unlocks chapters automatically using a dynamic scale designed to match the story's depth.
            Early premium chapters start lower at 20 Coins, middle arcs scale to 35 Coins, and the final high-tension chapters cost 45 Coins.
          </p>

          <br />

          <p className="font-semibold">Q: Why do I get extra rewards when topping up directly on the FANG Web Portal?</p>
          <p>
            <b>ANSWER:</b> Web checkouts allow us to process transactions via direct, lower-cost billing methods.
            We pass these operational savings directly back to our community by granting up to 60% extra Bonus Coins for every package purchased directly through our website store!
          </p>

          <br />

          <p className="font-semibold">Q: Can I access my FANG coins across multiple devices?</p>
          <p>
            <b>ANSWER:</b> Yes! As long as you are logged into your unified FANG account profile, any coins purchased or earned will instantly sync across your digital interfaces, allowing you to seamlessly continue your reading experience on any device.
          </p>
        </div>

        {/* 2 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">2. BILLING, RENEWALS & PURCHASES</h2>

          <p className="font-semibold">Q: Can I get a refund if I purchased a coin package by mistake?</p>
          <p>
            <b>ANSWER:</b> No. All sales on the FANG ecosystem are final, instant, and completely non-refundable.
            Because digital currency delivers instant reading utility to your profile data, we do not offer refunds, exchanges, or credits for user purchasing errors, accidental chapter unlocks, or unused balances.
          </p>

          <br />

          <p className="font-semibold">Q: What payment methods do you accept globally?</p>
          <p>
            <b>ANSWER:</b> We accept all major international credit/debit cards (Visa, Mastercard, American Express, Discover), secure mobile verification wallets (Apple Pay and Google Pay), and PayPal.
            All transactions are securely processed in USD currency.
          </p>

          <br />

          <p className="font-semibold">Q: How do the Silver VIP and Gold VIP memberships work?</p>
          <p>
            <b>ANSWER:</b> VIP tiers offer a premium, ad-free reading experience:
          </p>

          <ul className="list-disc pl-6 space-y-1">
            <li><b>Silver VIP ($4.99/mo):</b> Shuts off all forced advertisements completely and instantly drops 500 Bonus Coins into your account every month.</li>
            <li><b>Gold VIP ($14.99/mo):</b> Shuts off all advertisements, drops a massive 2,000 Bonus Coins monthly, and grants you 3 Chapters Early Access to read unreleased chapters before standard users!
            </li>
          </ul>

          <br />

          <p className="font-semibold">Q: How do I cancel my VIP Membership?</p>
          <p>
            <b>ANSWER:</b>  You can cancel your subscription at any time. If you subscribed inside our mobile apps, you must manage and cancel the renewal directly within your Apple App Store Subscription Settings or Google Play Store Subscriptions Portal. If you subscribed on our web platform, you can click cancel inside your Account Settings menu. You must cancel at least 24 hours before your renewal date to avoid being billed for the next 30-day block.

          </p>
        </div>

        {/* 3 */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">3. ACCOUNT INTEGRITY & SUPPORT</h2>

          <p className="font-semibold">Q: What happens if I file a dispute or chargeback with my bank?</p>
          <p>
            <b>ANSWER:</b>FANG maintains a zero-tolerance policy against billing abuse and friendly fraud. If a user bypasses our support desk to file an official transaction dispute or chargeback request through their credit card issuer or bank, our backend system will instantly and permanently terminate that account profile. All remaining coins and reading history will be permanently forfeited, and the device ID will be blacklisted from our network.
          </p>

          <br />

          <p className="font-semibold">Q: I bought coins but they haven't appeared. What should I do?</p>
          <p>
            <b>ANSWER:</b>  Network latency can occasionally delay database syncs by a few minutes. Try closing and fully restarting your application. If your coins do not reflect within 1 hour, please email a screenshot of your official Apple, Google, or Stripe receipt directly to our support desk at support@fangapp.io so our data engineers can manually credit your profile.

          </p>
        </div>
      </div>
    </div>
  );
};

export default FANGFAQ;