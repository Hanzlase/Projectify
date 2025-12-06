import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Get the current session to identify the coordinator
    const session = await auth();
    
    if (!session || session.user.role !== 'coordinator') {
      return NextResponse.json(
        { error: 'Unauthorized - Only coordinators can add students' },
        { status: 401 }
      );
    }

    const { rollNumbers, emails, names } = await request.json();

    if (!rollNumbers || !Array.isArray(rollNumbers) || rollNumbers.length === 0) {
      return NextResponse.json(
        { error: 'Roll numbers are required' },
        { status: 400 }
      );
    }

    // Get the coordinator's campus from database (this ensures correct campus is always used)
    const coordinator = await prisma.fYPCoordinator.findFirst({
      where: {
        userId: parseInt(session.user.id),
      },
      include: {
        campus: true,
      },
    });

    if (!coordinator) {
      return NextResponse.json(
        { error: 'Coordinator profile not found' },
        { status: 404 }
      );
    }

    const campusId = coordinator.campusId;
    console.log(`Adding students to campus: ${coordinator.campus.name} (ID: ${campusId})`);

    // Ensure emails array matches rollNumbers length
    const emailsArray = emails || rollNumbers.map((rn: string) => 
      `${rn.toLowerCase().replace(/-/g, '')}@student.edu.pk`
    );

    // Ensure names array matches rollNumbers length
    const namesArray = names || rollNumbers.map((rn: string) => rn);

    const results: {
      success: Array<{ rollNumber: string; email: string; password: string }>;
      failed: Array<{ rollNumber: string; reason: string }>;
    } = {
      success: [],
      failed: [],
    };

    // Prepare all data first
    const studentsToAdd: Array<{
      rollNumber: string;
      email: string;
      name: string;
      password: string;
      passwordHash: string;
      batch: string | null;
    }> = [];

    // Get all roll numbers and emails to check
    const trimmedRollNumbers = rollNumbers.map((rn: string) => rn.trim()).filter(Boolean);
    const trimmedEmails = emailsArray.map((e: string) => e?.trim()).filter(Boolean);

    // Batch check for existing students and users
    const [existingStudents, existingUsers] = await Promise.all([
      prisma.student.findMany({
        where: { rollNumber: { in: trimmedRollNumbers } },
        select: { rollNumber: true }
      }),
      prisma.user.findMany({
        where: { email: { in: trimmedEmails } },
        select: { email: true }
      })
    ]);

    const existingRollNumbers = new Set(existingStudents.map(s => s.rollNumber));
    const existingEmailSet = new Set(existingUsers.map(u => u.email));

    // Pre-hash all passwords in parallel
    const passwordPromises: Promise<{ rollNumber: string; password: string; hash: string }>[] = [];
    
    for (let i = 0; i < rollNumbers.length; i++) {
      const trimmedRollNumber = rollNumbers[i].trim();
      const trimmedEmail = emailsArray[i]?.trim();
      const trimmedName = namesArray[i]?.trim() || trimmedRollNumber;
      
      if (!trimmedRollNumber) continue;

      // Check if already exists
      if (existingRollNumbers.has(trimmedRollNumber)) {
        results.failed.push({ rollNumber: trimmedRollNumber, reason: 'Roll number already exists' });
        continue;
      }

      if (existingEmailSet.has(trimmedEmail)) {
        results.failed.push({ rollNumber: trimmedRollNumber, reason: 'Email already exists' });
        continue;
      }

      // Add to set to prevent duplicates within same batch
      existingRollNumbers.add(trimmedRollNumber);
      existingEmailSet.add(trimmedEmail);

      const password = trimmedRollNumber.replace(/-/g, '') + '123';
      
      passwordPromises.push(
        bcrypt.hash(password, 10).then(hash => ({
          rollNumber: trimmedRollNumber,
          password,
          hash
        }))
      );

      const batchMatch = trimmedRollNumber.match(/^(\d{2})/);
      
      studentsToAdd.push({
        rollNumber: trimmedRollNumber,
        email: trimmedEmail,
        name: trimmedName,
        password,
        passwordHash: '', // Will be filled after hashing
        batch: batchMatch ? batchMatch[1] : null,
      });
    }

    // Wait for all password hashing to complete
    const hashedPasswords = await Promise.all(passwordPromises);
    const hashMap = new Map(hashedPasswords.map(h => [h.rollNumber, h.hash]));

    // Update password hashes
    studentsToAdd.forEach(student => {
      student.passwordHash = hashMap.get(student.rollNumber) || '';
    });

    // Process in smaller batches to avoid connection timeout
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < studentsToAdd.length; i += BATCH_SIZE) {
      const batch = studentsToAdd.slice(i, i + BATCH_SIZE);
      
      // Use transaction for each batch
      await prisma.$transaction(async (tx) => {
        for (const student of batch) {
          try {
            // Create user
            const user = await tx.user.create({
              data: {
                name: student.name,
                email: student.email,
                passwordHash: student.passwordHash,
                role: UserRole.student,
              },
            });

            // Create student profile
            await tx.student.create({
              data: {
                userId: user.userId,
                rollNumber: student.rollNumber,
                campusId: campusId,
                batch: student.batch,
              },
            });

            results.success.push({
              rollNumber: student.rollNumber,
              email: student.email,
              password: student.password,
            });
          } catch (error: any) {
            results.failed.push({
              rollNumber: student.rollNumber,
              reason: error.message || 'Database error',
            });
          }
        }
      }, {
        timeout: 30000, // 30 second timeout per batch
      });
    }

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error: any) {
    console.error('Add students error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while adding students' },
      { status: 500 }
    );
  }
}
