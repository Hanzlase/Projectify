import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - Get admin profile
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const admin = await prisma.user.findUnique({
      where: { userId: parseInt(session.user.id) },
      select: {
        userId: true,
        name: true,
        email: true,
        profileImage: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      profile: {
        userId: admin.userId,
        name: admin.name,
        email: admin.email,
        profileImage: admin.profileImage,
        createdAt: admin.createdAt,
      }
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PATCH - Update admin profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, currentPassword, newPassword, profileImage } = body;

    const userId = parseInt(session.user.id);

    // Get current admin user
    const admin = await prisma.user.findUnique({
      where: { userId },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const updateData: any = {};

    // Update name if provided
    if (name) {
      updateData.name = name;
    }

    // Update email if provided
    if (email && email !== admin.email) {
      // Check if email is already taken
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          userId: { not: userId },
        },
      });

      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
      updateData.email = email;
    }

    // Update profile image if provided
    if (profileImage !== undefined) {
      updateData.profileImage = profileImage;
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      // Hash new password
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    // Update admin
    const updatedAdmin = await prisma.user.update({
      where: { userId },
      data: updateData,
      select: {
        userId: true,
        name: true,
        email: true,
        profileImage: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      profile: {
        userId: updatedAdmin.userId,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        profileImage: updatedAdmin.profileImage,
      }
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
