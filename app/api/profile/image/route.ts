import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToR2, deleteFromR2, getKeyFromUrl, isR2Configured } from '@/lib/r2';
import sharp from 'sharp';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: Request) {
  try {
    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'File storage is not configured. Please set up R2 credentials.' },
        { status: 503 }
      );
    }

    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Get the current user to check for existing profile image
    const user: any = await prisma.user.findUnique({
      where: { userId },
      select: { profileImage: true },
    });

    // Delete old profile image if exists
    if (user?.profileImage) {
      const oldKey = getKeyFromUrl(user.profileImage);
      if (oldKey) {
        try {
          await deleteFromR2(oldKey);
        } catch (error) {
          console.error('Failed to delete old profile image:', error);
          // Continue anyway - old file might not exist
        }
      }
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compress and resize image using Sharp
    // Resize to max 400x400, maintain aspect ratio, compress to quality 80
    const compressedBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `profile-images/${userId}-${timestamp}.jpg`;

    // Upload to R2
    const imageUrl = await uploadToR2(filename, compressedBuffer, 'image/jpeg');

    // Update user profile with new image URL
    await prisma.user.update({
      where: { userId },
      data: { profileImage: imageUrl },
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Profile image uploaded successfully',
    });

  } catch (error) {
    console.error('Profile image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile image. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get the current user
    const user: any = await prisma.user.findUnique({
      where: { userId },
      select: { profileImage: true },
    });

    if (!user?.profileImage) {
      return NextResponse.json({ error: 'No profile image to delete' }, { status: 400 });
    }

    // Delete from R2
    const key = getKeyFromUrl(user.profileImage);
    if (key && isR2Configured()) {
      try {
        await deleteFromR2(key);
      } catch (error) {
        console.error('Failed to delete from R2:', error);
        // Continue to remove from database anyway
      }
    }

    // Update user to remove profile image
    await prisma.user.update({
      where: { userId },
      data: { profileImage: null },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile image deleted successfully',
    });

  } catch (error) {
    console.error('Profile image delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile image' },
      { status: 500 }
    );
  }
}
