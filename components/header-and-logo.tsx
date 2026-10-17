import Image from "next/image"
type HeaderProps = {
    head: string
    paragraph: string
}
const Header = ({ head, paragraph }: HeaderProps) => {
    return (
        <>
            <div className="flex items-center gap-2 mb-8 mt-10">
                <Image src="/fang_pictures/fang_logo2.png" alt="logo" width={42} height={42} />
                <Image src="/fang_pictures/fang_logo1.png" alt="logo text" width={110} height={110} />
            </div>
            <div className="my-4">
                <h1 className="font-bold text-2xl mb-2">{head}</h1>
                <p className="text-gray-500 dark:text-neutral-400 text-sm">{paragraph}</p>
            </div>
        </>
    )
}

export default Header