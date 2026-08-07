"use client";

import Image, { type ImageLoaderProps } from "next/image";
import CameraAdd01Icon from "@hugeicons/core-free-icons/CameraAdd01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { LogOutIcon } from "@/components/icons";

function passthroughLoader({ src }: ImageLoaderProps) {
  return src;
}

function LocationAvatar({ imageUrl, locationName }: { imageUrl: string | null; locationName: string }) {
  return (
    <span className="avatar">
      <span className="mask mask-squircle relative flex h-14 w-14 shrink-0 items-center justify-center bg-primary text-xl font-black text-primary-content shadow-sm">
        {imageUrl ? (
          <Image
            loader={passthroughLoader}
            unoptimized
            fill
            sizes="56px"
            src={imageUrl}
            alt=""
            className="object-cover"
          />
        ) : (
          <span aria-hidden="true">{locationName.trim().charAt(0).toLocaleUpperCase("bs-BA")}</span>
        )}
      </span>
    </span>
  );
}

export function LocationHeader({
  locationName,
  imageUrl,
  imageUploading = false,
  imageUploadDisabled = false,
  onImageChange,
  onLogout,
}: {
  locationName: string;
  imageUrl: string | null;
  imageUploading?: boolean;
  imageUploadDisabled?: boolean;
  onImageChange?: (file: File) => void;
  onLogout?: () => void;
}) {
  const avatar = <LocationAvatar imageUrl={imageUrl} locationName={locationName} />;

  return (
    <header className="border-b border-base-300 bg-base-100">
      <div className="navbar mx-auto min-h-24 w-full max-w-3xl gap-3 px-5 sm:px-7">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {onImageChange ? (
            <label className={`group relative shrink-0 rounded-2xl focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${imageUploadDisabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`} title="Promijeni sliku lokacije">
              {avatar}
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Promijeni sliku lokacije"
                disabled={imageUploading || imageUploadDisabled}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) onImageChange(file);
                }}
              />
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-base-100 bg-primary text-primary-content shadow-sm transition-transform group-hover:scale-105" aria-hidden="true">
                {imageUploading ? <span className="loading loading-spinner loading-xs" /> : <HugeiconsIcon icon={CameraAdd01Icon} size={15} strokeWidth={2.2} />}
              </span>
            </label>
          ) : avatar}
          <p className="min-w-0 line-clamp-2 text-xl font-black leading-tight tracking-tight sm:text-2xl">{locationName}</p>
        </div>
        {onLogout ? (
          <button type="button" onClick={onLogout} className="btn btn-ghost min-h-12 px-3 text-primary" aria-label="Odjava">
            <LogOutIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Odjava</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
