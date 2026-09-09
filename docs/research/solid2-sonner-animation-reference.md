# Solid 2 Sonner animation reference

Checked 2026-09-09 against the owning repository. This is source research for the approved Zaidan Toast presentation boundary; it does not implement or validate a Kobalte adapter.

## Solid 2 status

The upstream `solid-2` branch exists at commit [`957eda6191a69a32b4f285128c0b8dfb3eff9ef7`](https://github.com/wobsoriano/solid-sonner/commit/957eda6191a69a32b4f285128c0b8dfb3eff9ef7), dated August 17, 2026. Its package declares both `solid-js` and `@solidjs/web` peers as `^2.0.0-rc.0`. This verifies a Solid 2 implementation reference, not an npm release. The inspected main commit still declares `solid-js: ^1.6.0`. Sources: [Solid 2 manifest](https://github.com/wobsoriano/solid-sonner/blob/957eda6191a69a32b4f285128c0b8dfb3eff9ef7/package.json), [main manifest](https://github.com/wobsoriano/solid-sonner/blob/4082d5e52074a846d5e139fcbeccb75addb6871b/package.json).

## Exact animation reference

- **Entrance, stacking, expansion, exit:** `src/styles.css` uses transform/opacity/height transitions (normally 400ms), measured expanded offsets, collapsed rear-toast scaling, and distinct front/rear dismissal states. [Base transitions](https://github.com/wobsoriano/solid-sonner/blob/957eda6191a69a32b4f285128c0b8dfb3eff9ef7/src/styles.css#L94-L143), [stack and removal styles](https://github.com/wobsoriano/solid-sonner/blob/957eda6191a69a32b4f285128c0b8dfb3eff9ef7/src/styles.css#L320-L377).
- **Swipe dismissal:** direct drag transforms disable transitions, followed by directional 200ms ease-out keyframes. The component supplies displacement, direction, threshold/velocity decisions, and resistance for disallowed directions. [Swipe CSS](https://github.com/wobsoriano/solid-sonner/blob/957eda6191a69a32b4f285128c0b8dfb3eff9ef7/src/styles.css#L379-L458), [pointer handlers](https://github.com/wobsoriano/solid-sonner/blob/957eda6191a69a32b4f285128c0b8dfb3eff9ef7/src/index.tsx#L418-L522).
- **State driving the visuals:** `src/index.tsx` measures heights, marks mounting through `onSettled`, freezes the dismissal offset, schedules delayed removal, and emits CSS variables/data attributes. These dependencies mean copying CSS alone will not reproduce the behavior. [Measurement/removal](https://github.com/wobsoriano/solid-sonner/blob/957eda6191a69a32b4f285128c0b8dfb3eff9ef7/src/index.tsx#L199-L310), [render attributes](https://github.com/wobsoriano/solid-sonner/blob/957eda6191a69a32b4f285128c0b8dfb3eff9ef7/src/index.tsx#L383-L416).
- **Loading and reduced motion:** source includes loader/icon fades, spinner keyframes, and a reduced-motion override. [Loading/motion CSS](https://github.com/wobsoriano/solid-sonner/blob/957eda6191a69a32b4f285128c0b8dfb3eff9ef7/src/styles.css#L613-L745).

## Planning consequence

Keep the approved Kobalte lifecycle boundary and use this pinned source as the presentation reference. Subsequent implementation must match the existing Sonner visual experience across insertion, stacked/expanded layouts, dismissal, swiping, and promise-state changes, including reduced motion. The mapping of measured presentation state onto Kobalte presence/lifecycle remains implementation work; this source review does not prove parity or runtime compatibility.
