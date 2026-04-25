// ─────────────────────────────────────────────
// Media storage abstraction
// v1: posts to your Contabo VPS endpoint
// later: swap implementation for IPFS (Pinata/Web3.Storage)
// without changing callers
// ─────────────────────────────────────────────

const UPLOAD_URL = process.env.STORAGE_UPLOAD_URL!;
const UPLOAD_SECRET = process.env.STORAGE_UPLOAD_SECRET!;
const PUBLIC_BASE = process.env.NEXT_PUBLIC_STORAGE_BASE_URL!;

export interface UploadResult {
  url: string;          // Public URL where the file is served
  key: string;          // Internal key/path (for deletion later if needed)
}

export async function uploadMedia(
  file: File | Blob,
  filename: string,
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file, filename);

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPLOAD_SECRET}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  }

  const { key } = (await res.json()) as { key: string };
  return {
    key,
    url: `${PUBLIC_BASE}/${key}`,
  };
}

// Build the JSON metadata document that the tokenURI will point to.
// Standard ERC-1155 metadata shape — works with all marketplaces.
export interface TokenMetadata {
  name: string;
  description?: string;
  image: string;
  external_url?: string;
  attributes?: { trait_type: string; value: string | number }[];
}

export async function uploadMetadata(
  metadata: TokenMetadata,
  dropId: string,
): Promise<string> {
  const blob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: 'application/json',
  });
  const { url } = await uploadMedia(blob, `metadata-${dropId}.json`);
  return url;
}
