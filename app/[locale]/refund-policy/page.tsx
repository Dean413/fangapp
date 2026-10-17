const RefundPolicy = () => {
    return (
        <div className="w-full flex justify-center py-10 bg-gray-50 dark:bg-dark">
            <div className="w-[90%] text-black dark:text-white space-y-8 bg-white dark:bg-dark-card p-8">
                <h1 className="text-4xl text-center mb-8 font-bold">FANG Refund Policy</h1>


                <div className="space-y-3">
                    <p className="font-semibold">Powered by FANGVAULT</p>
                    <p>Effective Date: May 29, 2026</p>

                    <p>
                        Thank you for supporting writers and creators on FANG. FANG is operated by IFO DIGITAL MEDIA, LLC.
                    </p>

                    <p>
                        This Refund Policy outlines the strict financial parameters governing all virtual currency purchases and digital VIP subscriptions on the FANG platform. By completing any transaction, you explicitly acknowledge and agree to this No-Refund framework.
                    </p>
                </div>

                {/* 1 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">1. STRICT NO-REFUND POLICY FOR VIRTUAL CURRENCY (COINS)</h2>

                    <p>
                        FANG offers virtual currency ("Coins") used to unlock premium chapters, stories, and features.
                    </p>

                    <p className="font-semibold">Finality of Sale:</p>
                    <p>
                        All Coin purchases are absolute, permanent, instant, and non-refundable.
                    </p>

                    <p className="font-semibold">No Cash Value:</p>
                    <p>
                        Coins have no real-world monetary value and cannot be exchanged or redeemed.
                    </p>

                    <p className="font-semibold">Instant Consumption Waiver:</p>
                    <p>
                        Once Coins are credited to your wallet, the transaction is fully completed and final.
                    </p>

                    <p className="font-semibold">User Error Protection:</p>
                    <p>
                        No refunds for accidental purchases, unintended chapter unlocks, or lost access due to user negligence.
                    </p>

                    <p className="font-semibold">Exceptional Technical Errors:</p>
                    <p>
                        If payment is completed but Coins are not delivered due to a system error, contact support@fangapp.io within 48 hours with proof of transaction.
                    </p>
                </div>

                {/* 2 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">2. DIGITAL VIP SUBSCRIPTION CANCELLATION & BILLING</h2>

                    <ul className="list-disc pl-6 space-y-1">
                        <li>No prorated refunds for partial usage</li>
                        <li>Cancel anytime via Apple, Google Play, Stripe, PayPal, or account settings</li>
                        <li>Deleting the app does not cancel subscriptions</li>
                        <li>Access continues until end of billing cycle</li>
                    </ul>
                </div>

                {/* 3 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">3. ANTI-CHARGEBACK DEFENSE & ACCOUNT TERMINATION</h2>

                    <ul className="list-disc pl-6 space-y-1">
                        <li>Immediate account suspension for chargebacks or disputes</li>
                        <li>Loss of all Coins, bonuses, and reading data</li>
                        <li>Device ID and IP may be blacklisted</li>
                    </ul>
                </div>

                {/* 4 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">4. JURISDICTION-SPECIFIC CONSUMER LAWS</h2>

                    <p>
                        Some regions may enforce different consumer protection laws for digital purchases.
                    </p>

                    <p>
                        Refund requests for App Store or Google Play purchases must be handled directly by those platforms.
                    </p>
                </div>

                {/* 5 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">5. POLICY UPDATES</h2>

                    <p>
                        FANG reserves the right to modify this Refund Policy at any time. Continued use of the platform implies acceptance of updates.
                    </p>
                </div>

                {/* 6 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">6. CORPORATE CONTACT DATA</h2>

                    <p>FANG / IFO DIGITAL MEDIA, LLC</p>
                    <p>1111B S Governors Ave #52111</p>
                    <p>Dover, DE 19904</p>
                    <p>United States</p>

                    <p>Customer Support: support@fangapp.io</p>
                    <p>Legal: legal@fangapp.io</p>

                    <p className="font-semibold">Powered by FANGVAULT</p>
                </div>

            </div>
        </div>
    );
};

export default RefundPolicy;