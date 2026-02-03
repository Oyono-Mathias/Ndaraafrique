
'use client';

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AiTutorClient } from "@/components/chat/ai-tutor-client";
import { Card, CardContent } from "@/components/ui/card";

function TutorContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query');
  const initialContext = searchParams.get('context');

  return (
    <div className="h-[calc(100vh_-_theme(spacing.16))] -m-6">
      <Card className="h-full w-full border-0 rounded-none shadow-none">
        <CardContent className="p-0 h-full">
            <AiTutorClient initialQuery={initialQuery} initialContext={initialContext} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function TutorClient() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <TutorContent />
    </Suspense>
  );
}

import { Loader2 } from "lucide-react";
