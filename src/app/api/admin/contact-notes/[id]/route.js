import { NextResponse } from 'next/server';
import { deleteNote } from '@/lib/services/admin/contactNotes.service.js';

export async function DELETE(request, { params }) {
  try {
    await deleteNote(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
