import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CoordinatorProfile from '@/components/CoordinatorProfile';

export default async function CoordinatorProfilePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'coordinator') {
    redirect('/unauthorized');
  }

  return <CoordinatorProfile />;
}
