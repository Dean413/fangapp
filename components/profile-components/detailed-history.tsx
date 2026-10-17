// app/transaction/page.jsx (or pages/transaction.jsx)

import { ArrowLeft, Copy, Download, MessageCircle } from "lucide-react";

export default function TransactionDetails() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark p-6">
            {/* Back Button */}
            <button className="flex items-center gap-2 text-gray-600 dark:text-neutral-300 hover:text-gray-800 dark:hover:text-neutral-100 mb-6 text-sm">
                <ArrowLeft size={16} />
                Back to Transaction History
            </button>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction Details</h1>
                <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">View detailed information about this transaction.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
                {/* Left Card */}
                <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-6 space-y-5">
                    {/* Top Up Badge & Date */}
                    <div className="flex items-start justify-between">
                        <span className="bg-pink-100 dark:bg-pink-500/15 text-pink-500 text-xs font-semibold px-3 py-1 rounded-full">
                            Top Up
                        </span>
                        <div className="text-right text-xs text-gray-400 dark:text-neutral-500">
                            <p>May 20, 2025</p>
                            <p>10:42 AM</p>
                        </div>
                    </div>

                    {/* Icon & Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-800 flex items-center justify-center text-lg">
                            🪙
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white text-base">Web Coins Top Up (2000 Coins)</h2>
                            <p className="text-green-500 text-sm font-medium">✓ Completed</p>
                        </div>
                    </div>

                    {/* Transaction ID */}
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
                        <span>Transaction ID: #TXN20250520104215</span>
                        <button className="hover:text-gray-600 dark:hover:text-neutral-300">
                            <Copy size={12} />
                        </button>
                    </div>

                    <hr className="border-gray-100 dark:border-dark-border" />

                    {/* Details Rows */}
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-neutral-400">Payment Method</span>
                            <span className="text-gray-800 dark:text-neutral-100 font-medium flex items-center gap-1">
                                💳 Visa •••• 4242
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-neutral-400">Amount Paid</span>
                            <span className="text-gray-800 dark:text-neutral-100 font-medium">$19.99 USD</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-neutral-400">Base Coins</span>
                            <span className="text-gray-800 dark:text-neutral-100 font-medium">2,000 Coins</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-neutral-400">Bonus Coins</span>
                            <span className="text-green-500 font-medium">+550 Coins</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-neutral-400">VIP Bonus</span>
                            <span className="text-green-500 font-medium">+200 Coins</span>
                        </div>
                    </div>

                    {/* Total Coins Received */}
                    <div className="bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3 flex justify-between items-center">
                        <span className="font-semibold text-gray-800 dark:text-neutral-100 text-sm">Total Coins Received</span>
                        <span className="text-red-500 font-bold text-sm">2,750 Coins</span>
                    </div>

                    {/* Balance */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-neutral-400">Previous Balance</span>
                            <span className="text-gray-800 dark:text-neutral-100 font-medium">1,850 Coins</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-neutral-400">New Balance</span>
                            <span className="text-gray-800 dark:text-neutral-100 font-medium">4,600 Coins</span>
                        </div>
                    </div>

                    <hr className="border-gray-100 dark:border-dark-border" />

                    {/* Help Section */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-neutral-100 text-sm">Need help with this transaction?</p>
                            <p className="text-gray-400 dark:text-neutral-500 text-xs mt-1">
                                If you have any issues or did not receive your coins, our support team is here to help.
                            </p>
                        </div>
                        <button className="flex items-center gap-2 border border-red-400 text-red-400 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                            <MessageCircle size={14} />
                            Contact Support
                        </button>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                    {/* Order Summary Card */}
                    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Order Summary</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-neutral-400">Package</span>
                                <span className="text-gray-800 dark:text-neutral-100 font-medium">2000 Coins</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-neutral-400">Base Coins</span>
                                <span className="text-gray-800 dark:text-neutral-100 font-medium">2,000</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-neutral-400">Bonus Coins</span>
                                <span className="text-green-500 font-medium">+550</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-neutral-400">VIP Bonus (Weekly)</span>
                                <span className="text-green-500 font-medium">+200</span>
                            </div>

                            <hr className="border-gray-100 dark:border-dark-border" />

                            <div className="flex justify-between font-semibold text-gray-800 dark:text-neutral-100">
                                <span>Total Coins</span>
                                <span className="text-red-500 font-bold">2,750 Coins</span>
                            </div>
                            <div className="flex justify-between font-semibold text-gray-800 dark:text-neutral-100">
                                <span>Total Amount Paid</span>
                                <span className="text-red-500 font-bold">$19.99 USD</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Information Card */}
                    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Payment Information</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-neutral-400">Payment ID</span>
                                <div className="flex items-center gap-1 text-gray-800 dark:text-neutral-100 font-medium">
                                    <span>PAY20250520104215</span>
                                    <button className="hover:text-gray-600 dark:hover:text-neutral-300">
                                        <Copy size={12} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-neutral-400">Payment Method</span>
                                <span className="text-gray-800 dark:text-neutral-100 font-medium">Visa •••• 4242</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-neutral-400">Payment Status</span>
                                <span className="bg-green-100 dark:bg-green-500/15 text-green-600 text-xs font-semibold px-3 py-1 rounded-full">
                                    Completed
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-neutral-400">Date & Time</span>
                                <span className="text-gray-800 dark:text-neutral-100 font-medium">May 20, 2025, 10:42 AM</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-neutral-400">Receipt</span>
                                <button className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium text-sm">
                                    <Download size={14} />
                                    Download Receipt
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Info Banner */}
                    <div className="bg-linear-to-r from-blue-500 to-purple-500 rounded-2xl p-4">
                        <p className="text-white text-xs">
                            ✨ Coins will be added to your account instantly. You can use them to unlock chapters, top up, or enjoy premium features.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}