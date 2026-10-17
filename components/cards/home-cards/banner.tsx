import Image from "next/image";

const Banner = ({ ImageSrc }: { ImageSrc: string }) => {
    return (
        <div className="relative w-full aspect-13/9 sm:aspect-16/8 lg:aspect-11/4 overflow-hidden rounded-lg">
            <Image
                src={ImageSrc}
                alt="Card Image"
                fill
                className="object-cover"
                sizes="100vw"
            />
        </div>
    );
};

export default Banner;