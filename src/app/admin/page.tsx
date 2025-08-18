"use client";

import { useState } from 'react';
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import AdminLogin from "@/components/admin/AdminLogin";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 md:p-8 flex items-center justify-center">
      {isAuthenticated ? (
        <AdminDashboard />
      ) : (
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
