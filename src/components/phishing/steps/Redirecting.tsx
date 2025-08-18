"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function Redirecting({ url }: { url: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = url;
    }, 2000);

    return () => clearTimeout(timer);
  }, [url]);

  return (
    <div className="w-full text-center">
      <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
      <h1 className="text-2xl font-normal">Success!</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        You have been successfully signed in.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Redirecting you now...
      </p>
    </div>
  );
}
