import type { ReactNode } from 'react';
import { Globe } from 'lucide-react';

export default function PhishingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
      <div className="w-full max-w-4xl relative">
        <div className="rounded-2xl bg-card text-card-foreground shadow-sm py-12 px-8 sm:px-10">
          <div className="mx-auto flex flex-col items-center justify-center text-center">
            {children}
          </div>
        </div>
        <footer className="mt-8 flex justify-between items-center text-xs w-full px-2">
           <div className="flex items-center gap-1 text-muted-foreground">
             <Globe className="h-4 w-4"/>
             <select className="bg-transparent text-muted-foreground focus:outline-none">
                <option value="en-US">English (United States)</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
             </select>
           </div>
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
