import Image from "next/image";

// The imprint logo, top left of a book cover. The cover's wrapper must be `relative`.
// It is a share of the cover's width, so it shrinks and grows with the cover (never below 12px or above 56px).
export default function Imprint({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const box = size === "sm" ? "w-[16%]" : size === "lg" ? "w-[28%]" : "w-[22%]";
    return (
        <div className={`pointer-events-none absolute top-[3%] left-[4%] z-10 aspect-square min-w-3 max-w-14 ${box}`}>
            <Image
                src="/fang_pictures/fanglogo1.svg"
                alt="Fang imprint"
                fill
                sizes="56px"
                className="object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] opacity-80"
            />
        </div>
    );
}