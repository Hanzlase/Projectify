import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import StudentProfile from '@/components/StudentProfile';

export default async function StudentProfilePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'student') {
    redirect('/unauthorized');
  }

  return <StudentProfile />;
}
