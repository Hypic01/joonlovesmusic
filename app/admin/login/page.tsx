"use client";

import { useState, useEffect } from "react";

// Force dynamic rendering to avoid build-time errors with environment variables
export const dynamic = 'force-dynamic';
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          router.push("/admin");
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => setCheckingAuth(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid password");
      }

      // Redirect to admin page
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <div className="max-w-[964px] mx-auto">
            <p className="text-[24px] font-semibold">Checking authentication...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 h-full overflow-y-auto">
        <Navbar />

        <div className="max-w-[964px] mx-auto">
          <div className="mb-8">
            <h1 className="text-[48px] font-bold mb-2">Admin Login</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
            {error && (
              <div className="p-4 border-2 border-red-500 bg-red-50">
                <p className="font-semibold text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-[20px] font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 text-[18px] border-2 border-black bg-white focus:outline-none focus:border-(--color-brand-red)"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 text-[24px] font-black border-2 border-black bg-(--color-brand-red) text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 cursor-pointer"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

