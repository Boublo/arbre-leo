import { NextResponse, type NextRequest } from 'next/server';
import { creerClientServeur } from '@/lib/supabase/server';

/**
 * Point d'arrivée du lien de confirmation envoyé par e-mail.
 * On échange le code contre une session, puis on oriente : vers l'arbre si
 * l'accès est déjà ouvert, vers la page d'attente sinon.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/connexion?erreur=lien_invalide`);
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/connexion?erreur=lien_expire`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/connexion`);
  }

  const { data: membre, error: erreurFiche } = await supabase.rpc('assurer_fiche_membre');
  if (erreurFiche || !membre) {
    return NextResponse.redirect(`${origin}/connexion?erreur=lien_invalide`);
  }

  const suite = searchParams.get('suite');
  const suiteValide =
    suite && suite.startsWith('/') && !suite.startsWith('//') ? suite : null;

  // Même domaine que la requête courante : les cookies de session y sont attachés.
  const destination =
    membre.statut === 'valide'
      ? suiteValide ?? '/'
      : suiteValide
        ? `/attente?suite=${encodeURIComponent(suiteValide)}`
        : '/attente';
  return NextResponse.redirect(`${origin}${destination}`);
}
