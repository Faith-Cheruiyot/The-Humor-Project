export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_BUCKET = "caption-memes";
export const PHOTO_PAGE_SIZE = 8;
export const PHOTO_PAGE_SIZES = [8, 12, 24] as const;
export const PHOTO_PERIODS = [
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "year", label: "Past year" },
  { value: "all", label: "All time" },
] as const;
export type PhotoPeriod = typeof PHOTO_PERIODS[number]["value"];
export type PhotoFeedOptions = { period: PhotoPeriod; limit: number };

export function parsePhotoFeedOptions(parameters: URLSearchParams): PhotoFeedOptions {
  const period = parameters.get("period") ?? "week";
  const limit = Number(parameters.get("limit") ?? PHOTO_PAGE_SIZE);
  if (!PHOTO_PERIODS.some((item) => item.value === period) || !PHOTO_PAGE_SIZES.some((size) => size === limit)) {
    throw new Error("Choose a valid time period and number of memes.");
  }
  return { period: period as PhotoPeriod, limit };
}

export function photoFeedSince(period: PhotoPeriod, now = new Date()): string | undefined {
  const days = { week: 7, month: 30, year: 365, all: 0 }[period];
  return days ? new Date(now.getTime() - days * 86_400_000).toISOString() : undefined;
}

export type PhotoGeneration = {
  id: string;
  caption: string;
  created_at: string;
  created_by: string;
  width: number;
  height: number;
  imageUrl: string | null;
  authorName: string;
  upvotes: number;
  downvotes: number;
  myVote: -1 | 1 | null;
};

export type PhotoGalleryPage = {
  generations: PhotoGeneration[];
  nextCursor: string | null;
};
