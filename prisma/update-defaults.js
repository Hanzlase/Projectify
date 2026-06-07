const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Running database updates with raw query or full updates...');

  // Use raw SQL to update nulls to defaults directly in the DB to bypass Prisma validation!
  // This is much safer and handles pre-existing null values in PostgreSQL without schema validation issues.
  
  try {
    const campusRes = await prisma.$executeRawUnsafe(
      `UPDATE "campuses" SET "active_semester" = 'FALL' WHERE "active_semester" IS NULL`
    );
    console.log(`Updated null active_semester on ${campusRes} campuses.`);
  } catch (err) {
    console.log('Error updating campuses raw:', err.message);
  }

  try {
    const studentRes = await prisma.$executeRawUnsafe(
      `UPDATE "students" SET "cohort" = 'REGULAR' WHERE "cohort" IS NULL`
    );
    console.log(`Updated null cohort on ${studentRes} students.`);
  } catch (err) {
    console.log('Error updating students raw:', err.message);
  }

  try {
    const groupCohortRes = await prisma.$executeRawUnsafe(
      `UPDATE "groups" SET "cohort" = 'REGULAR' WHERE "cohort" IS NULL`
    );
    const groupPhaseRes = await prisma.$executeRawUnsafe(
      `UPDATE "groups" SET "fyp_phase" = 'FYP_1' WHERE "fyp_phase" IS NULL`
    );
    console.log(`Updated groups cohort (${groupCohortRes}) and fyp_phase (${groupPhaseRes}).`);
  } catch (err) {
    console.log('Error updating groups raw:', err.message);
  }

  try {
    const evalCohortRes = await prisma.$executeRawUnsafe(
      `UPDATE "evaluations" SET "cohort" = 'REGULAR' WHERE "cohort" IS NULL`
    );
    const evalPhaseRes = await prisma.$executeRawUnsafe(
      `UPDATE "evaluations" SET "fyp_phase" = 'FYP_1' WHERE "fyp_phase" IS NULL`
    );
    console.log(`Updated evaluations cohort (${evalCohortRes}) and fyp_phase (${evalPhaseRes}).`);
  } catch (err) {
    console.log('Error updating evaluations raw:', err.message);
  }

  try {
    const panelCohortRes = await prisma.$executeRawUnsafe(
      `UPDATE "evaluation_panels" SET "cohort" = 'REGULAR' WHERE "cohort" IS NULL`
    );
    const panelPhaseRes = await prisma.$executeRawUnsafe(
      `UPDATE "evaluation_panels" SET "fyp_phase" = 'FYP_1' WHERE "fyp_phase" IS NULL`
    );
    console.log(`Updated evaluation panels cohort (${panelCohortRes}) and fyp_phase (${panelPhaseRes}).`);
  } catch (err) {
    console.log('Error updating panels raw:', err.message);
  }

  try {
    const indRes = await prisma.$executeRawUnsafe(
      `UPDATE "industrial_projects" SET "fyp_phase" = 'FYP_1' WHERE "fyp_phase" IS NULL`
    );
    console.log(`Updated null fyp_phase on ${indRes} industrial projects.`);
  } catch (err) {
    console.log('Error updating industrial projects raw:', err.message);
  }

  // Display summary of students and groups
  const studentsCount = await prisma.student.count();
  const groupsCount = await prisma.group.count();
  console.log(`Current DB contains ${studentsCount} students and ${groupsCount} groups.`);

  console.log('Update completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during default updates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
