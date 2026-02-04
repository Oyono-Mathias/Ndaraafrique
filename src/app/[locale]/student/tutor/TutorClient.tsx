
'use client';

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AiTutorClient } from "@/components/chat/ai-tutor-client";
import { Loader2 } from "lucide-react";

function TutorContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query');
  const initialContext = searchParams.get('context');

  return (
    <div className="h-screen w-full overflow-hidden">
        <AiTutorClient initialQuery={initialQuery} initialContext={initialContext} />
    </div>
  );
}

export default function TutorClient() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0b141a]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <TutorContent />
    </Suspense>
  );
}
