'use client';

import AdminDashboard from "@/components/dashboards/admin-dashboard";
import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";


export default function AdminRootPage() {
  const { formaAfriqueUser, isUserLoading } = useRole();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isUserLoading && formaAfriqueUser?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isUserLoading, formaAfriqueUser, router]);
  
  if (isUserLoading || formaAfriqueUser?.role !== 'admin') {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background dark:bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <AdminDashboard />;
}
