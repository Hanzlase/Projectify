import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Please provide an email address' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // For security, don't reveal if email exists or not
      // But in your case, you want to show the error
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Check if user is suspended or removed
    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your account is suspended. Please contact your coordinator.' },
        { status: 403 }
      );
    }

    if (user.status === 'REMOVED') {
      return NextResponse.json(
        { error: 'This account has been removed.' },
        { status: 403 }
      );
    }

    // Delete any existing unused tokens for this user
    await (prisma as any).passwordResetToken.deleteMany({
      where: {
        userId: user.userId,
        used: false,
      },
    });

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to database
    await (prisma as any).passwordResetToken.create({
      data: {
        userId: user.userId,
        token,
        expiresAt,
      },
    });

    // Generate reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send password reset email
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      userName: user.name,
      resetUrl,
    });

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      // Still return success to user (don't expose email sending failures)
      // In development, we'll show the link anyway
    }

    console.log('Password reset requested for:', email);

    // Return success
    // In development, also return the reset URL for testing
    return NextResponse.json({
      success: true,
      message: 'Password reset link has been sent to your email',
      // Only include these in development
      ...(process.env.NODE_ENV === 'development' && {
        resetUrl,
        token,
        expiresAt,
      }),
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
