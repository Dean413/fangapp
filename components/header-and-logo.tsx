import Image from "next/image"
type HeaderProps = {
    head: string
    paragraph: string
}
const Header = ({ head, paragraph }: HeaderProps) => {
    return (
        <>
            <div className="flex gap-2 items-center">
                <Image src="/fanglogo1.svg" alt="logo" width={80} height={80} className="w-10" />
                <div
                    role="img"
                    aria-label="FANG"
                    className="-ml-4 w-20 md:w-25 aspect-1873/614 bg-black dark:bg-white"
                    style={{
                        WebkitMask: "url(/fanglogo2.svg) center / contain no-repeat",
                        mask: "url(/fanglogo2.svg) center / contain no-repeat",
                    }}
                />
            </div>
            <div className="my-4">
                <h1 className="font-bold text-2xl mb-2">{head}</h1>
                <p className="text-gray-500 dark:text-neutral-400 text-sm">{paragraph}</p>
            </div>
        </>
    )
}

export default Header