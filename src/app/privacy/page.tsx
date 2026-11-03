export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8 text-sm leading-relaxed text-foreground">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Politique de confidentialité</h1>
        <p className="text-muted-foreground">ALTA Services — Studio de contenu</p>
      </div>
      <p>
        Cette application (« Studio de contenu ») est un outil interne conçu pour et exploité par
        ALTA Services. Elle n&apos;est pas accessible au grand public.
      </p>
      <h2 className="text-lg font-semibold">Ce que nous stockons</h2>
      <p>
        L&apos;application stocke le contenu qu&apos;elle génère (textes de publication, images) et,
        pour les comptes de réseaux sociaux qu&apos;un membre du personnel d&apos;ALTA Services choisit
        de connecter, le jeton d&apos;accès nécessaire pour publier du contenu sur ce compte. Ces
        données sont stockées dans la base de données propre à l&apos;application et ne sont ni
        vendues ni partagées avec un tiers, à l&apos;exception de la plateforme de réseau social sur
        laquelle le contenu est publié, et uniquement dans le cadre de l&apos;action de publication
        initiée par l&apos;utilisateur.
      </p>
      <h2 className="text-lg font-semibold">Ce que nous ne faisons pas</h2>
      <p>
        Nous n&apos;utilisons pas les comptes de réseaux sociaux connectés pour autre chose que la
        publication du contenu créé par le personnel au sein de cet outil. Nous ne lisons, ne
        collectons ni ne traitons aucune donnée personnelle appartenant aux abonnés des comptes de
        réseaux sociaux ou à d&apos;autres tiers.
      </p>
      <h2 className="text-lg font-semibold">Révocation de l&apos;accès</h2>
      <p>
        Un compte de réseau social connecté peut être déconnecté à tout moment depuis
        l&apos;application, ce qui supprime immédiatement son jeton d&apos;accès stocké.
      </p>
      <h2 className="text-lg font-semibold">Contact</h2>
      <p>Pour toute question concernant cette politique, contactez directement ALTA Services.</p>
    </div>
  );
}
