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
      {/* Mobile: 3 lines */}
      <h1 className="md:hidden">
        {mobileLines.map((line) => (
          <span key={line} className="block text-[140px]">
            {line}
          </span>
        ))}
      </h1>

      {/* Tablet/Desktop: single line */}
      <h1 className="hidden whitespace-nowrap md:block md:text-[146px] lg:text-[221px] 2xl:text-[278px]">
        {desktopText}
      </h1>
    </div>
  );
}

