import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { scrapeAndParseFaculty } from '@/lib/faculty-scraper';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'supervisor') {
      return NextResponse.json({ error: 'Unauthorized. Only supervisors can perform this action.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Retrieve supervisor and their campus info
    const supervisor = await prisma.fYPSupervisor.findUnique({
      where: { userId },
      include: {
        campus: true,
        user: { select: { email: true, name: true } }
      }
    });

    if (!supervisor) {
      return NextResponse.json({ error: 'Supervisor profile not found' }, { status: 404 });
    }

    const { facultyUrl } = supervisor.campus;
    const { email, name } = supervisor.user;

    if (!facultyUrl) {
      return NextResponse.json({ 
        error: 'Faculty directory URL has not been configured for your campus yet. Please ask your administrator to add it in the Campus Settings.' 
      }, { status: 400 });
    }

    console.log(`Starting faculty directory scrape for supervisor: ${email} (${name}) at URL: ${facultyUrl}`);
    const result = await scrapeAndParseFaculty(facultyUrl, email, name);

    if (!result) {
      return NextResponse.json({ 
        error: `Could not find any profile details matching your registered email (${email}) on the faculty webpage: ${facultyUrl}. Please ensure your email matches the directory listing.`
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: result
    });

  } catch (error) {
    console.error('Scrape faculty profile API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during profile scraping. Please try again.' },
      { status: 500 }
    );
  }
}
