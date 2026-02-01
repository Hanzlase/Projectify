import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadToR2 } from '@/lib/r2';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can upload industrial project files' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (10MB limit for images)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Allow image types for industrial project thumbnails
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: JPG, PNG, WEBP, GIF' 
      }, { status: 400 });
    }

    // Generate unique filename
    const userId = session.user.id;
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    const fileName = `industrial-projects/${userId}/${timestamp}-${randomStr}.${extension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const fileUrl = await uploadToR2(fileName, buffer, file.type);

    return NextResponse.json({
      url: fileUrl,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error('Error uploading industrial project file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
