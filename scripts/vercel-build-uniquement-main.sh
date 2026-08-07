#!/usr/bin/env bash
# Vercel « Ignored Build Step » : code 0 = pas de build, 1 = lancer le build.
# Seule la branche main (production) consomme des minutes Vercel.
if [ "${VERCEL_GIT_COMMIT_REF:-}" = "main" ]; then
  exit 1
fi
echo "Preview ignorée pour la branche « ${VERCEL_GIT_COMMIT_REF:-?} » — déploiement prod uniquement (main)."
exit 0
