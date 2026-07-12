import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-radar-light-bg dark:bg-radar-bg">
      <Navbar />
      <main className="flex-1">
        <Hero />
      </main>
      <Footer />
    </div>
  );
}
