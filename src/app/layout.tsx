import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { NOM_DU_SITE, SOUS_TITRE_DU_SITE } from '@/lib/site';

// Fraunces pour les titres : une serif contemporaine à l'œil un peu ancien,
// qui va bien à des noms relevés dans des registres du XVIIIe siècle.
const policeTitre = Fraunces({
  variable: '--police-titre',
  subsets: ['latin'],
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const policeCorps = Inter({
  variable: '--police-corps',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: NOM_DU_SITE,
    template: `%s · ${NOM_DU_SITE}`,
  },
  description: SOUS_TITRE_DU_SITE,
  // Un arbre familial n'a rien à faire dans un index de moteur de recherche.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf8f3' },
    { media: '(prefers-color-scheme: dark)', color: '#17130f' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${policeTitre.variable} ${policeCorps.variable} h-full antialiased`}
    >
      <head>
        {/* Applique le thème choisi avant le premier rendu, pour éviter
            l'éclair blanc au chargement en mode sombre. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('arbre-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-fond text-encre">{children}</body>
    </html>
  );
}
