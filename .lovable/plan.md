
Objectif validé: garder la barre de navigation visible, afficher la barre de message juste au-dessus, et ne jamais laisser le clavier iOS cacher la saisie.

Plan d’implémentation

1) Corriger la base du layout de conversation (cause principale du chevauchement)
- Fichier: `src/pages/MessagesPage.tsx` (dans `ConversationView`)
- Ajouter une mesure dynamique de la hauteur réelle de `.bottom-nav` (même approche que ReservationPage: `querySelector + ResizeObserver + resize listener`).
- Réserver cet espace dans la hauteur de la vue conversation pour que le compositeur ne puisse plus passer “sous” la nav.

2) Recalculer proprement la hauteur disponible avec clavier + nav
- Conserver la logique hybride clavier (Visual Viewport + natif), mais appliquer la formule sur “espace utile”:
  - `availableHeight = viewportVisibleHeight - bottomNavHeight`
  - si clavier non-redimensionné: `availableHeight = baseline - keyboardHeight - bottomNavHeight`
  - si redimensionnement système actif: `availableHeight = viewportHeight - bottomNavHeight`
- Ajouter un clamp min pour éviter les hauteurs trop petites.

3) Repositionner la zone de saisie pour qu’elle reste collée au-dessus de la nav
- La barre de saisie restera en bas du conteneur conversation (non cachée), car le conteneur lui-même n’ira plus sous la nav.
- Ajuster le `paddingBottom` actuel de l’input container (qui additionne `safe-area`) pour éviter les doubles offsets inutiles quand la nav est déjà prise en compte.

4) Stabiliser le comportement au focus iOS
- Conserver auto-scroll vers le dernier message au focus/ouverture clavier.
- Déclencher ce scroll après recalcul de hauteur (petit délai) pour éviter les sauts visuels.

5) Vérification fonctionnelle ciblée iOS
- Cas 1: conversation ouverte, clavier fermé → input visible juste au-dessus de la nav.
- Cas 2: focus input, clavier ouvert → texte saisi visible en continu.
- Cas 3: avec pièce jointe/réponse rapide/reply bar affichées.
- Cas 4: retour arrière et réouverture conversation (pas de régression).

Vue technique (résultat attendu)
```text
┌─────────────────────────── écran ───────────────────────────┐
│ Header conversation                                        │
│ Messages (scroll)                                          │
│ Composer (reply/attachment/input/send)                     │  ← toujours visible
│ BottomNavigation (fixe)                                    │  ← toujours visible
└─────────────────────────────────────────────────────────────┘
```

Détails techniques (section dédiée)
- Fichier principal: `src/pages/MessagesPage.tsx`
  - Ajouter `bottomNavHeight` state + effet de mesure dynamique.
  - Injecter `bottomNavHeight` dans les calculs `conversationHeight`.
  - Ajuster style du bloc input pour supprimer le conflit `safe-area + nav`.
- Aucun changement backend.
- Aucun changement de navigation globale (la barre du bas reste active sur `/messages`).
