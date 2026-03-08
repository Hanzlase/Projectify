import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadToR2 } from '@/lib/r2';
import sharp from 'sharp';
import { randomBytes } from 'crypto';

// Compress and resize image for thumbnails
async function compressImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    let sharpInstance = sharp(buffer);
    
    // Get image metadata
    const metadata = await sharpInstance.metadata();
    
    // Resize if larger than 800px on any side (for thumbnails)
    const maxDimension = 800;
    if (metadata.width && metadata.width > maxDimension || metadata.height && metadata.height > maxDimension) {
      sharpInstance = sharpInstance.resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // Convert to webp for better compression, or jpeg as fallback
    let compressedBuffer: Buffer;
    let outputMimeType: string;
    
    try {
      compressedBuffer = await sharpInstance
        .webp({ quality: 80 })
        .toBuffer();
      outputMimeType = 'image/webp';
    } catch {
      // Fallback to JPEG if webp fails
      compressedBuffer = await sharpInstance
        .jpeg({ quality: 80 })
        .toBuffer();
      outputMimeType = 'image/jpeg';
    }
    
    console.log(`Image compressed: ${buffer.length} -> ${compressedBuffer.length} bytes (${Math.round((1 - compressedBuffer.length / buffer.length) * 100)}% reduction)`);
    
    return { buffer: compressedBuffer, mimeType: outputMimeType };
  } catch (error) {
    console.error('Image compression error:', error);
    // Return original if compression fails
    return { buffer, mimeType };
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // thumbnail, document

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (20MB limit for documents, 10MB for thumbnails before compression)
    const maxSize = type === 'thumbnail' ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File size exceeds ${type === 'thumbnail' ? '10MB' : '20MB'} limit` 
      }, { status: 400 });
    }

    // Validate file type
    if (type === 'thumbnail') {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Invalid file type. Only images allowed for thumbnails.' }, { status: 400 });
      }
    } else if (type === 'document') {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX allowed.' }, { status: 400 });
      }
    }

    // Generate unique filename
    const userId = session.user.id;
    const timestamp = Date.now();
    const randomStr = randomBytes(6).toString('hex');
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);
    let mimeType = file.type;
    let extension = file.name.split('.').pop();

    // Compress thumbnail images
    if (type === 'thumbnail') {
      const compressed = await compressImage(buffer, mimeType);
      buffer = Buffer.from(compressed.buffer);
      mimeType = compressed.mimeType;
      extension = mimeType === 'image/webp' ? 'webp' : 'jpg';
    }

    const fileName = `project-${type}s/${userId}/${timestamp}-${randomStr}.${extension}`;

    // Upload to R2
    const fileUrl = await uploadToR2(fileName, buffer, mimeType);

    return NextResponse.json({
      url: fileUrl,
      name: file.name,
      type: type,
      size: buffer.length,
      originalSize: file.size,
      compressed: type === 'thumbnail',
    });
  } catch (error) {
    console.error('Error uploading project file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
