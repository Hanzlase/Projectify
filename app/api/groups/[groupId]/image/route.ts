import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { uploadToR2 } from '@/lib/r2';
import sharp from 'sharp';

export async function POST(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const groupId = parseInt(params.groupId);

    // Get the group
    const group = await (prisma as any).group.findUnique({
      where: { groupId },
      include: { students: true }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is admin
    const student = await (prisma as any).student.findUnique({ where: { userId } });
    const isCreator = student && group.createdById === student.studentId;
    const isSupervisor = group.supervisorId === userId;
    const isStudentAdmin = student?.groupId === groupId && student?.isGroupAdmin;

    if (!isCreator && !isSupervisor && !isStudentAdmin) {
      return NextResponse.json({ error: 'Only group admins can update the group image' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 400 });
    }

    // Validate file size (max 20MB - will be compressed)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 20MB' }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compress image using sharp - resize and optimize
    const compressedBuffer = await sharp(buffer)
      .resize(800, 800, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `group-images/group-${groupId}-${timestamp}.jpg`;

    // Upload to R2
    const imageUrl = await uploadToR2(filename, compressedBuffer, 'image/jpeg');

    // Update group with new image URL
    await (prisma as any).group.update({
      where: { groupId },
      data: { groupImage: imageUrl }
    });

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      message: 'Group image updated successfully'
    });

  } catch (error) {
    console.error('Error uploading group image:', error);
    return NextResponse.json({ error: 'Failed to upload group image' }, { status: 500 });
  }
}
