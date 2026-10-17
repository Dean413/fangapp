export default function SettingsSheet({ settings, setSettings, onClose }: any) {
    return (
        <div className="fixed inset-0 z-50 flex">
            {/* CLICK OUTSIDE */}
            <div className="flex-1" onClick={onClose} />
            {/* RIGHT PANEL */}
            <div className="md:flex fixed md:right-15 right-5 top-1/2 w-80  md:w-100 -translate-y-1/2 flex-col gap-4 bg-white dark:bg-dark-card rounded-xl shadow-xl  px-3 py-4 z-50">
                <h2 className="text-center text-black dark:text-white font-bold text-lg mb-6">
                    DISPLAY OPTIONS
                </h2>

                {/* THEME SECTION */}
                <div className="mb-8">
                    <p className="text-gray-500 dark:text-neutral-400 font-semibold mb-3">THEME</p>
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { id: "light", bg: "bg-white text-black border border-gray-200" },
                            { id: "sepia", bg: "bg-[#f4ecd8] text-black" },
                            { id: "dark", bg: "bg-gray-800 text-white" },
                            { id: "black", bg: "bg-black text-white dark:border dark:border-neutral-700" },
                        ].map((theme) => (
                            <button key={theme.id} onClick={() => setSettings({ ...settings, theme: theme.id })}
                                className={`h-20 rounded-xl flex items-center justify-center font-bold relative ${theme.bg} ${settings.theme === theme.id ? "ring-2 ring-red-500" : ""}`}>
                                Aa
                                {settings.theme === theme.id && (
                                    <span className="absolute top-1 right-1 text-green-500 text-xs">
                                        ✔
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* TEXT SIZE */}
                <div>
                    <p className="text-gray-500 dark:text-neutral-400 font-semibold mb-3">
                        TEXT SIZE
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() =>
                                setSettings({
                                    ...settings,
                                    fontSize: Math.max(
                                        14,
                                        settings.fontSize - 2
                                    ),
                                })
                            }
                            className="h-20 rounded-xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center text-2xl"
                        >
                            A-
                        </button>

                        <div className="h-20 rounded-xl bg-red-100 dark:bg-red-500/15 flex flex-col items-center justify-center">
                            <p className="text-2xl font-bold">
                                {settings.fontSize}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-neutral-500">
                                Current Size
                            </p>
                        </div>

                        <button onClick={() => setSettings({ ...settings, fontSize: Math.min(30, settings.fontSize + 2), })}
                            className="h-20 rounded-xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center text-2xl">
                            A+
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}