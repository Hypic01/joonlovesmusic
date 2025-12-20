import Navbar from "../components/Navbar";

export default function CollectionsPage() {
  return (
    <main className="relative h-full overflow-hidden">
      <div className="relative z-10 h-full overflow-y-auto">
        <Navbar />

        <div className="max-w-[964px] mx-auto flex items-center justify-center h-[calc(100vh-200px)]">
          <h1 className="text-[72px] font-bold text-center">in development!</h1>
        </div>
      </div>
    </main>
  );
}

