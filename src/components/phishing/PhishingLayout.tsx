import type { ReactNode } from 'react';
import { GoogleLogo } from './GoogleLogo';

export default function PhishingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm py-12 px-8 sm:px-10">
          <div className="mx-auto flex flex-col items-center justify-center text-center">
            <GoogleLogo className="h-8 w-auto mb-4" />
            {children}
          </div>
        </div>
        <footer className="mt-8 text-center text-xs">
          <div className="flex justify-center gap-6 text-muted-foreground">
            <a href="#" className="hover:underline">Help</a>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Terms</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
