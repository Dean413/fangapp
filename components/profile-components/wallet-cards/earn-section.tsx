import Image from "next/image"
import { EngagementItem, SectionTitle, SocialItem } from "./earn-card"
import ReadingRewards from "./reading-time-reward"
import { FaBook, FaBookOpenReader, FaLinkedin, FaLinkedinIn, FaReddit, FaShareNodes, FaTiktok, FaTimeline, FaUser, FaUserPlus, FaVideo, FaXTwitter } from "react-icons/fa6"
import { CircleDashed, Clock, Clock1, Clock5Icon, LoaderCircle, RefreshCcw, Share2, Target, Wand, Wand2 } from "lucide-react"
import { useEffect, useState } from "react"
import DailyCheckIn from "./daily-reward"
import { FaBookOpen, FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa"
import { RedditLogo } from "phosphor-react"
import CoinCard from "./coin-card"
import { useWalletStore } from "@/lib/store/wallet-action-store"

const EarnSection = () => {
    const { active, setActive } = useWalletStore()
    let totalBalance = 0

    return (
        <div>
            {active === "earn" && (
                <>


                    {/* Sections */}
                    <SectionTitle title={
                        <div className="flex gap-2">
                            <Clock5Icon className="text-xs text-red-500" />
                            <p>Time reading reward</p>
                        </div>
                    } />
                    <ReadingRewards />

                    <DailyCheckIn />

                    <SectionTitle title={
                        <div className="flex gap-2 items-center mb-4">
                            <Target color="red" />
                            <p>General Engagement Rewards</p>
                        </div>
                    } />
                    <div className="space-y-3">
                        <EngagementItem
                            icon={
                                <div className="bg-red-200 dark:bg-red-500/25 p-3 rounded-lg">
                                    <FaVideo size={30} color="red" />
                                </div>
                            }
                            title="Watch a video"
                            coins={5}
                            target={25}
                            progress={18}
                            showProgress

                        />

                        <EngagementItem
                            icon={
                                <div className="bg-red-200 dark:bg-red-500/25 p-3 rounded-lg">
                                    <FaUserPlus size={30} color="red" />
                                </div>
                            }
                            title="Invite a friend"
                            text="Earn coins for every friend you invite to FANG"
                            coins={100}
                            progress={0}
                            target={0}
                            showProgress={false}



                        />
                        <EngagementItem
                            icon={
                                <div className="bg-red-200 dark:bg-red-500/25 p-3 rounded-lg">
                                    <FaBookOpen size={30} color="red" />
                                </div>
                            }
                            title="Read 3 different stories"
                            coins={30}
                            progress={1}
                            target={3}
                            showProgress
                        />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-3">
                            <SectionTitle title={
                                <div className="flex items-center gap-2">
                                    <FaShareNodes className="text-red-500" />
                                    <p>New User Social Rewards</p>
                                </div>
                            } />

                            <SocialItem
                                icon={
                                    <div className="bg-red-200 dark:bg-red-500/25 p-4 rounded-lg">
                                        <FaInstagram color="red" size={20} />
                                    </div>

                                }
                                platform="Instagram"
                            />
                            <SocialItem
                                icon={
                                    <div className="bg-red-200 dark:bg-red-500/25 p-4 rounded-lg">
                                        <FaYoutube color="red" size={20} />
                                    </div>

                                } platform="YouTube" />
                            <SocialItem
                                icon={
                                    <div className="bg-blue-200 dark:bg-blue-500/25 p-4 rounded-lg">
                                        <FaFacebook color="blue" size={20} />
                                    </div>

                                } platform="Facebook" />
                            <SocialItem
                                icon={
                                    <div className="bg-gray-200 dark:bg-neutral-800 p-4 rounded-lg">
                                        <FaTiktok color="black" size={20} />
                                    </div>

                                } platform="TikTok" />
                            <SocialItem
                                icon={
                                    <div className="bg-blue-200 dark:bg-blue-500/25 p-4 rounded-lg">
                                        <FaLinkedinIn color="blue" size={20} />
                                    </div>
                                } platform="LinkedIn" />
                            <SocialItem
                                icon={
                                    <div className="bg-gray-200 dark:bg-neutral-800 p-4 rounded-lg">
                                        <FaXTwitter color="black" size={20} />
                                    </div>
                                } platform="X / Twitter" />
                            <SocialItem
                                icon={
                                    <div className="bg-orange-200 dark:bg-orange-500/25 p-4 rounded-lg">
                                        <RedditLogo color="orange" size={20} />
                                    </div>
                                } platform="Reddit" />
                        </div>

                        <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center mt-8">
                            <p className="text-yellow-600 text-2xl">🏆</p>
                            <h3 className="text-lg font-bold mt-2">Total Possible</h3>
                            <p className="text-3xl font-bold">105</p>
                            <p className="text-sm text-gray-600 dark:text-neutral-300">Coins</p>
                            <button className="mt-4 bg-orange-400 text-white px-4 py-2 rounded-full">Get Started</button>
                        </div>
                    </div>
                </>
            )}


            {active === "topup" && (
                <CoinCard />
            )}
        </div>
    )
}

export default EarnSection