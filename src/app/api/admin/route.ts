"use server";

import { NextRequest, NextResponse } from 'next/server';
import { get, ref, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { initialState } from '@/lib/state';

export const dynamic = 'force-dynamic';

async function getAdminCredentials() {
  const adminRef = ref(db, 'admin');
  let adminSnapshot = await get(adminRef);

  // If admin credentials don't exist, create them with defaults
  if (!adminSnapshot.exists()) {
    const defaultCreds = {
        username: "ChamathZ",
        password: "kjkszpjgta1@A",
    };
    await set(adminRef, defaultCreds);
    adminSnapshot = await get(adminRef); // Re-fetch the snapshot
  }
  
  return adminSnapshot.val();
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    switch (body.action) {
      case 'getAdminCredentials': {
        const credentials = await getAdminCredentials();
        return NextResponse.json(credentials);
      }
      case 'updateAdminCredentials': {
        const { username, password } = body;
        if (!username || !password) {
          return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }
        await set(ref(db, 'admin'), { username, password });
        return NextResponse.json({ success: true, message: 'Credentials updated successfully' });
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in /api/admin:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}
