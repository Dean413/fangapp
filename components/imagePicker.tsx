"use client"
import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { Button } from "./Button";
import { toast } from "@/lib/store/toastStore";
import { FiCamera } from "react-icons/fi";
import { useTranslations } from "next-intl";

type imagePickerProps = {
    name?: string;
    pictureHeader?: string;
    isProfilePage?: boolean;
    uploadIcon?: string;
    image: string | null;
    setImage: (value: string | null) => void;
}

export function ProfileImagePicker({ name, image, pictureHeader, uploadIcon, isProfilePage, setImage, }: imagePickerProps) {
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
                // At most 512×512: plenty for a profile photo, and keeps the upload small
                const size = Math.min(croppedAreaPixels.width, croppedAreaPixels.height, 512);
                canvas.width = size;
                canvas.height = size;
                ctx?.drawImage(
                    image,
                    croppedAreaPixels.x,
                    croppedAreaPixels.y,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height,
                    0,
                    0,
                    size,
                    size
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
        const cropped = await getCroppedImg(
            preview,
            croppedAreaPixels
        );
        setImage(cropped);
        setOpenPreview(false);
        toast.success(t("photoReady"))
    };

    return (
        <>
            <div className="space-y-5 text-center">
                <div className="flex items-center gap-6">
                    <div className="relative w-32 h-32">

                        {/* OUTER WRAPPER (DO NOT CLIP HERE) */}
                        <div className="relative w-full h-full">

                            {/* PROFILE IMAGE (ONLY THIS IS ROUND + CLIPPED) */}
                            <div className="w-full h-full border-4 border-white dark:border-dark-card rounded-full overflow-hidden bg-linear-to-r from-[#8B0000] to-[#D90404] ">
                                {image ? (
                                    <img
                                        src={image}
                                        alt={t("profile")}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl text-white font-bold">
                                        {name?.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {isProfilePage && (
                                <label className="absolute bottom-4 right-1 bg-gray-100 dark:bg-dark-raised p-2 rounded-full cursor-pointer z-20 translate-x-1/4 translate-y-1/4">
                                    {/* <FiCamera size={18} className="dark:text-white" /> */}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            )}

                        </div>
                    </div>

                    <div className="text-left">
                        {pictureHeader && (
                            <p className="font-semibold text-lg mb-3">
                                {pictureHeader}
                            </p>
                        )}


                        <label className={`cursor-pointer inline-flex items-center gap-3 ${uploadIcon ? "bg-gray-100 dark:bg-dark-raised shadow-md" : ""}   px-4 py-3 rounded-2xl transition `}>
                            {uploadIcon && (<span className="text-sm">{uploadIcon}</span>)}

                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                        </label>
                    </div>
                </div>
            </div>

            {openPreview && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-dark-card rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
                        <h2 className="text-2xl font-bold text-center mb-5">
                            {t("previewImage")}
                        </h2>
                        <div className="relative w-full h-80 bg-black rounded-3xl overflow-hidden">
                            <Cropper
                                image={preview!}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={true}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>

                        <div className="mt-5">
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

                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => setOpenPreview(false)} className="px-5 py-3 rounded-2xl border  border-gray-200 dark:border-dark-border font-medium">
                                {t("cancel")}
                            </button>

                            <button onClick={saveImage} className="px-5 py-3 rounded-2xl bg-linear-to-r from-[#8B0000] to-[#D90404] hover:bg-red-600 text-white font-medium">
                                {t("confirmImage")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}