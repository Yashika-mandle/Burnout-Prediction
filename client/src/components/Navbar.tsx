import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const user = localStorage.getItem("user");

  const isActive = (path: string) => {
    if (path === "/") return location === "/" || location === "/home";
    return location === path;
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    toast.success("Logged out successfully!");
    setLocation("/");
    setIsOpen(false);
  };

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Dashboard", path: "/dashboard" },
    { label: "History", path: "/history" },
    { label: "FAQ", path: "/faq" },
    { label: "Contact", path: "/contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/25 bg-white/75 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/65 dark:border-white/10 dark:bg-slate-900/75">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2 font-bold text-xl text-indigo-600 hover:text-indigo-700 transition">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                SB
              </div>
              <span className="hidden sm:inline">BurnoutAI</span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive(item.path)
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </a>
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">Welcome, <span className="font-semibold text-indigo-600">{user}</span></span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </Button>
              </div>
            ) : (
              <Link href="/auth">
                <Button size="sm" asChild>
                  <span>Login / Signup</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 space-y-2 pb-4">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive(item.path)
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              </Link>
            ))}
            {user ? (
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Logout
              </Button>
            ) : (
              <Link href="/auth">
                <Button className="w-full" asChild>
                  <span>Login / Signup</span>
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
