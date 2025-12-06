import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CoordinatorDashboardClient from './dashboard-client';

export default async function CoordinatorDashboard() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'coordinator') {
    redirect('/unauthorized');
  }

  return <CoordinatorDashboardClient user={session.user} />;
}
