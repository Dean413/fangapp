import Image from "next/image";

// The imprint logo, top right of a book cover. The cover's wrapper must be `relative`.
export default function Imprint({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const box = size === "sm" ? "w-6 h-6 md:w-7 md:h-7" : size === "lg" ? "w-12 h-12 md:w-14 md:h-14" : "w-8 h-8 md:w-10 md:h-10";
    return (
        <div className={`pointer-events-none absolute top-1.5 right-1.5 md:top-2 md:right-2 z-10 ${box}`}>
            <Image
                src="/fang_pictures/fanglogo1.svg"
                alt="Fang imprint"
                fill
                sizes="56px"
                className="object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] opacity-50"
            />
        </div>
    );
}