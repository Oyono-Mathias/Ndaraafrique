

'use client';

import AdminDashboard from "@/components/dashboards/admin-dashboard";
import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AdminRootPage() {
  const { formaAfriqueUser: ndaraUser, isUserLoading, role } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && ndaraUser?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isUserLoading, ndaraUser, router]);
  
  if (isUserLoading || !ndaraUser || ndaraUser.role !== 'admin' || role !== 'admin') {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <AdminDashboard />;
}
