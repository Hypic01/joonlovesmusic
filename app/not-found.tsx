import Link from "next/link";
import Navbar from "./components/Navbar";

export default function NotFound() {
  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 h-full overflow-y-auto">
        <Navbar />

        <div className="max-w-[964px] mx-auto flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <h1 className="text-[72px] font-bold text-center mb-8">404</h1>
          <p className="text-[32px] font-semibold mb-8">Page Not Found</p>
          <Link
            href="/"
            className="px-8 py-4 border-2 border-black bg-white hover:border-(--color-brand-red) font-semibold text-[20px] cursor-pointer"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}

