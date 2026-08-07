export const LOCATION_IMAGES_BUCKET = "location-images";
export const LOCATION_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const LOCATION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type PublicUrlClient = {
  storage: {
    from: (bucket: string) => {
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

export function getLocationImageUrl(client: PublicUrlClient, path: string | null) {
  if (!path) return null;
  return client.storage.from(LOCATION_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function isLocationImageType(type: string): type is (typeof LOCATION_IMAGE_TYPES)[number] {
  return LOCATION_IMAGE_TYPES.some((allowedType) => allowedType === type);
}
