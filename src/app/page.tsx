import { GameComponent } from "@/components/GameComponent";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Şarkı Tahmin Oyunu 🎵</h1>
      <GameComponent />
    </div>
  );
}
