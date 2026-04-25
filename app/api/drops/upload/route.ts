import { NextRequest, NextResponse } from 'next/server';
import { uploadMedia, uploadMetadata } from '@/lib/storage';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const title = (form.get('title') as string) ?? 'Untitled';
    const description = (form.get('description') as string) ?? '';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate a temp id for the metadata file
    const tempId = nanoid(10);

    // Upload media to VPS
    const ext = file.name.split('.').pop() ?? 'bin';
    const mediaResult = await uploadMedia(file, `art-${tempId}.${ext}`);

    // Build + upload ERC-1155 metadata JSON pointing at the media
    const metadataUri = await uploadMetadata(
      {
        name: title,
        description,
        image: mediaResult.url,
      },
      tempId,
    );

    return NextResponse.json({
      mediaUri: mediaResult.url,
      metadataUri,
    });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
