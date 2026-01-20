import { config } from 'dotenv';
config();

import '@/ai/flows/mathias-tutor-flow.ts';
import '@/ai/flows/assist-course-creation.ts';
import '@/ai/flows/assist-assignment-creation.ts';
import '@/ai/flows/assist-lecture-creation.ts';
import '@/ai/flows/generate-announcement-flow.ts';
import '@/ai/flows/admin-assistant-flow.ts';
import '@/ai/flows/grade-assignment-flow.ts';
import '@/ai/flows/detect-fraud-flow.ts';
