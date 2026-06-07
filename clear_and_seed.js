const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting clear and seed...');

  // 1. Truncate all tables in database
  const tables = [
    'admins',
    'fyp_coordinators',
    'fyp_supervisors',
    'students',
    'invitations',
    'group_invitations',
    'industrial_project_requests',
    'industrial_projects',
    'group_chats',
    'pinned_conversations',
    'notification_recipients',
    'notifications',
    'conversation_participants',
    'messages',
    'conversations',
    'meetings',
    'meeting_email_reminders',
    'project_tasks',
    'submission_attachments',
    'evaluation_submissions',
    'evaluation_attachments',
    'evaluations',
    'panel_comments',
    'group_panel_assignments',
    'panel_members',
    'evaluation_panels',
    'projects',
    'project_permission_requests',
    'password_reset_tokens',
    'resource_requests',
    'groups',
    'users',
    'campuses'
  ];

  console.log('Truncating tables...');
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
      console.log(`Truncated table: ${table}`);
    } catch (err) {
      console.warn(`Failed to truncate table ${table} (it might not exist yet):`, err.message);
    }
  }

  // 2. Create the Admin User
  console.log('Creating Admin user...');
  const passwordHash = await bcrypt.hash('Hanzla123', 10);
  
  const user = await prisma.user.create({
    data: {
      name: 'Hanzla',
      email: 'Hanzla@gmail.com',
      passwordHash,
      role: 'admin',
      status: 'ACTIVE'
    }
  });

  console.log('Created User record:', user);

  const adminProfile = await prisma.admin.create({
    data: {
      userId: user.userId
    }
  });

  console.log('Created Admin profile record:', adminProfile);
  console.log('Database cleared and seeded successfully with one admin user.');
}

main()
  .catch((e) => {
    console.error('Error during clear and seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
