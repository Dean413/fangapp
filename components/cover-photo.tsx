"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { toast } from "@/lib/store/toastStore";
import { FiCamera } from "react-icons/fi";
import { useTranslations } from "next-intl";

type imagePickerProps = {
    name: string;
    image: string | null;
    setImage: (value: string | null) => void;
};

export function CoverImagePicker({ name, image, setImage }: imagePickerProps) {
    const t = useTranslations("Photo");
    const [preview, setPreview] = useState<string | null>(null);
    const [openPreview, setOpenPreview] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    function getCroppedImg(imageSrc: string, croppedAreaPixels: any): Promise<string> {
        return new Promise((resolve) => {
            const image = new Image();
            image.src = imageSrc;

            image.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                const width = croppedAreaPixels.width;
                const height = croppedAreaPixels.height;

                canvas.width = width;
                canvas.height = height;

                ctx?.drawImage(
                    image,
                    croppedAreaPixels.x,
                    croppedAreaPixels.y,
                    width,
                    height,
                    0,
                    0,
                    width,
                    height
                );

                resolve(canvas.toDataURL("image/png"));
            };
        });
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const imageUrl = URL.createObjectURL(file);
        setPreview(imageUrl);
        setOpenPreview(true);
    };

    const onCropComplete = useCallback((_: any, croppedPixels: any) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const saveImage = async () => {
        if (!preview || !croppedAreaPixels) return;

        const cropped = await getCroppedImg(preview, croppedAreaPixels);

        setImage(cropped);
        setOpenPreview(false);
        toast.success(t("bannerUpdated"));
    };

    return (
        <>
            {/* ================= BANNER ================= */}
            <div className="relative w-full h-52 md:h-64 rounded-tl-2xl rounded-tr-2xl overflow-hidden bg-linear-to-b from-[#FAEDED00] to-[#FF797999] dark:from-dark-card dark:to-red-950">

                {image ? (
                    <img
                        src={image}
                        alt={t("banner")}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-gray-600 dark:text-neutral-300 font-semibold">

                        </p>
                    </div>
                )}

                {/* CAMERA EDIT BUTTON */}
                <label className="absolute top-8 right-4 cursor-pointer">
                    <div className="flex items-center gap-2 text-black dark:text-white bg-white dark:bg-dark-card px-4 py-2 rounded-full shadow-lg transition cursor-pointer">
                        <FiCamera size={18} />
                        <p className="text-sm font-medium">{t("editCover")}</p>
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                    />
                </label>
            </div>

            {/* ================= CROPPER MODAL ================= */}
            {openPreview && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl p-5 w-full max-w-2xl shadow-xl">

                        <h2 className="text-xl font-bold mb-4 text-center">
                            {t("editBanner")}
                        </h2>

                        <div className="relative w-full h-80 bg-black rounded-xl overflow-hidden">
                            <Cropper
                                image={preview!}
                                crop={crop}
                                zoom={zoom}
                                aspect={3 / 1}   // 👈 banner ratio
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>

                        {/* ZOOM */}
                        <div className="mt-4">
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* ACTIONS */}
                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={() => setOpenPreview(false)}
                                className="px-4 py-2 border rounded-lg"
                            >
                                {t("cancel")}
                            </button>

                            <button
                                onClick={saveImage}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg"
                            >
                                {t("saveBanner")}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}