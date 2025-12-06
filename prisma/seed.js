const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Check if CFD Campus exists, if not create it
  let campusCFD = await prisma.campus.findFirst({
    where: { name: 'CFD' },
  });

  if (!campusCFD) {
    campusCFD = await prisma.campus.create({
      data: {
        name: 'CFD',
        location: 'Chiniot Fasailabd Campus',
      },
    });
  }

  console.log('CFD Campus:', campusCFD);

  // Check if ISB Campus exists, if not create it
  let campusISB = await prisma.campus.findFirst({
    where: { name: 'ISB' },
  });

  if (!campusISB) {
    campusISB = await prisma.campus.create({
      data: {
        name: 'ISB',
        location: 'Islamabad Campus',
      },
    });
  }

  console.log('ISB Campus:', campusISB);

  // Hash the passwords
  const hashedPasswordCFD = await bcrypt.hash('Han123zla', 10);
  const hashedPasswordISB = await bcrypt.hash('hanzlaisb123', 10);

  // Create CFD coordinator user
  const userCFD = await prisma.user.upsert({
    where: { email: 'hanzlasabir309@gmail.com' },
    update: {},
    create: {
      name: 'Hanzla',
      email: 'hanzlasabir309@gmail.com',
      passwordHash: hashedPasswordCFD,
      role: 'coordinator',
    },
  });

  console.log('CFD User created:', userCFD);

  // Create CFD coordinator profile
  const coordinatorCFD = await prisma.fYPCoordinator.upsert({
    where: { userId: userCFD.userId },
    update: {},
    create: {
      userId: userCFD.userId,
      campusId: campusCFD.campusId,
    },
  });

  console.log('CFD Coordinator created:', coordinatorCFD);

  // Create ISB coordinator user
  const userISB = await prisma.user.upsert({
    where: { email: 'hanzlaisb@gmail.com' },
    update: {
      passwordHash: hashedPasswordISB, // Update password if user exists
    },
    create: {
      name: 'HanzlaISB',
      email: 'hanzlaisb@gmail.com',
      passwordHash: hashedPasswordISB,
      role: 'coordinator',
    },
  });

  console.log('ISB User created:', userISB);

  // Create ISB coordinator profile
  const coordinatorISB = await prisma.fYPCoordinator.upsert({
    where: { userId: userISB.userId },
    update: {},
    create: {
      userId: userISB.userId,
      campusId: campusISB.campusId,
    },
  });

  console.log('ISB Coordinator created:', coordinatorISB);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
