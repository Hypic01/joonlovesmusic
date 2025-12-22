"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";

export default function CriteriaPage() {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 h-full overflow-y-auto">
        <Navbar />

        <div className="max-w-[1000px] mx-auto">
          {/* Page 1: Rating Criteria Scale */}
          {currentPage === 1 && (
            <div className="space-y-6 text-[18px] leading-relaxed">
              <h1 className="text-[48px] font-bold mb-8">Rating Criteria (0–100)</h1>
              
              <p className="text-[20px] mb-8">
                I rate songs on a 0–100 scale. Higher scores mean I personally replay it more, feel more strongly about it, and would miss it if it disappeared.
              </p>

              {/* 90-100 */}
              <div className="mb-6">
                <h2 className="text-[32px] font-bold mb-2">90–100 — Desert island</h2>
                <p className="mb-3">If I could only keep a few songs forever, this would be one of them.</p>
                <div className="ml-6 space-y-1">
                  <p><strong>99–100:</strong> I can&apos;t imagine my life without this song</p>
                  <p><strong>96–98:</strong> I come back to this constantly, year after year</p>
                  <p><strong>93–95:</strong> This is one of my personal favorites</p>
                  <p><strong>90–92:</strong> This clearly belongs in my all-time tier</p>
                </div>
              </div>

              {/* 80-89 */}
              <div className="mb-6">
                <h2 className="text-[32px] font-bold mb-2">80–89 — Very good</h2>
                <p className="mb-3">I actively choose to listen to this and revisit it often.</p>
                <div className="ml-6 space-y-1">
                  <p><strong>87–89:</strong> I strongly recommend this to people</p>
                  <p><strong>84–86:</strong> I intentionally replay this</p>
                  <p><strong>80–83:</strong> I&apos;m always happy when this comes on</p>
                </div>
              </div>

              {/* 70-79 */}
              <div className="mb-6">
                <h2 className="text-[32px] font-bold mb-2">70–79 — Playlist lock</h2>
                <p className="mb-3">This stays saved. I don&apos;t skip it.</p>
                <div className="ml-6 space-y-1">
                  <p><strong>77–79:</strong> This noticeably elevates a playlist</p>
                  <p><strong>74–76:</strong> I regularly enjoy this</p>
                  <p><strong>70–73:</strong> Easy keep, no reason to remove</p>
                </div>
              </div>

              {/* 60-69 */}
              <div className="mb-6">
                <h2 className="text-[32px] font-bold mb-2">60–69 — Worth keeping</h2>
                <p className="mb-3">Not a go-to, but I&apos;m glad I have it for the right moment.</p>
                <div className="ml-6 space-y-1">
                  <p><strong>67–69:</strong> I appreciate this more over time</p>
                  <p><strong>64–66:</strong> There&apos;s something catchy or appealing here</p>
                  <p><strong>60–63:</strong> It&apos;s good, but not essential</p>
                </div>
              </div>

              {/* 50-59 */}
              <div className="mb-6">
                <h2 className="text-[32px] font-bold mb-2">50–59 — Fine in the moment</h2>
                <p className="mb-3">It works while it&apos;s on, but I don&apos;t think about it later.</p>
                <div className="ml-6 space-y-1">
                  <p><strong>57–59:</strong> Mildly enjoyable</p>
                  <p><strong>54–56:</strong> Fine as background</p>
                  <p><strong>50–53:</strong> Neutral reaction</p>
                </div>
              </div>

              {/* 40-49 */}
              <div className="mb-6">
                <h2 className="text-[32px] font-bold mb-2">40–49 — Nice idea, doesn&apos;t land</h2>
                <p className="mb-3">I see what it&apos;s trying to do, but it doesn&apos;t really work for me.</p>
                <div className="ml-6 space-y-1">
                  <p><strong>47–49:</strong> Almost enjoyable</p>
                  <p><strong>44–46:</strong> I&apos;m often tempted to skip</p>
                  <p><strong>40–43:</strong> One part is okay, the rest isn&apos;t</p>
                </div>
              </div>

              {/* 30-39 */}
              <div className="mb-6">
                <h2 className="text-[32px] font-bold mb-2">30–39 — Meh</h2>
                <p className="mb-3">Nothing pulls me in, and I won&apos;t replay it.</p>
                <div className="ml-6 space-y-1">
                  <p><strong>37–39:</strong> Close to being okay, but still uninteresting</p>
                  <p><strong>34–36:</strong> A few moments, no impact</p>
                  <p><strong>30–33:</strong> Bland and forgettable</p>
                </div>
              </div>

              {/* 20-29 */}
              <div className="mb-6">
                <h2 className="text-[32px] font-bold mb-2">20–29 — Boring</h2>
                <p className="mb-3">It drags or feels generic. I don&apos;t want to hear it again.</p>
                <div className="ml-6 space-y-1">
                  <p><strong>27–29:</strong> Slightly better than boring, still dull</p>
                  <p><strong>24–26:</strong> No spark at all</p>
                  <p><strong>20–23:</strong> Hard to sit through</p>
                </div>
              </div>

              {/* 10-19 */}
              <div className="mb-6">
                <h2 className="text-[32px] font-bold mb-2">10–19 — Rarely want to hear it again</h2>
                <p className="mb-3">I skip this quickly.</p>
                <div className="ml-6 space-y-1">
                  <p><strong>17–19:</strong> I tolerate it briefly</p>
                  <p><strong>14–16:</strong> I skip it most of the time</p>
                  <p><strong>10–13:</strong> Immediate skip</p>
                </div>
              </div>

              {/* 0-9 */}
              <div className="mb-6">
                <h2 className="text-[32px] font-bold mb-2">0–9 — Please don&apos;t play this in front of me</h2>
                <p className="mb-3">Strong negative reaction.</p>
                <div className="ml-6 space-y-1">
                  <p><strong>7–9:</strong> I really don&apos;t like this</p>
                  <p><strong>4–6:</strong> Actively annoying</p>
                  <p><strong>0–3:</strong> Turn it off immediately</p>
                </div>
              </div>
            </div>
          )}

          {/* Page 2: Additional Notes */}
          {currentPage === 2 && (
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
                  <span className="font-bold">
                    A score like 62 might seem pretty low, but I set the average to be around 50, so don&apos;t be upset if you think the score is low!
                  </span>
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[24px] mt-1">•</span>
                <p>
                  <span className="font-bold">Ratings can really vary.</span> They can vary depending on the time, place, how you feel, what situation you are going through in your life. It can also vary if you listen live, on MacBook speaker, or good headphones.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[24px] mt-1">•</span>
                <p>
                  <span className="font-bold">Yes, I admit I prefer EDM I guess,</span> but I am open to every genre, every music. Feel free to recommend me songs, even if it is not EDM and even if you think I won&apos;t like them. Every song works towards me &apos;machine learning&apos; the musics.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[24px] mt-1">•</span>
                <p>
                  <span className="font-bold">First, I&apos;m trying to rate the musics by shuffling through my Spotify liked songs.</span> I am trying to add about 50 songs every day.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[24px] mt-1">•</span>
                <p>
                  <span className="font-bold">Before I rate the music, I at least try to listen to the full music at least once.</span>
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[24px] mt-1">•</span>
                <p>
                  I didn&apos;t divide musics by genres, because I don&apos;t like dividing
                  musics by genres. Sometimes the genre can be ambiguous, and I
                  feel like doing so limits the creativity of the musics. I don&apos;t
                  like setting up boundaries for the musics.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[24px] mt-1">•</span>
                <p>
                  It is true that sometimes the rating can change overtime, some
                  musics hit different as time goes by, some don&apos;t. I won&apos;t change
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
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 my-12">
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-12 h-12 border-2 border-black font-semibold cursor-pointer ${
                currentPage === 1
                  ? "bg-(--color-brand-red) text-white"
                  : "bg-white hover:bg-neutral-100"
              }`}
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`w-12 h-12 border-2 border-black font-semibold cursor-pointer ${
                currentPage === 2
                  ? "bg-(--color-brand-red) text-white"
                  : "bg-white hover:bg-neutral-100"
              }`}
            >
              2
            </button>
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

