export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_BUCKET = "caption-memes";
export const PHOTO_PAGE_SIZE = 18;

export type PhotoGeneration = {
  id: string;
  caption: string;
  context: string;
  created_at: string;
  width: number;
  height: number;
  imageUrl: string | null;
};

export type PhotoGalleryPage = {
  generations: PhotoGeneration[];
  nextCursor: string | null;
};
