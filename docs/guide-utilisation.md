# Guide d'utilisation

Ce guide décrit toutes les fonctions de Rondo du point de vue de l'utilisateur.

## Sommaire

1. [Premiers pas](#premiers-pas)
2. [La fenêtre](#la-fenêtre)
3. [Ajouter de la musique](#ajouter-de-la-musique)
4. [La file d'attente](#la-file-dattente)
5. [Lecture et contrôles](#lecture-et-contrôles)
6. [Mode mini](#mode-mini)
7. [Réglages](#réglages)
8. [Zone de notification](#zone-de-notification)
9. [Raccourcis clavier](#raccourcis-clavier)
10. [Données et confidentialité](#données-et-confidentialité)
11. [Questions fréquentes](#questions-fréquentes)

## Premiers pas

1. Lancez l'application. Une fenêtre sombre de 360 × 470 pixels apparaît.
2. Copiez un lien YouTube dans votre navigateur.
3. Revenez sur la fenêtre et faites `Ctrl+V`. La piste est ajoutée et prête à être lue.
4. Cliquez sur le bouton de lecture.

## La fenêtre

La fenêtre n'a pas de bordure système. La barre du haut contient, de gauche à droite :

| Élément | Rôle |
|---|---|
| Nom de l'application | Zone de déplacement : faites glisser pour déplacer la fenêtre |
| Épingle | Active ou désactive le maintien au premier plan (activé au démarrage) |
| Engrenage | Ouvre les [réglages](#réglages) |
| Flèches vers l'intérieur | Passe en [mode mini](#mode-mini) |
| Trait | Réduit la fenêtre dans la barre des tâches |
| Croix | Masque la fenêtre dans la [zone de notification](#zone-de-notification) ; la musique continue |

En mode complet, la fenêtre se redimensionne en tirant sur ses bords. Taille minimale : 300 × 420 pixels.
La position et la taille sont retrouvées au prochain démarrage. Près d'un bord de l'écran (moins de 16 pixels), la
fenêtre s'aimante au bord quand on la lâche ; l'aimantation se désactive dans les réglages.

## Ajouter de la musique

Le plus simple : **coller avec `Ctrl+V` n'importe où dans la fenêtre**. Aucune validation n'est nécessaire.

### Formats acceptés

| Format | Exemple |
|---|---|
| Lien de vidéo | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| Lien court | `https://youtu.be/dQw4w9WgXcQ` |
| YouTube Music | `https://music.youtube.com/watch?v=dQw4w9WgXcQ` |
| Shorts, intégrations, directs | `youtube.com/shorts/…`, `youtube.com/embed/…`, `youtube.com/live/…` |
| Identifiant seul (11 caractères) | `dQw4w9WgXcQ` |
| Playlist publique | `https://www.youtube.com/playlist?list=PL…` |

### Plusieurs liens à la fois

Collez plusieurs liens séparés par des retours à la ligne, des espaces ou des virgules. Tous sont ajoutés, les
doublons au sein du collage sont ignorés et le texte qui n'est pas un lien est ignoré.

### Importer une playlist

Collez l'adresse d'une playlist (`youtube.com/playlist?list=…`). Toutes ses vidéos sont ajoutées à la suite de la
file. Un message sous les contrôles indique le nombre de pistes ajoutées.

Ne sont pas importables : les playlists privées, les mix automatiques (identifiant commençant par `RD`) et les
adresses de vidéo accompagnées d'une playlist (`watch?v=…&list=…`), qui sont traitées comme une seule vidéo.

### Glisser-déposer

Faites glisser un lien depuis la barre d'adresse ou une page web vers la fenêtre. Un cadre en pointillés indique la
zone de dépôt.

### Champ de saisie

Le champ en bas de la fenêtre accepte les mêmes contenus. Validez avec `Entrée` ou avec le bouton `+`.

## La file d'attente

Le bouton en bas à gauche, avec le nombre de pistes, ouvre la file en plein format.

- **Rechercher** : tapez dans le champ du haut. La recherche porte sur les titres et ignore les accents et les
  majuscules. La croix efface la recherche.
- **Lire une piste** : cliquez dessus. La file se ferme et la lecture démarre.
- **Retirer une piste** : survolez-la et cliquez sur la croix à droite.
- **Vider la file** : bouton en forme de corbeille. La lecture s'arrête et la file est effacée.
- **Fermer** : croix en haut à droite.

La piste en cours est surlignée et centrée à l'ouverture de la file. Une piste que YouTube refuse de lire en
intégré est barrée, avec un triangle d'avertissement ; elle est sautée ensuite. Cliquez dessus pour réessayer.

La file est enregistrée automatiquement et retrouvée au prochain démarrage, avec la piste en cours.

## Lecture et contrôles

| Contrôle | Action |
|---|---|
| Lecture / Pause | Démarre ou suspend la lecture |
| Précédent / Suivant | Change de piste (désactivés aux extrémités de la file) |
| Barre de progression | Cliquer ou faire glisser pour se déplacer dans la piste |
| Volume | Curseur à droite, mémorisé d'une session à l'autre |

Sous le titre, trois petits boutons :

| Bouton | Action |
|---|---|
| Lune | Minuteur de sommeil : un clic passe à 15, 30 puis 60 minutes, puis le désactive. Le temps restant s'affiche ; à zéro, la lecture se met en pause. Fonctionne aussi en mode mini |
| Aléatoire | Joue les pistes dans le désordre, sans répéter une piste avant d'avoir joué toutes les autres |
| Répétition | Désactivée, toute la file, ou la piste en cours. Sans répétition, la lecture s'arrête à la fin de la file |

À la fin d'une piste, la suivante démarre automatiquement. Si une vidéo n'autorise pas la lecture intégrée, un
message s'affiche quelques secondes, la piste est marquée dans la file et l'application passe à la suivante.

## Mode mini

Le mode mini existe en deux formats, et Rondo retient le dernier utilisé :

- **Vidéo** (360 × 290 pixels) : la vidéo reste visible, avec les commandes dessous.
- **Compact** (340 × 84 pixels) : une simple barre avec une vignette.

Le petit bouton à gauche de « Agrandir » passe de l'un à l'autre. La carte reste collée au bord où elle se trouve.

Le format compact contient :

- vignette de la vidéo à gauche ;
- titre, boutons « Agrandir » et « Fermer » en haut à droite ;
- précédent, lecture/pause et suivant ;
- fine barre de progression en bas.

Toute la carte sert de zone de déplacement. Le bouton « Agrandir » revient au mode complet. La lecture n'est pas
interrompue lors du changement de mode, et le mode choisi est retrouvé au prochain démarrage.

## Réglages

L'engrenage de la barre du haut ouvre les réglages :

- **Couleur** : six couleurs d'accent (violet par défaut).
- **Mode fantôme** : rend la fenêtre semi-transparente et traversable par la souris, pour la poser sur un document
  sans la gêner. L'opacité se règle de 20 à 90 %. Comme on ne peut plus cliquer dessus, on en sort avec le
  raccourci (`Ctrl+Alt+G` par défaut) ou le menu de l'icône de notification.
- **Aimantation** aux bords de l'écran.
- **Raccourcis** : voir ci-dessous.

## Zone de notification

Rondo place une icône dans la zone de notification de Windows. Un clic la masque ou l'affiche ; le clic droit ouvre
un menu : lecture/pause, suivant, précédent, afficher/masquer, mode fantôme et **Quitter**. Pour fermer vraiment
l'application, utilisez ce menu : la croix de la fenêtre ne fait que la masquer.

## Raccourcis clavier

Ces raccourcis sont globaux : ils fonctionnent même si Rondo n'a pas le focus.

| Action | Par défaut |
|---|---|
| Lecture / Pause | `Ctrl+Alt+Espace` |
| Piste suivante | `Ctrl+Alt+→` |
| Piste précédente | `Ctrl+Alt+←` |
| Volume + / − (pas de 5) | `Ctrl+Alt+↑` / `Ctrl+Alt+↓` |
| Mode fantôme | `Ctrl+Alt+G` |

Pour en changer un, ouvrez les réglages, cliquez sur le raccourci puis tapez la nouvelle combinaison (au moins
`Ctrl`, `Alt` ou `Windows` avec une touche ; `Échap` annule). Un raccourci déjà utilisé par une autre action ou une
autre application est refusé ; un raccourci affiché en rouge n'a pas pu être réservé au démarrage.

Les touches multimédia du clavier fonctionnent aussi :

| Touche | Action |
|---|---|
| Lecture/Pause | Démarre ou suspend la lecture |
| Piste suivante | Passe à la piste suivante |
| Piste précédente | Revient à la piste précédente |

Si une autre application a déjà réservé ces touches, elles peuvent ne pas atteindre Rondo.

## Données et confidentialité

Rondo n'a pas de compte, pas de serveur et ne collecte aucune donnée. Ce qui est conservé sur votre
appareil :

| Donnée | Contenu |
|---|---|
| File d'attente | Identifiant et titre de chaque piste |
| Piste en cours | Position dans la file |
| Volume | Valeur de 0 à 100 |
| Mode, couleur, aléatoire, répétition | Vos choix d'affichage et de lecture |
| Pistes refusées par YouTube | Marque sur la piste concernée |
| Position et taille de la fenêtre, opacité du mode fantôme, aimantation, raccourcis | Fichier `settings.json` |

La file et les choix d'affichage sont stockés dans le stockage local de l'application (`localStorage`), les autres
réglages dans `settings.json`, tous deux dans le dossier de données de l'application. Pour tout effacer, videz la
file et supprimez ce dossier (`%APPDATA%\Rondo`). Après un arrêt brutal du processus (« Terminer la tâche »), les
modifications des 30 dernières secondes peuvent être perdues ; une fermeture par le menu Quitter les conserve.

La lecture passe par le lecteur intégré de YouTube. Les conditions d'utilisation de YouTube s'appliquent à ce
lecteur, y compris les publicités qu'il peut afficher.

## Questions fréquentes

**Une vidéo est sautée automatiquement.**
Son auteur interdit la lecture hors de YouTube. Il n'existe pas de contournement.

**L'import d'une playlist échoue.**
Vérifiez qu'elle est publique ou non répertoriée, qu'elle n'est pas un mix (`list=RD…`) et qu'elle n'est pas vide.
L'import s'interrompt après 10 secondes sans réponse.

**Rien ne se passe quand je colle.**
Le texte collé ne contient aucun lien YouTube reconnu. Un message d'erreur apparaît s'il vient du champ de saisie.

**La fenêtre a disparu.**
Elle est peut-être masquée dans la zone de notification (clic sur l'icône pour l'afficher) ou réduite dans la barre
des tâches. Relancer l'application la ramène aussi au premier plan, car une seule instance peut tourner à la fois.

**Je ne peux plus cliquer sur la fenêtre.**
Le mode fantôme est actif. Appuyez sur `Ctrl+Alt+G`, ou décochez « Mode fantôme » dans le menu de l'icône de
notification.

**Windows affiche un avertissement à l'installation.**
L'installeur n'est pas signé numériquement : Windows SmartScreen peut le signaler comme provenant d'un éditeur
inconnu. Choisissez « Informations complémentaires » puis « Exécuter quand même », ou lancez l'application depuis
les sources (voir le [README](../README.md)).

**Les touches multimédia ne réagissent pas.**
Une autre application (lecteur, navigateur) les a peut-être déjà captées. Fermez-la ou changez son réglage.
