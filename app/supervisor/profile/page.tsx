import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SupervisorProfile from '@/components/SupervisorProfile';

export default async function SupervisorProfilePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'supervisor') {
    redirect('/unauthorized');
  }

  return <SupervisorProfile />;
}
