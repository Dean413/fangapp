const RefundPolicy = () => {
    return (
        <div className="w-full flex justify-center py-4 md:py-10 bg-gray-50 dark:bg-dark">
            <div className="w-[90%] text-black dark:text-white space-y-8 bg-white dark:bg-dark-card p-5 md:p-8">
                <h1 className="text-4xl text-center mb-8 font-bold">Refund Policy</h1>

                <div className="space-y-3">
                    <p className="font-semibold">Powered by FANGVAULT</p>
                    <p>Effective Date: August 18, 2026</p>

                    <p>
                        Thank you for supporting writers and creators on FANG. The FANG platform is owned and operated by IFO DIGITAL MEDIA, LLC.
                    </p>

                    <p>
                        This Refund Policy outlines the professional financial parameters governing all virtual currency transactions and digital VIP memberships completed across the FANG platform ecosystem. By initiating any transaction or premium purchase on our platform, you explicitly acknowledge and agree to the comprehensive terms outlined below.
                    </p>
                </div>

                {/* 1 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">1. Terms of Sale for Virtual Currency (Coins)</h2>

                    <p>
                        FANG utilizes digital currency (“Coins”) to enable users to systematically unlock premium chapters, exclusive stories, and specialized platform features.
                    </p>

                    <p>
                        <span className="font-semibold">Finality of Sale:</span> All virtual currency bundle purchases completed on our web portal or mobile applications are absolute, permanent, instant, and entirely non-refundable.
                    </p>

                    <p>
                        <span className="font-semibold">No Cash Value:</span> Coins possess zero real-world monetary value, are completely non-transferable, and can never be exchanged, redeemed, or reversed for fiat cash or external financial credit.
                    </p>

                    <p>
                        <span className="font-semibold">Instant Consumption Waiver:</span> Digital coin top-ups deliver immediate database utility. The exact second Coins are credited to your user wallet profile, the contract of sale is fulfilled in its entirety. You explicitly waive any statutory right of withdrawal, consumer cooling-off periods, or transaction cancellations.
                    </p>

                    <p>
                        <span className="font-semibold">User Error Protection:</span> FANG does not issue refunds, replacements, or account credits for Coins purchased accidentally, Coins spent unlocking chapters inadvertently, or balances lost due to credentials compromised via user negligence.
                    </p>

                    <p>
                        <span className="font-semibold">Exceptional Technical Failures:</span> If a verifiable payment infrastructure failure occurs where funds are successfully cleared from your payment card but digital Coins are not delivered due to a database glitch, you must contact support@fangapp.io within forty-eight (48) hours with verified transaction logs. FANG reserves the right, at its sole discretion, to credit replacement digital Coins after account audit completion.
                    </p>
                </div>

                {/* 2 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">2. Digital VIP Memberships and Billing Cycles</h2>

                    <p>
                        FANG offers recurring weekly &amp; monthly subscription options providing premium platform access.
                    </p>

                    <p>
                        <span className="font-semibold">No Prorated Credits:</span> We do not issue prorated refunds or partial credits for unused days within an active monthly billing period.
                    </p>

                    <p>
                        <span className="font-semibold">Cancellation Parameters:</span> You may cancel your VIP subscription at any time through your respective Apple account settings, Google Play settings, or website account settings. Deleting the FANG application from your device does not cancel your recurring subscription.
                    </p>

                    <p>
                        <span className="font-semibold">App Deletion Rules:</span> Uninstalling or deleting the FANG application from your device does not cancel or suspend your active recurring VIP billing configuration.
                    </p>

                    <p>
                        <span className="font-semibold">Access Preservation:</span> Upon successful cancellation, premium VIP features will remain active on your profile until the conclusion of the current paid billing cycle.
                    </p>
                </div>

                {/* 3 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">3. Payment Integrity and Account Verification</h2>

                    <p>
                        To safeguard our payment systems and protect our network against fraudulent activity, FANG enforces strict transaction verification standards:
                    </p>

                    <p>
                        <span className="font-semibold">Account Suspension Flags:</span> If an official transaction dispute, chargeback request, or payment reversal is initiated through a credit card issuer or bank without first utilizing our dedicated internal support channel, our platform systems reserve the right to immediately suspend or permanently close the associated user account.
                    </p>

                    <p>
                        <span className="font-semibold">Forfeiture of Ledger Data:</span> In the event of an account closure resulting from billing abuse, all remaining virtual Coin balances, accumulated promotional bonuses, unlocked reading access records, and account data histories are instantly and permanently forfeited.
                    </p>

                    <p>
                        <span className="font-semibold">Hardware Restrictions:</span> To preserve platform infrastructure integrity, FANG reserves the right to programmatically block related hardware device IDs and associated network addresses involved in repeated transaction disputes.
                    </p>
                </div>

                {/* 4 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">4. Jurisdiction-Specific Consumer Provisions</h2>

                    <p>
                        Certain global regions enforce mandatory statutory protections regarding digital software and consumption content transactions. If consumer protection laws in your local jurisdiction legally override our standard platform policy, our direct refund liability will strictly adapt to the absolute minimum parameters required by those regional mandates.
                    </p>

                    <p>
                        Note: Any purchase cleared through the Apple App Store or Google Play Store payment infrastructures must be handled directly through their respective platform support desks, in accordance with their individual consumer refund guidelines.
                    </p>
                </div>

                {/* 5 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">5. Policy Updates</h2>

                    <p>
                        FANG reserves the right to modify or replace this Refund Policy at any time. Continued use of our primary domain or application features following the publication of any text amendments constitutes official acceptance of the updated terms.
                    </p>
                </div>

                {/* 6 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">6. Corporate Contact Information</h2>

                    <p>
                        For operational questions regarding missing delivery data or platform technical bugs, please contact our legal and support structures directly.
                    </p>

                    <p>FANG / IFO DIGITAL MEDIA, LLC</p>
                    <p>1111B S Governors Ave STE 52111</p>
                    <p>Dover, DE 19904</p>
                    <p>United States</p>

                    <p>Customer Support: support@fangapp.io</p>
                    <p>Legal Infrastructure: legal@fangapp.io</p>

                    <p className="font-semibold">Powered by FANGVAULT</p>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicy;