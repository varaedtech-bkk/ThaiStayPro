import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Clock,
  Home,
  Bell,
  FileText,
  BarChart,
  ChevronDown,
  Settings,
  LogOut,
  Users,
  CreditCard,
  Menu,
  X,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin = false }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Determine the initials for the avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const userInitials = user?.fullName ? getInitials(user.fullName) : "U";

  const isActive = (path: string) => {
    return location === path;
  };

  const adminLinks = [
    { path: "/admin", icon: <Home size={18} />, label: "Dashboard" },
    { path: "/admin/users", icon: <Users size={18} />, label: "Users" },
    { path: "/admin/visa-analytics", icon: <BarChart size={18} />, label: "Visa Analytics" },
    { path: "/admin/payments", icon: <CreditCard size={18} />, label: "Payments" },
  ];

  const userLinks = [
    { path: "/", icon: <Home size={18} />, label: "Dashboard" },
    { path: "/reminders", icon: <Bell size={18} />, label: "All Reminders" },
    { path: "/visa-reminders", icon: <Clock size={18} />, label: "Visa Reminders" },
    { path: "/bill-reminders", icon: <FileText size={18} />, label: "Bill Reminders" },
    { path: "/task-reminders", icon: <BarChart size={18} />, label: "Task Reminders" },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  // Mobile menu button
  const MobileMenuButton = () => (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden fixed top-4 right-4 z-50"
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
    >
      {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
    </Button>
  );

  // Mobile sidebar
  const MobileSidebar = () => (
    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-primary" />
              <span className="text-lg font-semibold">
                {isAdmin ? "Admin Panel" : "ReminderPro"}
              </span>
            </div>
          </div>
          <nav className="flex-1 py-4 px-2 space-y-1">
            {links.map((link) => (
              <Link key={link.path} href={link.path}>
                <a
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isActive(link.path)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary/10"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.icon}
                  <span className="ml-3">{link.label}</span>
                </a>
              </Link>
            ))}
            
            {!isAdmin && (
              <>
                <Link href="/settings">
                  <a
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isActive("/settings")
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary/10"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings size={18} />
                    <span className="ml-3">Settings</span>
                  </a>
                </Link>
                
                <Link href="/upgrade">
                  <a
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isActive("/upgrade")
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary/10"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Crown size={18} className="text-orange-500" />
                    <span className="ml-3">Upgrade to Pro</span>
                  </a>
                </Link>
              </>
            )}
            
            <button
              className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary/10"
              onClick={() => {
                handleLogout();
                setIsMobileMenuOpen(false);
              }}
            >
              <LogOut size={18} />
              <span className="ml-3">Logout</span>
            </button>
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center">
              <Avatar>
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs font-medium text-muted-foreground">
                  {user?.planType === "pro" ? "Pro Plan" : "Free Plan"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Clock className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">
            {isAdmin ? "Admin Panel" : "ReminderPro"}
          </span>
        </div>
        <MobileSidebar />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col h-screen sticky top-0">
        <div className="flex flex-col flex-grow border-r border-gray-200 bg-white overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 h-16">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-primary" />
              <span className="text-lg font-semibold">
                {isAdmin ? "Admin Panel" : "ReminderPro"}
              </span>
            </div>
          </div>
          <div className="flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1 mt-4">
              {links.map((link) => (
                <Link key={link.path} href={link.path}>
                  <a
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isActive(link.path)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary/10"
                    }`}
                  >
                    {link.icon}
                    <span className="ml-3">{link.label}</span>
                  </a>
                </Link>
              ))}
              
              {!isAdmin && (
                <>
                  <div className="pt-4 mt-4 border-t">
                    <Link href="/settings">
                      <a
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                          isActive("/settings")
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-secondary/10"
                        }`}
                      >
                        <Settings size={18} />
                        <span className="ml-3">Settings</span>
                      </a>
                    </Link>
                    
                    <Link href="/upgrade">
                      <a
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                          isActive("/upgrade")
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-secondary/10"
                        }`}
                      >
                        <Crown size={18} className="text-orange-500" />
                        <span className="ml-3">Upgrade to Pro</span>
                      </a>
                    </Link>
                  </div>
                </>
              )}
              
              <button
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary/10"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                <span className="ml-3">Logout</span>
              </button>
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <Avatar>
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium">{user?.fullName}</p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {user?.planType === "pro" ? "Pro Plan" : "Free Plan"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
