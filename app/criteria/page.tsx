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
            <div className="space-y-6 text-[22px] leading-relaxed">
              <h1 className="text-[56px] font-bold mb-8">Rating Criteria (0–100)</h1>
              
              <p className="text-[24px] mb-8">
                I rate songs on a 0–100 scale. Higher scores mean I personally replay it more, feel more strongly about it, and would miss it if it disappeared.
              </p>

              <p className="text-[24px] mb-8">
                Rating above 70 is actually considered pretty good! I set the average to be around 50.
              </p>

              {/* 90-100 */}
              <div className="mb-6">
                <h2 className="text-[40px] font-bold mb-2">90–100 — Desert island</h2>
                <div className="ml-6 space-y-1 text-[22px]">
                  <p><strong>99–100:</strong> I can&apos;t imagine my life without this</p>
                  <p><strong>96–98:</strong> I return to this constantly over time</p>
                  <p><strong>93–95:</strong> This is one of my favorites</p>
                  <p><strong>90–92:</strong> This clearly belongs at the top</p>
                </div>
              </div>

              {/* 80-89 */}
              <div className="mb-6">
                <h2 className="text-[40px] font-bold mb-2">80–89 — Very good</h2>
                <div className="ml-6 space-y-1 text-[22px]">
                  <p><strong>87–89:</strong> I love this and would recommend it</p>
                  <p><strong>84–86:</strong> I actively replay this</p>
                  <p><strong>80–83:</strong> I consistently enjoy this</p>
                </div>
              </div>

              {/* 70-79 */}
              <div className="mb-6">
                <h2 className="text-[40px] font-bold mb-2">70–79 — Playlist lock</h2>
                <div className="ml-6 space-y-1 text-[22px]">
                  <p><strong>77–79:</strong> This stands out in a great way</p>
                  <p><strong>74–76:</strong> I enjoy this regularly</p>
                  <p><strong>70–73:</strong> I&apos;m happy to keep this saved</p>
                </div>
              </div>

              {/* 60-69 */}
              <div className="mb-6">
                <h2 className="text-[40px] font-bold mb-2">60–69 — Worth keeping</h2>
                <div className="ml-6 space-y-1 text-[22px]">
                  <p><strong>67–69:</strong> I enjoy this more than average</p>
                  <p><strong>64–66:</strong> I generally enjoy this</p>
                  <p><strong>60–63:</strong> I like this sometimes</p>
                </div>
              </div>

              {/* 50-59 */}
              <div className="mb-6">
                <h2 className="text-[40px] font-bold mb-2">50–59 — Fine in the moment</h2>
                <div className="ml-6 space-y-1 text-[22px]">
                  <p><strong>57–59:</strong> I mildly enjoy this while it&apos;s on</p>
                  <p><strong>54–56:</strong> I&apos;m okay with this as background</p>
                  <p><strong>50–53:</strong> I feel neutral about this</p>
                </div>
              </div>

              {/* 40-49 */}
              <div className="mb-6">
                <h2 className="text-[40px] font-bold mb-2">40–49 — Below average</h2>
                <div className="ml-6 space-y-1 text-[22px]">
                  <p><strong>47–49:</strong> I sometimes enjoy this</p>
                  <p><strong>44–46:</strong> I&apos;m mostly indifferent to this</p>
                  <p><strong>40–43:</strong> I rarely enjoy this</p>
                </div>
              </div>

              {/* 30-39 */}
              <div className="mb-6">
                <h2 className="text-[40px] font-bold mb-2">30–39 — Meh</h2>
                <div className="ml-6 space-y-1 text-[22px]">
                  <p><strong>37–39:</strong> I don&apos;t enjoy this much</p>
                  <p><strong>34–36:</strong> I usually don&apos;t enjoy this</p>
                  <p><strong>30–33:</strong> I don&apos;t enjoy this</p>
                </div>
              </div>

              {/* 20-29 */}
              <div className="mb-6">
                <h2 className="text-[40px] font-bold mb-2">20–29 — Boring</h2>
                <div className="ml-6 space-y-1 text-[22px]">
                  <p><strong>27–29:</strong> I find this unengaging</p>
                  <p><strong>24–26:</strong> I find this boring</p>
                  <p><strong>20–23:</strong> I really don&apos;t enjoy this</p>
                </div>
              </div>

              {/* 10-19 */}
              <div className="mb-6">
                <h2 className="text-[40px] font-bold mb-2">10–19 — Rarely want to hear again</h2>
                <div className="ml-6 space-y-1 text-[22px]">
                  <p><strong>17–19:</strong> I can tolerate this briefly</p>
                  <p><strong>14–16:</strong> I usually skip this</p>
                  <p><strong>10–13:</strong> I skip this immediately</p>
                </div>
              </div>

              {/* 0-9 */}
              <div className="mb-6">
                <h2 className="text-[40px] font-bold mb-2">0–9 — Please don&apos;t play this</h2>
                <div className="ml-6 space-y-1 text-[22px]">
                  <p><strong>7–9:</strong> I dislike this</p>
                  <p><strong>4–6:</strong> I strongly dislike this</p>
                  <p><strong>0–3:</strong> I can&apos;t stand this</p>
                </div>
              </div>
            </div>
          )}

          {/* Page 2: Additional Notes */}
          {currentPage === 2 && (
            <div className="space-y-8 text-[24px] leading-relaxed">
              <div className="flex items-start gap-4">
                <span className="text-[28px] mt-1">•</span>
                <p>
                  <span className="font-bold">
                    First thing and most important thing: this is website made by
                    me. So the ratings are obviously going to be VERY VERY
                    SUBJECTIVE.
                  </span>
                  <br />
                  <span className="text-(--color-brand-red) text-[22px] mt-2 inline-block">
                    If you are upset, go make your own website then.
                  </span>
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[28px] mt-1">•</span>
                <p>
                  <span className="font-bold">
                    A score like 62 might seem pretty low, but I set the average to be around 50, so don&apos;t be upset if you think the score is low!
                  </span>
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[28px] mt-1">•</span>
                <p>
                  <span className="font-bold">Ratings can really vary.</span> They can vary depending on the time, place, how you feel, what situation you are going through in your life. It can also vary if you listen live, on MacBook speaker, or good headphones.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[28px] mt-1">•</span>
                <p>
                  <span className="font-bold">Yes, I admit I prefer EDM I guess,</span> but I am open to every genre, every music. Feel free to recommend me songs, even if it is not EDM and even if you think I won&apos;t like them. Every song works towards me &apos;machine learning&apos; the musics.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[28px] mt-1">•</span>
                <p>
                  <span className="font-bold">First, I&apos;m trying to rate the musics by shuffling through my Spotify liked songs.</span> I am trying to add about 50 songs every day.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[28px] mt-1">•</span>
                <p>
                  <span className="font-bold">Before I rate the music, I at least try to listen to the full music at least once.</span>
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[28px] mt-1">•</span>
                <p>
                  I didn&apos;t divide musics by genres, because I don&apos;t like dividing
                  musics by genres. Sometimes the genre can be ambiguous, and I
                  feel like doing so limits the creativity of the musics. I don&apos;t
                  like setting up boundaries for the musics.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[28px] mt-1">•</span>
                <p>
                  It is true that sometimes the rating can change overtime, some
                  musics hit different as time goes by, some don&apos;t. I won&apos;t change
                  the rating much after setting, but only when I really feel like
                  it.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[28px] mt-1">•</span>
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

