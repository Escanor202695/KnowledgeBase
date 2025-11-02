import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Brain,
  Menu,
  User,
  LogOut,
  Settings,
  FolderOpen,
  Home,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Separator } from "./ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function Header() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Get current user info
  const { data: userData } = useQuery<{
    user: { email: string; name?: string };
  }>({
    queryKey: ["/api/auth/me"],
    retry: false,
    enabled:
      location !== "/login" &&
      location !== "/signup" &&
      location !== "/forgot-password",
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      // Clear token from localStorage
      localStorage.removeItem("sessionToken");
      // Clear React Query cache
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      setSheetOpen(false);
      setLocation("/login");
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message || "Could not log out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isAuthPage =
    location === "/login" ||
    location === "/signup" ||
    location === "/forgot-password";
  const isAuthenticated = !!userData?.user;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="max-w-[1600px] mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Brain className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Lazy Learning</span>
        </button>

        {!isAuthPage && (
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground hidden sm:block">
              AI-Powered Knowledge Base
            </p>

            {isAuthenticated && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="button-user-menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Account Menu</SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-6">
                    {/* User Info Section */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {userData?.user.name && (
                            <p className="text-sm font-medium truncate">
                              {userData.user.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground truncate">
                            {userData?.user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Navigation Links */}
                    <nav className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setLocation("/");
                          setSheetOpen(false);
                        }}
                        data-testid="link-home"
                      >
                        <Home className="mr-3 h-4 w-4" />
                        Home
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setLocation("/sources");
                          setSheetOpen(false);
                        }}
                        data-testid="link-sources"
                      >
                        <FolderOpen className="mr-3 h-4 w-4" />
                        Sources
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setLocation("/settings");
                          setSheetOpen(false);
                        }}
                        data-testid="link-settings"
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        Settings
                      </Button>
                    </nav>

                    <Separator />

                    {/* Logout Button */}
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                      data-testid="button-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {logoutMutation.isPending ? "Logging out..." : "Log out"}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
