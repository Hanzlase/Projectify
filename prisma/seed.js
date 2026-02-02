const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Check if CFD Campus exists, if not create it
  let campusCFD = await prisma.campuses.findFirst({
    where: { name: 'CFD' },
  });

  if (!campusCFD) {
    campusCFD = await prisma.campuses.create({
      data: {
        name: 'CFD',
        location: 'Chiniot Fasailabd Campus',
      },
    });
  }

  console.log('CFD Campus:', campusCFD);

  // Check if ISB Campus exists, if not create it
  let campusISB = await prisma.campuses.findFirst({
    where: { name: 'ISB' },
  });

  if (!campusISB) {
    campusISB = await prisma.campuses.create({
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
  const userCFD = await prisma.users.upsert({
    where: { email: 'hanzlasabir309@gmail.com' },
    update: {},
    create: {
      name: 'Hanzla',
      email: 'hanzlasabir309@gmail.com',
      password_hash: hashedPasswordCFD,
      role: 'coordinator',
    },
  });

  console.log('CFD User created:', userCFD);

  // Create CFD coordinator profile
  const coordinatorCFD = await prisma.fyp_coordinators.upsert({
    where: { user_id: userCFD.user_id },
    update: {},
    create: {
      user_id: userCFD.user_id,
      campus_id: campusCFD.campus_id,
    },
  });

  console.log('CFD Coordinator created:', coordinatorCFD);

  // Create ISB coordinator user
  const userISB = await prisma.users.upsert({
    where: { email: 'hanzlaisb@gmail.com' },
    update: {
      password_hash: hashedPasswordISB, // Update password if user exists
    },
    create: {
      name: 'HanzlaISB',
      email: 'hanzlaisb@gmail.com',
      password_hash: hashedPasswordISB,
      role: 'coordinator',
    },
  });

  console.log('ISB User created:', userISB);

  // Create ISB coordinator profile
  const coordinatorISB = await prisma.fyp_coordinators.upsert({
    where: { user_id: userISB.user_id },
    update: {},
    create: {
      user_id: userISB.user_id,
      campus_id: campusISB.campus_id,
    },
  });

  console.log('ISB Coordinator created:', coordinatorISB);

  // Create Admin user
  const hashedAdminPassword = await bcrypt.hash('Admin123', 10);
  const adminUser = await prisma.users.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      password_hash: hashedAdminPassword,
    },
    create: {
      name: 'Admin',
      email: 'admin@gmail.com',
      password_hash: hashedAdminPassword,
      role: 'admin',
    },
  });

  console.log('Admin User created:', adminUser);

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
