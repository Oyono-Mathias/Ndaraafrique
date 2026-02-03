'use client';

import { AiTutorClient } from "@/components/chat/ai-tutor-client";
import { Card, CardContent } from "@/components/ui/card";

export default function TutorClient() {
  return (
    <div className="h-[calc(100vh_-_theme(spacing.16))] -m-6">
      <Card className="h-full w-full border-0 rounded-none shadow-none">
        <CardContent className="p-0 h-full">
            <AiTutorClient />
        </CardContent>
      </Card>
    </div>
  );
}
