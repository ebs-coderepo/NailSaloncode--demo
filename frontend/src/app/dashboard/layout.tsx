import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { getSession } from '@/lib/session';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();

  // Belt-and-suspenders: middleware already redirects, but just in case
  if (!session) redirect('/login');

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      <Sidebar
        userName={session.name}
        userRole={session.role}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
