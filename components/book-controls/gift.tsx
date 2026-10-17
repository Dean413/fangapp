"use client";

import { Gem, GemIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { FaGem } from "react-icons/fa6"
import { GiGemChain } from "react-icons/gi";





type Gift = {
    id: number;
    label: string;
    value: string;
    icon: string;
};

const gifts: Gift[] = [
    { id: 1, label: "10 Coins", value: "10 coins", icon: "/fang_pictures/balance.png" },
    { id: 2, label: "flowers", value: "$0.49", icon: "/fang_pictures/gift-icons/bouquet-of-flowers.png" },
    { id: 3, label: "cupcake", value: "$0.49", icon: "/fang_pictures/gift-icons/cupcake.png" },
    { id: 4, label: "rocket", value: "$0.49", icon: "/fang_pictures/gift-icons/rocket.png" },
    { id: 5, label: "pen", value: "10 coins", icon: "/fang_pictures/gift-icons/pen.png" },
    { id: 6, label: "crown", value: "$0.49", icon: "/fang_pictures/gift-icons/crown.png" },
    { id: 7, label: "candy", value: "$0.49", icon: "/fang_pictures/gift-icons/candy.png" },
    { id: 8, label: "taco", value: "$0.49", icon: "/fang_pictures/gift-icons/taco.png" },
    { id: 9, label: "hamburger", value: "10 coins", icon: "/fang_pictures/gift-icons/hamburger.png" },
    { id: 10, label: "moon cake", value: "$0.49", icon: "/fang_pictures/gift-icons/moon-cake.png" },
    { id: 11, label: "pizza", value: "$0.49", icon: "/fang_pictures/gift-icons/pizza.png" },
    { id: 12, label: "ship", value: "$0.49", icon: "/fang_pictures/gift-icons/ship.png" },
];


const rubyTasks = [
    {
        id: 1,
        title: "Reading Task",
        amount: "+1",
        desc: "You will get 1 gem for 30 minutes of reading everyday",

    },
    {
        id: 2,
        title: "Top Up",
        amount: "+3",
        desc: "Everytime you top up any amount, you will get three rubies",

    }
];


export default function GiftCard({ onClose, title, image }: any) {
    const [ownedGems, setOwnedGems] = useState(5); // from API
    const [selectedGems, setSelectedGems] = useState(0);
    const [active, setActive] = useState("gifts");
    const [selectedGift, setSelectedGift] = useState<Gift | null>(null);

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1" onClick={onClose} />
            <div className="w-80 md:w-125 fixed md:right-15 right-5 top-1/2 -translate-y-1/2 bg-white dark:bg-dark-card rounded-xl shadow-xl z-50">
                {/* Tabs */}
                <div className="flex border-b border-gray-500 dark:border-neutral-600">
                    <button onClick={() => setActive("ruby")}
                        className={`w-1/2 py-5 text-sm font-semibold ${active === "ruby" ? "bg-red-200 dark:bg-red-500/25" : ""} text-black dark:text-white rounded-t-xl`}>
                        RUBY
                    </button>

                    <button onClick={() => setActive("gifts")}
                        className={`w-1/2 py-5 text-sm font-semibold ${active === "gifts" ? "bg-red-200 dark:bg-red-500/25" : ""} text-black dark:text-white rounded-t-xl`}>
                        GIFTS
                    </button>
                </div>

                {/* Header */}
                <div className="bg-red-100 dark:bg-red-500/15 px-4 py-3 font-semibold text-gray-800 dark:text-neutral-100">
                    Fans Contribution
                </div>

                {/* Gifts */}
                {active === "gifts" && (
                    <div className="grid grid-cols-4 md:grid-cols-4 gap-1 md:gap-5 p-2 md:6">
                        {gifts.map((gift) => (
                            <div key={gift.id} onClick={() => setSelectedGift(gift)}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border bg-white dark:bg-dark-card shadow-sm hover:shadow-md transition cursor-pointer
                                ${selectedGift === gift ? "bg-red-100 dark:bg-red-500/15 border-red-500" : "border-gray-200 dark:border-dark-border"}`}>
                                <Image
                                    src={gift.icon}
                                    alt={gift.label}
                                    width={28}
                                    height={28}
                                    className="mb-2"
                                />
                                <p className="text-xs font-medium text-gray-700 dark:text-neutral-200 text-center">
                                    {gift.value}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Ruby */}
                {active === "ruby" && (
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-5">
                            <Image
                                src={image}
                                alt="book"
                                width={100}
                                height={100}
                                className="rounded-lg"
                            />
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
                                <p className="text-sm text-gray-600 dark:text-neutral-300">400 Readers Voted</p>
                            </div>
                        </div>
                        <h2 className="text-red-400 text-xl mb-5">How to get Rubies</h2>
                        <div>
                            {rubyTasks.map((task) => (
                                <div
                                    className="flex justify-between items-center mb-5"
                                    key={task.id}>

                                    <div>
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <span>{task.title}</span>

                                            <Image
                                                src="/fang_pictures/gift-icons/ruby.png"
                                                alt="gems"
                                                width={20}
                                                height={20}
                                            />

                                            <span className="text-red-500">
                                                {task.amount}
                                            </span>
                                        </div>

                                        <p className="text-[8px] md:text-xs text-gray-500 dark:text-neutral-400">
                                            {task.desc}
                                        </p>
                                    </div>


                                    {task.title === "Top Up" && (
                                        <button className="text-red-500 text-xs md:text-sm font-semibold cursor-pointer">
                                            Top up {">"}
                                        </button>
                                    )}

                                </div>
                            ))}

                        </div>

                        <div className="flex justify-between items-center mt-8">
                            <div >
                                <div className="border rounded-full px-4 py-1 flex gap-3 items-center">
                                    <button onClick={() => setSelectedGems(prev => Math.max(0, prev - 1))}>
                                        -
                                    </button>
                                    <span>{selectedGems}</span>
                                    <button onClick={() => setSelectedGems(prev => Math.min(ownedGems, prev + 1))}>
                                        +
                                    </button>
                                </div>

                                <div className="text-sm">
                                    <p>{ownedGems - selectedGems} Gem Left</p>
                                </div>
                            </div>
                            <button disabled={selectedGems == 0} onClick={() => alert(`sent ${selectedGems} votes`)} className={`${selectedGems === 0 ? "bg-red-200 dark:bg-red-500/25" : "bg-red-700"} cursor-pointer text-white px-8 py-3 rounded-full font-semibold flex items-center gap-3`}>
                                <Image src="/fang_pictures/gift-icons/ruby.png" alt="gems" width={20} height={20} />
                                <span>Vote</span>
                            </button>
                        </div>
                    </div>
                )}
                {/* Button */}
                {active === "gifts" && (
                    <div className="p-4">
                        <button disabled={!selectedGift} onClick={() => alert(`sent ${selectedGift?.label} to author`)} className={`w-full cursor-pointer py-3 rounded-full ${selectedGift ? "bg-red-700" : "bg-red-300"} text-white font-semibold transition`}>
                            Send
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}