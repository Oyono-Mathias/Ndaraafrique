'use client';

import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, PanelLeft } from "lucide-react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

function AdminAccessRequiredScreen() {
    const router = useRouter();
    return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-gray-900 text-white">
             <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold">Accès Interdit</h1>
            <p className="text-gray-400">Vous n'avez pas les autorisations nécessaires pour accéder à cette page.</p>
            <button onClick={() => router.push('/dashboard')} className="mt-6 px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700">
                Retour au tableau de bord
            </button>
        </div>
    )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { formaAfriqueUser, isUserLoading, role, switchRole } = useRole();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isUserLoading && formaAfriqueUser?.role === 'admin' && role !== 'admin') {
      switchRole('admin');
    }
  }, [isUserLoading, formaAfriqueUser, role, switchRole]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (formaAfriqueUser?.role !== 'admin' || role !== 'admin') {
    return <AdminAccessRequiredScreen />;
  }
  
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] bg-gray-900 text-white">
      <aside className="hidden border-r border-slate-700 bg-[#1e293b] md:block">
           <AdminSidebar />
      </aside>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b border-slate-700 bg-[#1e293b] px-4 lg:h-[60px] lg:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden bg-transparent border-slate-600 text-white"
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Ouvrir le menu de navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 bg-[#1e293b] border-slate-700 text-white w-full max-w-sm">
                <AdminSidebar />
            </SheetContent>
          </Sheet>
           <div className="w-full flex-1">
            {/* You can add a search bar or other header elements here if needed */}
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
            {children}
        </main>
      </div>
    </div>
  )
}
