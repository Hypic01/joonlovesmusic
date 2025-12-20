import Link from "next/link";

export default function Navbar() {
  return (
    <header className="flex items-center justify-between mb-8">
      <Link
        href="/"
        className="text-[32px] font-black text-(--color-brand-red) hover:opacity-80"
      >
        joonlovesmusic
      </Link>
      <nav className="flex gap-8">
        <Link
          href="/musics"
          className="text-[18px] font-semibold hover:underline"
        >
          see music ratings
        </Link>
        <Link
          href="/collections"
          className="text-[18px] font-semibold hover:underline"
        >
          when to listen what
        </Link>
      </nav>
    </header>
  );
}

