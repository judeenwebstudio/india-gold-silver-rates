import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function hasValidSignature(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return false;
}

export async function POST(request: Request) {
  if (!(await auth())?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await request.formData();
  const productId = String(form.get('productId') || '');
  const file = form.get('image');
  if (!productId || !(file instanceof File)) return NextResponse.json({ error: 'Product and image are required.' }, { status: 400 });
  if (!allowedTypes.has(file.type) || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Use a JPG, JPEG, PNG, or WebP image no larger than 5 MB.' }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidSignature(bytes, file.type)) return NextResponse.json({ error: 'The uploaded file is not a valid supported image.' }, { status: 400 });
  await prisma.shopProduct.update({
    where: { id: productId },
    data: { imageData: Buffer.from(bytes), imageMimeType: file.type, imageUrl: null },
  });
  return NextResponse.json({ imageUrl: `/api/v1/shop/products/${productId}/image` });
}

export async function DELETE(request: Request) {
  if (!(await auth())?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const productId = new URL(request.url).searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'Product is required.' }, { status: 400 });
  await prisma.shopProduct.update({ where: { id: productId }, data: { imageData: null, imageMimeType: null, imageUrl: null } });
  return NextResponse.json({ success: true });
}
