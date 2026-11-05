import { createActivity, listActivities } from '@/server/api/teacherApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = listActivities;
export const POST = createActivity;
