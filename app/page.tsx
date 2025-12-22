import HeroHeading from "./components/HeroHeading";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 h-full overflow-hidden flex items-center justify-center">
        <HeroHeading className="absolute inset-x-0 top-4 md:top-0 lg:top-[-40px]" />

        <div className="flex flex-col items-center gap-3 lg:gap-6 text-center mt-64 md:mt-72 lg:mt-0">
          <Link className="text-[32px] font-semibold hover:underline" href="/musics">
            see music ratings
          </Link>
          <Link className="text-[32px] font-semibold hover:underline" href="/artist-rankings">
            artists power rankings
          </Link>
          <Link className="text-[32px] font-semibold hover:underline" href="/collections">
            when to listen what
          </Link>
          <Link className="text-[26px] font-semibold opacity-70 hover:underline" href="/criteria">
            rating criteria
          </Link>
        </div>
      </div>
    </main>
  );
}
