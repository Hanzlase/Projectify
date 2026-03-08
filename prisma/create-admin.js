const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({ log: ['error'] });

const ADMIN_EMAIL    = 'hanzlasabir658@gmail.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME     = 'Hanzlaadmin';

async function createAdmin() {
  console.log('Creating admin user...');

  try {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      include: { admin: true },
    });

    if (existingUser) {
      console.log('Admin user already exists — updating password...');
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { passwordHash: hashedPassword, name: ADMIN_NAME },
      });

      // Ensure Admin profile record exists
      if (!existingUser.admin) {
        await prisma.admin.create({ data: { userId: existingUser.userId } });
        console.log('Admin profile record created.');
      }

      console.log('Admin password updated!');
    } else {
      const newUser = await prisma.user.create({
        data: {
          name: ADMIN_NAME,
          email: ADMIN_EMAIL,
          passwordHash: hashedPassword,
          role: 'admin',
          admin: { create: {} }, // Create the Admin profile record too
        },
      });
      console.log('Admin user created:', newUser);
    }

    console.log('\n✅ Admin user ready!');
    console.log('Name    :', ADMIN_NAME);
    console.log('Email   :', ADMIN_EMAIL);
    console.log('Password:', ADMIN_PASSWORD);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
