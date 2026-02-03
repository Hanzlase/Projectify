const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  log: ['error'],
});

async function createAdmin() {
  console.log('Creating admin user...');

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@gmail.com' },
    });

    if (existingAdmin) {
      console.log('Admin already exists, updating password...');
      const hashedAdminPassword = await bcrypt.hash('Admin123', 10);
      await prisma.user.update({
        where: { email: 'admin@gmail.com' },
        data: { 
          passwordHash: hashedAdminPassword,
          updatedAt: new Date(),
        },
      });
      console.log('Admin password updated!');
    } else {
      console.log('Creating new admin user...');
      const hashedAdminPassword = await bcrypt.hash('Admin123', 10);
      const adminUser = await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@gmail.com',
          passwordHash: hashedAdminPassword,
          role: 'admin',
          updatedAt: new Date(),
        },
      });
      console.log('Admin created:', adminUser);
    }

    console.log('\n✅ Admin user ready!');
    console.log('Email: admin@gmail.com');
    console.log('Password: Admin123');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
