import "server-only";

// Pexels: free, instant-approval stock photo API (https://pexels.com/api).
// Used as the primary source for "Generate a photo" mode so publications get
// real, professional photography instead of AI faces that often render with
// distorted features. Returns null (rather than throwing) whenever no usable
// photo is found, so callers can fall back to AI generation.
const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";

type PexelsPhoto = {
  src: { large: string; original: string };
};

type PexelsSearchResponse = {
  photos: PexelsPhoto[];
};

export async function searchStockPhoto(query: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const url = `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;

  let searchResponse: Response;
  try {
    searchResponse = await fetch(url, { headers: { Authorization: apiKey } });
  } catch (error) {
    console.error("Pexels search request failed", error);
    return null;
  }

  if (!searchResponse.ok) {
    console.error(`Pexels search failed with status ${searchResponse.status}`);
    return null;
  }

  const data = (await searchResponse.json()) as PexelsSearchResponse;
  const photo = data.photos?.[0];
  if (!photo) return null;

  const imageResponse = await fetch(photo.src.large);
  if (!imageResponse.ok) return null;

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const mimeType = imageResponse.headers.get("content-type") ?? "image/jpeg";
  return { buffer, mimeType };
}
