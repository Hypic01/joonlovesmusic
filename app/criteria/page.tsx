import Navbar from "../components/Navbar";

export default function CriteriaPage() {
  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 h-full overflow-y-auto">
        <Navbar />

        <div className="max-w-[1000px] mx-auto">
          {/* Main content */}
          <div className="space-y-8 text-[20px] leading-relaxed">
            <div className="flex items-start gap-4">
              <span className="text-[24px] mt-1">•</span>
              <p>
                <span className="font-bold">
                  First thing and most important thing: this is website made by
                  me. So the ratings are obviously going to be VERY VERY
                  SUBJECTIVE.
                </span>
                <br />
                <span className="text-(--color-brand-red) text-[18px] mt-2 inline-block">
                  If you are upset, go make your own website then.
                </span>
              </p>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-[24px] mt-1">•</span>
              <p>
                I didn't divide musics by genres, because I don't like dividing
                musics by genres. Sometimes the genre can be ambiguous, and I
                feel like doing so limits the creativity of the musics. I don't
                like setting up boundaries for the musics.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-[24px] mt-1">•</span>
              <p>
                It is true that sometimes the rating can change overtime, some
                musics hit different as time goes by, some don't. I won't change
                the rating much after setting, but only when I really feel like
                it.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-[24px] mt-1">•</span>
              <p>
                Thanks for visiting by, all the love from Joon. ❤️
              </p>
            </div>
          </div>

          {/* Colored squares at bottom left */}
          <div className="fixed bottom-8 left-8 flex gap-2">
            <div className="w-8 h-8 bg-(--color-brand-red)" />
            <div className="w-8 h-8 bg-[#FF69B4]" />
          </div>
        </div>
      </div>
    </main>
  );
}

