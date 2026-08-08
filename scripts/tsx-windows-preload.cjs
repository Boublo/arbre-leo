'use strict';

// tsx derive son dossier temporaire d'un identifiant Unix. Sous Windows,
// fournir un identifiant stable évite un appel système inutile au profil.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  process.geteuid = () => 0;
  const preload = `--require ${JSON.stringify(__filename)}`;
  if (!process.env.NODE_OPTIONS?.includes(__filename)) {
    process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, preload].filter(Boolean).join(' ');
  }
}
