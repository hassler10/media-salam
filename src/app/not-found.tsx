import Link from "next/link";
import { AnimatedBg } from "@/components/animated-bg";

export default function NotFound() {
  return (
    <main className="login-page">
      <AnimatedBg variant="immersive" />
      <div className="login-card">
        <h1>Page introuvable</h1>
        <p>Cette adresse n&apos;existe pas dans le service de maintenance numérique.</p>
        <Link href="/" className="btn btn-primary btn-block">
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}
