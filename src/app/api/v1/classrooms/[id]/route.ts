import { deleteClassroom, updateClassroom } from '@/server/api/teacherApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = updateClassroom;
export const DELETE = deleteClassroom;
