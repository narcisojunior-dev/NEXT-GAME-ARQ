import { createClassroom, listClassrooms } from '@/server/api/teacherApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = listClassrooms;
export const POST = createClassroom;
