import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Lightweight endpoint — returns only the student's groupId
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ groupId: null }, { status: 401 });
    }
    const student = await prisma.student.findUnique({
      where: { userId: parseInt(session.user.id) },
      select: { groupId: true },
    });
    return NextResponse.json({ groupId: student?.groupId ?? null });
  } catch {
    return NextResponse.json({ groupId: null });
  }
}
