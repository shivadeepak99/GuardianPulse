import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiService from "../services/api";
import { ErrorDisplay } from "../components/ui";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Log the API call for debugging
      console.log(
        "Attempting login to:",
        apiService.defaults.baseURL + "/users/login",
      );
      console.log("With credentials:", { email, password: "***" });

      const response = await apiService.post("/users/login", {
        email,
        password,
      });

      console.log("Login response:", response);

      // Access the response data from Axios
      const responseData = response.data;

      if (responseData.success) {
        // Store the token
        localStorage.setItem("token", responseData.data.token);
        localStorage.setItem("user", JSON.stringify(responseData.data.user));

        // Navigate to dashboard
        navigate("/dashboard");
      } else {
        setError(responseData.message || "Login failed");
      }
    } catch (err: any) {
      console.error("Login error:", err);

      // Handle both Axios errors and custom errors
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (
        err.code === "NETWORK_ERROR" ||
        err.message.includes("Network Error")
      ) {
        setError(
          "Cannot connect to server. Please check if the backend is running on http://localhost:8080",
        );
      } else {
        setError(err.message || "An error occurred during login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-cyber-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-neon-cyan opacity-10 rounded-full animate-pulse-slow blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-neon-pink opacity-10 rounded-full animate-float blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-neon-green opacity-5 rounded-full animate-glow blur-2xl"></div>
      </div>

      <div className="relative max-w-md w-full space-y-4">
        {/* Logo/Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-neon rounded-lg flex items-center justify-center mb-3 animate-glow">
            <div className="text-white text-2xl font-bold select-none">⚡</div>
          </div>
          <h2 className="text-xl font-cyber font-bold text-white mb-1">
            Guardian<span className="text-neon-cyan">Pulse</span>
          </h2>
          <p className="text-gray-400 font-mono text-xs mb-4">
            Secure Access Portal
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-dark-800/90 backdrop-blur-xl border border-cyber-600/30 rounded-xl p-6 shadow-2xl">
          {error && (
            <div className="mb-4">
              <ErrorDisplay
                error={error}
                variant="default"
                className="border-red-500/30 bg-red-900/20"
              />
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-300 mb-1 font-mono"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark-700/50 border border-cyber-600/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-transparent transition-all duration-300 font-mono text-sm"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-300 mb-1 font-mono"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark-700/50 border border-cyber-600/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-transparent transition-all duration-300 font-mono text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="w-4 h-4 text-neon-cyan bg-dark-700 border-cyber-600 rounded focus:ring-neon-cyan focus:ring-2"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-xs text-gray-400 font-mono"
                >
                  Remember me
                </label>
              </div>

              <div className="text-xs">
                <a
                  href="#"
                  className="font-medium text-neon-cyan hover:text-neon-pink transition-colors duration-300 font-mono"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-black bg-gradient-neon hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 animate-glow font-cyber"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 w-5 h-5 text-black"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Authenticating...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-cyber-600/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-dark-800 text-gray-400 font-mono">
                  New to GuardianPulse?
                </span>
              </div>
            </div>

            <div className="mt-3">
              <Link
                to="/register"
                className="w-full flex justify-center py-2.5 px-4 border border-cyber-600/50 text-sm font-medium rounded-lg text-neon-cyan bg-transparent hover:bg-cyber-600/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyber-600 transition-all duration-300 font-cyber"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500 font-mono">
            Protected by advanced encryption • Privacy guaranteed
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
