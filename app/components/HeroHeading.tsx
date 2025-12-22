type HeroHeadingProps = {
  desktopText?: string;
  mobileLines?: [string, string, string];
  className?: string;
};

export default function HeroHeading({
  desktopText = "joonlovesmusic",
  mobileLines = ["joon", "loves", "music"],
  className = "",
}: HeroHeadingProps) {
  return (
    <div
      className={`w-full text-(--color-brand-red) leading-none tracking-tight text-center ${className}`}
    >
      {/* Mobile & Tablet: 3 lines with tighter spacing */}
      <h1 className="lg:hidden" style={{ lineHeight: 0.5 }}>
        {mobileLines.map((line) => (
          <span key={line} className="block text-[140px] md:text-[180px]">
            {line}
          </span>
        ))}
      </h1>

      {/* Desktop: single line */}
      <h1 className="hidden whitespace-nowrap lg:block lg:text-[221px] 2xl:text-[278px]">
        {desktopText}
      </h1>
    </div>
  );
}

