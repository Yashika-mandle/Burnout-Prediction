import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? "/login" : "/signup";
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Authentication failed");
        setLoading(false);
        return;
      }

      // Store token and username
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", data.username);

      toast.success(data.message || "Success!");
      setFormData({ username: "", password: "" });

      // Redirect to dashboard
      setTimeout(() => {
        setLocation("/dashboard");
      }, 500);
    } catch (error) {
      toast.error("Connection error. Make sure the backend is running.");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="glass-card w-full max-w-md shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg font-bold mx-auto mb-4">
              SB
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-gray-600">
              {isLogin
                ? "Sign in to access your burnout assessment"
                : "Join us to start your wellness journey"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-gray-700 font-medium">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                required
                className="mt-2 bg-gray-50 border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="mt-2 bg-gray-50 border-gray-300"
              />
            </div>

            {!isLogin && (
              <p className="text-xs text-gray-600">
                Password must be at least 6 characters long
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({ username: "", password: "" });
                }}
                className="text-indigo-600 font-medium hover:text-indigo-700 transition"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>

          {/* Demo Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Demo:</strong> Use any username/password (min 3/6 chars) to create an account or login.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
