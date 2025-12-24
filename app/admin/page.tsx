"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push("/admin/login");
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => router.push("/admin/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (checkingAuth) {
    return (
      <main className="relative h-full overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />
          <div className="max-w-[964px] mx-auto">
            <p className="text-[24px] font-semibold">
              Checking authentication...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 h-full overflow-y-auto">
        <Navbar />

        <div className="max-w-[964px] mx-auto mb-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-[48px] font-black">Admin</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold cursor-pointer"
            >
              Logout
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/admin/music"
              className="p-6 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer"
            >
              <h2 className="text-[24px] font-bold mb-2">Add Song</h2>
              <p className="text-[16px] opacity-70">
                Add new songs to your music collection
              </p>
            </Link>

            <Link
              href="/admin/blog"
              className="p-6 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer"
            >
              <h2 className="text-[24px] font-bold mb-2">Blog Posts</h2>
              <p className="text-[16px] opacity-70">
                Manage &quot;when to listen what&quot; blog posts
              </p>
            </Link>

            <Link
              href="/musics"
              className="p-6 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer"
            >
              <h2 className="text-[24px] font-bold mb-2">View Music List</h2>
              <p className="text-[16px] opacity-70">
                Browse and edit existing songs
              </p>
            </Link>

            <Link
              href="/collections"
              className="p-6 border-2 border-black bg-white hover:border-(--color-brand-red) cursor-pointer"
            >
              <h2 className="text-[24px] font-bold mb-2">View Blog</h2>
              <p className="text-[16px] opacity-70">
                See published blog posts
              </p>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
