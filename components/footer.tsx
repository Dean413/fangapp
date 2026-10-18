import { FaInstagram, FaFacebook, FaGooglePlay, FaAppStoreIos, FaLinkedin } from "react-icons/fa";
import { FaTiktok, FaXTwitter } from "react-icons/fa6"
import Image from "next/image";
import Link from "next/link";

const Footer = () => {
    return (
        <footer className="bg-gray-950 dark:bg-black dark:border-t dark:border-dark-border text-white py-12 px-6 ">
            <div className="max-w-8xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-10">

                {/* Brand Section — full width on mobile */}
                <div className="col-span-2 sm:col-span-3 md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left">
                    <div className="text-3xl font-bold uppercase tracking-widest flex items-center gap-3">
                        <Image
                            src="/fang_pictures/fangfooter.png"
                            width={220}
                            height={220}
                            alt="landing logo"
                            className="w-8 md:w-10 md:h-10 object-contain"
                        />

                        <Image
                            src="/fang_pictures/landinglogo2.png"
                            width={200}
                            height={200}
                            alt="Where Obsession Bites"
                            className="w-20 md:w-20 object-contain"
                        />

                    </div>
                    <p className="mt-2 text-[#A3A3A3]">Where Obsession Bites</p>
                    <div className="mt-4 flex flex-col items-center md:items-start gap-3 text-gray-300">

                        {/* Row 1 */}
                        <div className="flex gap-2">
                            <div className="rounded-full p-5 w-3 h-3 border border-gray-500 flex items-center justify-center">
                                <a href="https://x.com/fangappio">
                                    <FaXTwitter className="cursor-pointer hover:text-blue-500 transition" />
                                </a>
                            </div>

                            <div className="rounded-full p-5 w-3 h-3 border border-gray-500 flex items-center justify-center">
                                <a href="https://www.instagram.com/fangappio">
                                    <FaInstagram className="w-5 h-5 cursor-pointer hover:text-pink-500 transition" />
                                </a>
                            </div>

                            <div className="rounded-full p-5 w-3 h-3 border border-gray-500 flex items-center justify-center">
                                <a href="https://www.facebook.com/fangappio">
                                    <FaFacebook className="w-5 h-5 cursor-pointer hover:text-blue-600 transition" />
                                </a>
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div className="flex gap-2 mx-auto">
                            <div className="rounded-full p-5 w-3 h-3 border border-gray-500 flex items-center justify-center">
                                <a href="https://www.linkedin.com/company/fangappio">
                                    <FaLinkedin className="w-5 h-5 cursor-pointer hover:text-blue-600 transition" />
                                </a>
                            </div>

                            <div className="rounded-full p-5 w-3 h-3 border border-gray-500 flex items-center justify-center">
                                <a href="https://www.tiktok.com/@fangappio">
                                    <FaTiktok className="w-5 h-5 cursor-pointer hover:text-black transition" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Genres */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <h3 className="text-lg font-semibold uppercase mb-4 tracking-wide">
                        Hot Genres
                    </h3>
                    <ul className="space-y-2 text-[#A3A3A3]">
                        <li><Link href="/">Romance</Link></li>
                        <li><Link href="/">Fantasy</Link></li>
                        <li><Link href="/">Mafia</Link></li>
                        <li><Link href="/">Billionaire</Link></li>
                        <li><Link href="/">Werewolf</Link></li>
                    </ul>
                </div>

                {/* Company */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <h3 className="text-lg font-semibold uppercase mb-4 tracking-wide">
                        Company
                    </h3>
                    <ul className="space-y-2 text-[#A3A3A3]">
                        <li><Link href="/about">About Fang</Link></li>
                        <li><Link href="/">Contact</Link></li>
                        <li><Link href="/refund-policy">Refund Policy</Link></li>
                        <li><Link href="/dcma">DMCA</Link></li>
                    </ul>
                </div>

                {/* Support */}
                <div className="flex col-span-2 md:col-span-1 flex-col items-center md:items-start text-center md:text-left">
                    <h3 className="text-lg font-semibold uppercase mb-4 tracking-wide">
                        Support
                    </h3>
                    <ul className="space-y-2 text-[#A3A3A3]">
                        <li><Link href="/faq">Faq</Link></li>
                        <li><Link href="/community-guidelines">Community</Link></li>
                        <li><Link href="/cookie-policy">Cookies</Link></li>
                        <li><Link href="/terms">Terms of Service</Link></li>
                        <li><Link href="/privacy-policy">Privacy Policy</Link></li>

                    </ul>
                </div>

                {/* Download Buttons */}
                {/* <div className="col-span-2 sm:col-span-1 flex flex-col items-center md:items-start space-y-4"> */}
                {/* Google Play */}
                {/* <div className="border border-gray-500 w-44 p-3 rounded-2xl text-center hover:bg-gray-800 transition cursor-pointer">
                        <div className="flex items-center justify-center gap-2">
                            <FaGooglePlay className="w-5 h-5" />
                            <div className="text-left leading-tight">
                                <p className="text-[10px] text-gray-500 uppercase">Download on</p>
                                <p className="font-semibold text-sm">Google Play</p>
                            </div>
                        </div>
                    </div> */}

                {/* App Store */}
                {/* <div className="border border-gray-500 w-44 p-3 rounded-2xl text-center hover:bg-gray-800 transition cursor-pointer">
                        <div className="flex items-center justify-center gap-2">
                            <FaAppStoreIos className="w-5 h-5" />
                            <div className="text-left leading-tight">
                                <p className="text-[10px] text-gray-500 uppercase">Download on</p>
                                <p className="font-semibold text-sm">App Store</p>
                            </div>
                        </div>
                    </div> */}
                {/* </div> */}


            </div>

            {/* Bottom bar */}
            <div className="max-w-8xl flex justify-between mx-auto mt-10 pt-6 border-t border-gray-800 text-center text-xs text-[#A3A3A3]">
                <p> © {new Date().getFullYear()} FANG. All rights reserved.</p>
                <p>Powered by FANGVAULT</p>
            </div>
        </footer>
    );
};

export default Footer;