"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "/musics", label: "see music ratings" },
    { href: "/artist-rankings", label: "artists power rankings" },
    { href: "/collections", label: "when to listen what" },
  ];

  return (
    <header className="relative mb-8">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-[32px] font-black text-(--color-brand-red) hover:opacity-80"
        >
          joonlovesmusic
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[18px] font-semibold hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Hamburger button - mobile only */}
        <button
          className="md:hidden p-2 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {isOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 bg-white border-2 border-black z-50 mt-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-3 text-[18px] font-semibold hover:bg-neutral-100 border-b border-black last:border-b-0"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
