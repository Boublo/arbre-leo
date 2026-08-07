-- ===========================================================================
-- Chantiers pour les unions sans descendance encore documentée (aout 2026)
-- ---------------------------------------------------------------------------
-- Aucune piste internet fiable : ces chantiers ouvrent la recherche d'archives.
-- ===========================================================================

insert into arbre.chantiers_recherche (titre, objectif, branche, statut, priorite)
select * from (values
  (
    'SUIRE-01 — Descendance de Jean Pierre SUIRE × Marie Magdelaine Julie SUIRE (1849)',
    'Mariage du 14 février 1849 à Saint-Martin-de-Villeneuve (17). Retrouver les actes de naissance des enfants éventuels dans les registres paroissiaux 2 E 382/1 et tables décennales 5 E 94. Témoin notable : Pierre BOURRU, cousin germain de la future épouse — piste côté PETIT.',
    'SUIRE (paternelle)',
    'a_faire'::arbre.statut_chantier,
    2
  ),
  (
    'SUIRE-02 — Descendance de Jean TURGNE × Marianne SUIRE (1850)',
    'Mariage du 18 novembre 1850 à Saint-Martin-de-Villeneuve (table décennale 5 E 94). Marianne est la sœur de Jacques François SUIRE. Vérifier si des naissances SUIRE 1850-1862 relèvent de ce couple plutôt que de Jacques × Catherine DENIS (1852). Acte de mariage à ouvrir aux AD 17.',
    'SUIRE (paternelle)',
    'a_faire'::arbre.statut_chantier,
    2
  ),
  (
    'SUIRE-03 — Descendance de Théodore FORGET × Marie Valentine VALLEE (1886)',
    'Mariage du 11 octobre 1886 à Priaires (79). Acte qui établit la fratrie VALLEE (Alphonse SUIRE témoin). Rechercher les naissances FORGET ou VALLEE postérieures à 1886 dans les registres des Deux-Sèvres.',
    'SUIRE (paternelle)',
    'a_faire'::arbre.statut_chantier,
    3
  ),
  (
    'BON-06 — Descendance de Jean Raoul BONINO × Yvonne CAMUS (1939)',
    'Mariage du 18 novembre 1939 à Paris 19e (mention marginale sur acte de naissance de l''époux, AD05 Veynes 1916 n° 10). Rechercher les enfants éventuels du couple dans les tables décennales parisiennes ou les actes de naissance postérieurs à 1939.',
    'BONINO (Laura)',
    'a_faire'::arbre.statut_chantier,
    3
  ),
  (
    'BON-07 — Descendance de Noël ANDRÉ × Germaine BONINO (1943)',
    'Mariage du 20 mai 1943 à Chorges (05), sous l''Occupation (mention sur acte de naissance de Germaine, L''Argentière-la-Bessée 1921 n° 43). Rechercher les enfants éventuels du couple dans les registres des Hautes-Alpes.',
    'BONINO (Laura)',
    'a_faire'::arbre.statut_chantier,
    3
  )
) as v(titre, objectif, branche, statut, priorite)
where not exists (
  select 1 from arbre.chantiers_recherche c where c.titre = v.titre
);
