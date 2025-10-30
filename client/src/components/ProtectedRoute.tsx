import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  // Check if user is authenticated
  const { data, isLoading, error } = useQuery<{ user: any }>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isLoading && (error || !data?.user)) {
      setLocation("/login");
    }
  }, [isLoading, error, data, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.user) {
    return null;
  }

  return <>{children}</>;
}
