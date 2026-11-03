import "server-only";

// Pollinations.ai: a free, no-API-key image generation service (built on
// open models like Flux). Used as the opt-in "generate a photo" path —
// Gemini's own image output is not available on its free tier at all
// (confirmed quota limit of 0 requests for image-capable models).
const POLLINATIONS_BASE_URL = "https://image.pollinations.ai/prompt";

export async function generateImage(prompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const url = `${POLLINATIONS_BASE_URL}/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Échec de la génération d'image (statut ${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type") ?? "image/jpeg";

  return { buffer, mimeType };
}
