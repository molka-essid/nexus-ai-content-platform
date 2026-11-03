export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8 text-sm leading-relaxed text-foreground">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conditions d&apos;utilisation</h1>
        <p className="text-muted-foreground">ALTA Services — Studio de contenu</p>
      </div>
      <p>
        Cette application (« Studio de contenu ») est un outil interne conçu pour et exploité par
        ALTA Services afin de générer, réviser et publier du contenu sur les réseaux sociaux via les
        comptes propres de l&apos;entreprise (Facebook, Instagram, TikTok, LinkedIn).
      </p>
      <p>
        Ce n&apos;est pas un produit public et il n&apos;est pas disponible pour une inscription ou
        une utilisation par le grand public. L&apos;accès est réservé au personnel d&apos;ALTA
        Services.
      </p>
      <h2 className="text-lg font-semibold">Utilisation des comptes connectés</h2>
      <p>
        Lorsqu&apos;un compte de réseau social est connecté, cette application utilise cette
        connexion uniquement pour publier du contenu créé par un membre du personnel d&apos;ALTA
        Services et explicitement choisi pour publication via l&apos;application. Aucun contenu
        n&apos;est publié automatiquement sans action correspondante de l&apos;utilisateur, sauf si la
        fonctionnalité de publication automatique a été explicitement activée pour ce contenu par le
        personnel.
      </p>
      <h2 className="text-lg font-semibold">Aucune garantie</h2>
      <p>
        Cet outil est fourni tel quel pour un usage interne, sans garantie d&apos;aucune sorte. ALTA
        Services est responsable de la révision du contenu avant sa publication.
      </p>
      <h2 className="text-lg font-semibold">Contact</h2>
      <p>Pour toute question concernant ces conditions, contactez directement ALTA Services.</p>
    </div>
  );
}
