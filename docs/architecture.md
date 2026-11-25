# Architecture technique

Ce document décrit le fonctionnement interne de Rondo, pour qui veut le modifier ou y contribuer.

## Vue d'ensemble

Application Electron en deux processus :

```
┌──────────────────────────── processus principal (main.js) ────────────────────────────┐
│  fenêtre sans bordure · modes · touches multimédia · serveur HTTP local · IPC          │
└───────────────▲───────────────────────────────────────────────────────┬───────────────┘
                │ invoke (window:*)                                     │ send (media:command)
┌───────────────┴──────── preload.cjs : window.widget ──────────────────▼───────────────┐
│                         processus de rendu (React, src/)                                │
│  App.jsx ─ état · composants · hooks · utilitaires ─ lecteur YouTube (iframe)           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

Pile : Electron 39, React 19, Vite 7, Tailwind CSS 4, `lucide-react` (icônes), `motion` (animations).

## Processus principal (`main.js`)

| Responsabilité | Détail |
|---|---|
| Fenêtre | `BrowserWindow` sans bordure, toujours au premier plan, non maximisable, 360 × 470 au départ |
| Modes | Table `MODES` : `full` (360 × 470, minimum 300 × 420, redimensionnable), `miniVideo` (360 × 290, fixe) et `mini` (340 × 84, fixe) |
| Chargement | En développement, l'URL fournie par `VITE_DEV_SERVER_URL`. En production, un serveur HTTP local sert `dist/` |
| Touches multimédia | `globalShortcut` pour `MediaPlayPause`, `MediaNextTrack`, `MediaPreviousTrack` |
| Instance unique | `requestSingleInstanceLock` ; une seconde instance ramène la fenêtre existante au premier plan |

### Pourquoi un serveur local en production

Les vidéos intégrées de YouTube refusent les pages dont l'origine est `file://` (erreurs 152 et 153). `serveDist()`
démarre donc un serveur HTTP minimal sur `localhost`, sur un port libre choisi par le système, qui sert le contenu
de `dist/`. Il refuse tout chemin qui sort de `dist/` ; les fichiers de type inconnu sont servis en `application/octet-stream`.

### Changement de mode

`window:set-mode` rend d'abord la fenêtre redimensionnable (nécessaire pour modifier les contraintes), applique la
taille minimale puis la taille cible, et fixe enfin la redimensionnabilité du mode.

## Pont sécurisé (`preload.cjs`)

Le fichier est en CommonJS car `package.json` déclare `"type": "module"`. Il expose `window.widget` via
`contextBridge`, avec `contextIsolation` activé et `nodeIntegration` désactivé :

| Fonction | Canal IPC | Sens |
|---|---|---|
| `minimize()` | `window:minimize` | rendu → principal |
| `close()` | `window:close` | rendu → principal |
| `setMode(mode)` | `window:set-mode` | rendu → principal |
| `togglePin()` | `window:toggle-pin` | rendu → principal, retourne l'état |
| `onMediaCommand(callback)` | `media:command` | principal → rendu, retourne une fonction de désabonnement |

## Processus de rendu (`src/`)

### Composants

| Fichier | Rôle |
|---|---|
| `App.jsx` | État global, ajout de pistes, gestion des erreurs, glisser-déposer, touches multimédia |
| `components/TitleBar.jsx` | Barre de titre : épingle, mode mini, réduire, fermer |
| `components/Controls.jsx` | Mode complet : titre, progression, commandes, volume, champ de saisie |
| `components/MiniControls.jsx` | Mode mini : titre, commandes, fine barre de progression |
| `components/PlayButton.jsx` | Bouton lecture/pause animé, partagé par les deux modes |
| `components/Queue.jsx` | Panneau de file : recherche, vidage, lecture, retrait |

### Hooks

- `useYouTubePlayer({ onEnded, onError, initialVolume })` encapsule l'API IFrame de YouTube. Il crée le lecteur,
  suit la position toutes les 500 ms et expose `load`, `cue`, `toggle`, `seek`, `stop`, `setVolume`. Les rappels
  `onEnded` et `onError` sont lus par référence : le lecteur n'est pas recréé quand ils changent.
- `usePersistedState(clé, valeur)` fonctionne comme `useState` avec une copie dans `localStorage`.

### Utilitaires

- `utils/youtube.js` : `extractVideoId`, `extractPlaylistId`, `parseLinks` (analyse d'un texte contenant un ou
  plusieurs liens), `fetchTitle` (oEmbed), `thumbnailUrl`, `formatTime`.
- `utils/playlist.js` : `fetchPlaylistVideoIds(listId)`.
- `utils/youtubeApi.js` : `loadYouTubeApi()` charge le script de l'API une seule fois.

## Flux de données

### Ajout de pistes

```
Ctrl+V / dépôt / champ ──► parseLinks(texte) ──► { videoIds, playlistIds }
                                                   │
                       playlistIds ──► fetchPlaylistVideoIds ──► identifiants
                                                   │
                       tous les identifiants ──► fetchTitle (oEmbed) ──► [{ id, title }]
                                                   │
                                           setQueue(file + nouvelles pistes)
```

`parseLinks` découpe le texte sur les espaces, retours à la ligne et virgules, reconnaît d'abord les playlists
(adresses sans paramètre `v`, identifiant commençant par `PL`, `UU`, `FL` ou `OLAK5uy_`), puis les vidéos, et
supprime les doublons. Si `fetchTitle` échoue, l'identifiant sert de titre.

### Import d'une playlist sans clé d'API

`fetchPlaylistVideoIds` crée un lecteur éphémère hors écran (`youtube-nocookie.com`), lui demande de charger la
playlist (`cuePlaylist`), lit sa liste avec `getPlaylist()` à l'état « chargé », puis détruit le lecteur. Un délai de
10 secondes met fin à l'attente si la playlist est privée, inexistante ou vide.

### Lecture

L'effet de chargement de `App.jsx` charge la piste courante dès que le lecteur est prêt. Au tout premier chargement,
la piste est seulement préparée (`cueVideoById`, pas de lecture automatique) ; ensuite `loadVideoById` la lance.
La fin d'une piste (`ENDED`) appelle « suivant ». Une erreur du lecteur affiche un message puis passe à la suivante.

Codes d'erreur traités : 2, 5, 100, 101, 150, 153.

### Continuité entre modes

Le conteneur du lecteur est un seul élément React dont seules les classes changent d'un mode à l'autre ; il n'est
jamais démonté, et l'iframe n'est donc pas recréée. La vignette du mode mini est ce même lecteur, réduit.

## Persistance

Clés `localStorage`, préfixées par `rondo:` :

| Clé | Valeur |
|---|---|
| `queue` | Tableau de `{ id, title }` |
| `index` | Position de la piste courante |
| `volume` | Entier de 0 à 100 |
| `mode` | `"full"`, `"miniVideo"` ou `"mini"` |
| `miniFormat` | Dernier format mini utilisé : `"miniVideo"` (défaut) ou `"mini"` |

## Développement

Les commandes (`npm run dev`, `npm start`, `npm run build`, `npm run lint`) sont listées dans le
[README](../README.md).

`scripts/dev.js` démarre Vite par son API sur le port 5173 (`strictPort`), attend qu'il écoute, puis lance Electron
avec `VITE_DEV_SERVER_URL`. Cette approche évite les différences de comportement de `&` entre shells sous Windows.
Quand la fenêtre se ferme, le serveur Vite est arrêté. Ne lancez pas `npm run build` pendant que `npm run dev`
tourne.

## Construction de l'installeur

`electron-builder` produit un installeur NSIS pour Windows. Les fichiers embarqués sont `dist/**/*`, `main.js` et
`preload.cjs` (voir `build.files` dans `package.json`). Le dossier de sortie est `release/`, distinct de `dist/`
(sortie de Vite), pour éviter que d'anciens artefacts soient réembarqués. L'installeur n'est pas signé.

## Sécurité

- `contextIsolation: true`, `nodeIntegration: false` ; seules les cinq fonctions de `window.widget` sont exposées.
- Le serveur local n'écoute que sur `localhost` et refuse les chemins qui sortent de `dist/`.
- Aucune donnée n'est envoyée à un serveur propre à l'application ; les seules requêtes réseau sont celles du
  lecteur YouTube, de l'API IFrame, des vignettes (`i.ytimg.com`) et des titres (oEmbed).

## Conventions

- Composants React : un fichier par composant, props destructurées dans la signature.
- Constantes nommées plutôt que valeurs littérales répétées (tailles de fenêtre, délais, codes d'erreur).
- Pas de code mort : toute fonction exportée est utilisée.
