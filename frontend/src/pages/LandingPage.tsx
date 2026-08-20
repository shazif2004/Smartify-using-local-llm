import Features from "../components/Features";
import Hero from "../components/Hero";
import Navbar from "../components/Navbar";

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fbfaf6]">
      <Navbar />
      <Hero />
      <Features />
    </div>
  );
}

export default LandingPage;