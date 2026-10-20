const DMCAPolicy = () => {
    return (
        <div className="w-full flex justify-center py-4 md:py-10 bg-gray-50 dark:bg-dark">
            <div className="w-[90%] text-black dark:text-white space-y-8 bg-white dark:bg-dark-card p-5 md:p-8">
                <h1 className="text-4xl text-center mb-8 font-bold">DMCA Guidelines</h1>

                <div className="space-y-3">
                    <p className="font-semibold">Powered by FANGVAULT</p>
                    <p>Effective Date: August 18, 2026</p>
                    <p>DMCA Designated Agent Registration ID: DMCA-1073241</p>

                    <p>
                        FANG respects intellectual property rights and expects all readers, writers, publishers, editors, and platform partners to do the same. We are committed to maintaining a lawful, creator-focused, and fair digital storytelling ecosystem. FANG strictly prohibits the publication of content that infringes upon third-party copyrights, trademarks, patents, or proprietary rights.
                    </p>

                    <p>
                        This Copyright Policy details the specific procedures through which intellectual property owners may report alleged digital infringement, and outlines how platform users may respond to claims submitted against their hosted content. FANG operates in compliance with the Digital Millennium Copyright Act (“DMCA”) Safe Harbor provisions applicable to online digital service providers.
                    </p>

                    <p>
                        The FANG service infrastructure is operated by IFO DIGITAL MEDIA, LLC, 1111B S Governors Ave STE 52111, Dover, DE 19904, United States.
                    </p>

                    <p>Support Desk: support@fangapp.io</p>
                    <p>Legal Operations: legal@fangapp.io</p>
                </div>

                {/* 1 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">1. Protocol for Reporting Copyright Infringement</h2>

                    <p>
                        If you have a good-faith belief that creative materials available across the FANG service infringe upon your original copyright or intellectual property rights, you may submit a formal written copyright complaint (“DMCA Notice”) directly to our legal department.
                    </p>

                    <p>
                        Your notice must contain specific, comprehensive details enabling us to verify your claim and locate the disputed material. Where legally appropriate and mandated, FANG may share a copy of your complaint, including your provided contact information, with the specific platform user who uploaded the reported story files.
                    </p>
                </div>

                {/* 2 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">2. Statutory Criteria for a Valid DMCA Notice</h2>
                    <p>To evaluate and process your copyright claim quickly, your written notice must include the following components:</p>

                    <p className="font-semibold">a) Identification of the Protected Work</p>
                    <p>A description of the original copyrighted work or proprietary intellectual property you claim has been actively infringed.</p>

                    <p className="font-semibold">b) Identification of the Infringing Material</p>
                    <p>The specific story title, chapter numbers (if applicable), author username, and the direct URL link or inside-application location parameters necessary to isolate the content.</p>

                    <p className="font-semibold">c) Claimant Contact Details</p>
                    <p>Your full legal name, active email address, physical mailing address, and telephone number.</p>

                    <p className="font-semibold">d) Supporting Verification Records</p>
                    <p>Copies of formal copyright registration certificates, original timestamped publication logs, historical creative drafts, or relevant distribution licensing agreements.</p>

                    <p className="font-semibold">e) Good-Faith Affirmation</p>
                    <p>An explicit statement that you have a good-faith belief that the disputed use of the intellectual property is not authorized by the copyright owner, its legal agent, or current federal statutes.</p>

                    <p className="font-semibold">f) Perjury Declaration</p>
                    <p>A statement made under penalty of perjury that the data provided within your notice is entirely accurate, and that you are the copyright holder or are legally authorized to act on behalf of the owner.</p>

                    <p className="font-semibold">g) Authorized Signature</p>
                    <p>A physical or verified electronic signature of the copyright owner or an authorized legal representative.</p>
                </div>

                {/* 3 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">3. Submission Channels for Copyright Complaints</h2>
                    <p>Please route your completed, signed DMCA Notice directly to our compliance office:</p>
                    <p>Department: FANG Legal Infrastructure</p>
                    <p>Email Channel: legal@fangapp.io</p>
                    <p>Subject Header: DMCA Notice - [Insert Story Title]</p>
                    <p>
                        Note: FANG reserves the right to request additional identification documentation or text logs before executing removal actions if the initial notice lacks sufficient details.
                    </p>
                </div>

                {/* 4 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">4. Counter-Notification Process</h2>
                    <p>
                        If your published writing has been removed or hidden due to a copyright complaint, and you believe this action occurred as a result of a mistake, misidentification, or a fair-use protection, you may file a formal counter-notification.
                    </p>

                    <p>Your counter-notice must be submitted in writing to legal@fangapp.io and must contain:</p>

                    <ul className="list-disc pl-6 space-y-1">
                        <li>Your full legal name, telephone number, physical address, and email details</li>
                        <li>A description of the material that was hidden or removed and its original platform location prior to isolation</li>
                        <li>A statement made under penalty of perjury that you have a good-faith belief that the content was removed or disabled due to mistake or misidentification</li>
                        <li>An explicit statement consenting to the jurisdiction of the Federal District Court for the judicial district in which your address is located (or Delaware, if operating outside the United States), and that you will accept service of process from the original complaining party</li>
                        <li>Your physical or verified electronic signature</li>
                    </ul>

                    <p>
                        Upon receipt of a valid counter-notification, FANG will forward it to the original complainant. If the copyright owner does not file a court action seeking a restraining order against the content within ten (10) business days, our system is authorized under safe harbor rules to restore the hidden material to public view.
                    </p>
                </div>

                {/* 5 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">5. Automated Content Integrity &amp; Repeat Infringer Policy</h2>
                    <p>
                        In alignment with our automated Acceptable Use Policy (AUP) controls, FANG enforces a zero-tolerance policy against repeat infringers and systemic plagiarism:
                    </p>

                    <ul className="list-disc pl-6 space-y-1">
                        <li>
                            <span className="font-semibold">Systemic Violations:</span> A repeat infringer includes any user profile that repeatedly uploads unauthorized content, accumulates multiple distinct valid DMCA notices, or attempts to circumvent platform digital locks.
                        </li>
                        <li>
                            <span className="font-semibold">Automated Enforcement:</span> Users may flag copyright violations directly inside our reading interface via our native “Report Book” protocols. Our system programmatically tallies these signals to isolate, restrict, and automatically demonetize high-risk content pending formal review.
                        </li>
                        <li>
                            <span className="font-semibold">Account Deactivation:</span> FANG reserves the absolute right to suspend, restrict, or permanently terminate any user account or creator profile found in chronic violation of this section.
                        </li>
                        <li>
                            <span className="font-semibold">Forfeiture of Ledger Balances:</span> In cases of severe, systemic plagiarism or deliberate copyright fraud, FANG reserves the right to permanently withhold accrued virtual coin earnings, promotional bonuses, and publisher rewards generated via the infringing material.
                        </li>
                    </ul>
                </div>

                {/* 6 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">6. Protection Against Fraudulent and Abusive Claims</h2>
                    <p>
                        Under Section 512(f) of the DMCA, any individual who knowingly materially misrepresents that online material is infringing can be held legally liable for damages, including court costs and attorneys&apos; fees incurred by the alleged infringer or the platform provider. FANG will actively pursue account deactivation and legal remedies against any party who knowingly submits false, malicious, or misleading copyright notices to disrupt our creators.
                    </p>
                </div>

                {/* 7 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">7. Platform Neutrality Framework</h2>
                    <p>
                        FANG operates fundamentally as a neutral online service provider. We do not pre-screen all serialized manuscript text before publication, nor do we independently investigate the absolute copyright chain of every chapter uploaded by creators to FangWriters.
                    </p>
                    <p>
                        Upon receipt of valid legal notices, we act immediately to review, isolate, or restrict access to the disputed material in complete compliance with federal safe harbor regulations. FANG reserves the right to temporarily disable access to or demonetize content at its sole discretion while an active copyright audit is ongoing.
                    </p>
                </div>

                {/* 8 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">8. Artificial Intelligence (AI) Content Regulations</h2>
                    <p>
                        Platform uploaders bear 100% responsibility for ensuring that any AI-assisted or AI-generated text, artwork, or cover designs uploaded to the platform do not infringe upon the copyrights, trademarks, or publicity rights of third parties. The utilization of generative software tools does not transfer or remove liability from the uploader.
                    </p>
                    <p>
                        FANG reserves the absolute right to remove AI-generated stories that trigger our automated content matching or user-reporting systems. Furthermore, unedited AI-generated text content does not guarantee corporate contract eligibility, bonus allocations, or custom platform marketing promotions.
                    </p>
                </div>

                {/* 9 */}
                <div className="space-y-3">
                    <h2 className="font-bold text-xl">9. International Rights Documentation</h2>
                    <p>
                        If you are logging an intellectual property complaint on behalf of an international publishing house, foreign literary agency, or corporate group, FANG may request official proof of legal authorization, corporate business registries, or localization power-of-attorney documentation. Any supporting records submitted in languages other than English must be accompanied by certified English translations to be evaluated.
                    </p>
                </div>

                {/* 10 */}
                <div className="space-y-2">
                    <h2 className="font-bold text-xl">10. Contact Information</h2>

                    <p>FANG / IFO DIGITAL MEDIA, LLC</p>
                    <p>1111B S Governors Ave STE 52111</p>
                    <p>Dover, DE 19904</p>
                    <p>United States</p>

                    <p>Reader Support: support@fangapp.io</p>
                    <p>Legal Department: legal@fangapp.io</p>

                    <p className="font-semibold">Powered by FANGVAULT</p>
                </div>
            </div>
        </div>
    );
};

export default DMCAPolicy;