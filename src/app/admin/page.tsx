'use client';

import { AdminDashboard } from "@/components/dashboards/admin-dashboard";
import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminRootPage() {
  const { formaAfriqueUser, isUserLoading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && formaAfriqueUser?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isUserLoading, formaAfriqueUser, router]);
  
  if (isUserLoading || formaAfriqueUser?.role !== 'admin') {
    return (
        <div className="flex justify-center items-center h-full">
            {/* You can add a loader here if you want */}
        </div>
    );
  }

  return <AdminDashboard />;
}
