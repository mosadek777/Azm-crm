---
name: frontend-design
description: Rules and tokens for building or changing any screen in this Angular frontend — layout, styling, RTL/bilingual behaviour, forms, tables, motion, and how to verify a change is actually right. Read this BEFORE writing or editing anything under frontend/src, including a one-line Tailwind class change. Triggers on: screen, page, component, layout, sidebar, form, table, button, styling, Tailwind, CSS, RTL, Arabic, mirroring, dir, responsive, mobile, 390px, viewport, colours, tokens, accessibility, focus, keyboard, motion.
---

# Frontend design — azm-crm

Derived from this codebase. Where a rule has a file, the file is the authority.

## Tokens — never hardcode a colour, size or font

All tokens live in one place: `frontend/src/styles.css`, in `@theme`. They
generate real Tailwind utilities, so use `bg-surface-50`, `text-primary-700`,
`border-surface-200` — not `bg-[#fafaf9]`, not a loose custom property.

- `--color-primary-*` — violet, 50–950.
- `--color-surface-*` — warm stone, 0–950. Warm deliberately: a cold blue-grey
  puts the page back in "blue on white" through the background even with a
  non-blue primary.
- `--font-sans` — Cairo, self-hosted from `public/fonts/`, one stack for both
  languages. The fallbacks are load-bearing and must keep an Arabic-glyph face
  (`Segoe UI Arabic`, `Tahoma`) ahead of `Segoe UI`. A font only one language
  gets is the asymmetry constitution I exists to prevent.
- `--text-xs … --text-3xl` — the type scale. Don't invent sizes between them.

Reusable primitives (`.page`, `table.grid`, `.field`, `.chip`, `.card`,
`.thread`, `.msg`) are in `@layer base` in the same file. In `base`, Tailwind's
utilities still win — which is why they are there and not at top level.

## RTL — absolutes, not preferences

The direction is derived from the language and written onto `<html>` by
`core/i18n/language.service.ts`. Nothing else sets direction.

1. **Logical properties only.** `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`,
   `text-start`/`text-end`, `border-s`/`border-e`. Never `ml-`, `pr-`, `left-`,
   `text-left`. Physical properties don't mirror, and the bug only shows in the
   language you weren't looking at.
2. **`px-*` beats `pe-*`.** In Tailwind v4 `px-3` emits the `padding-inline`
   SHORTHAND, which overrides the `padding-inline-end` longhand from `pe-11`.
   Write `ps-3 pe-11`, never `px-3 pe-11`. This silently ate the reserved space
   in `password-field.html` — see the comment there.
3. **Direction-neutral values are pinned LTR unconditionally** — ticket
   references, phone numbers, email addresses, identifiers, numerals, times,
   durations, and **passwords** (decision 38: an Arabic password ending in `_`
   rendered with the underscore at the visual start). Use the `.ltr` class or
   `dir="ltr"` on the element. `.ltr` is deliberately outside any layer: it is
   a correctness rule, not a style, and must not lose to a utility.
4. **Static and bound classes have equal specificity.** `lg:w-auto` in `class`
   and `lg:w-60` in `[class]` tie, and stylesheet order decides — which is how
   the sidebar came out 155px wide. Compute the whole class string in one
   `computed()` instead of splitting it across two attributes. See
   `layouts/sidebar/sidebar.ts`.
5. **`max-lg:` removes a utility above the breakpoint**, rather than letting a
   later rule override it. That is what fixed the sidebar sitting outside the
   viewport at desktop RTL, where `lg:translate-x-0` lost to
   `rtl:translate-x-full`.
6. **Physical transforms are the one exception.** `translateX` has no logical
   equivalent, so a keyframe needs an explicit `[dir="rtl"]` rule. Flip a custom
   property, don't duplicate the keyframe — `--toast-enter-x` in `styles.css`.

## Bilingual rules

- Admin-authored labels carry `{ar, en}`, **both required**. The server refuses
  a single-language save; render the refusal as the server sent it rather than
  pre-empting it, so the rule is enforced in one place.
- **No fallback, ever.** A missing key renders a visible marker
  (`⟦missing ar: key⟧`), never the other language, never empty. That is
  `LanguageService.translate` and it is meant to be noticed.
- User-authored values (a person's name, a message body) are single-language,
  never translated, direction detected per value by the browser.
- Arabic and English are peers. There is no default language on principle — with
  no stored preference, the browser's preference decides.

## The shells

Three, and they are not interchangeable:

- `layouts/main-layout` — **staff**: sidebar (`layouts/sidebar`, collapsible,
  overlay drawer below `lg`, state in `sidebar-state.ts`) plus a slim top bar
  holding identity, language and account only.
- `layouts/portal-layout` — **customer**: top bar, no sidebar. A customer has
  two screens.
- `layouts/auth-layout` — signed out.

`min-w-0` on the content column and on `<main>` is load-bearing: a flex child
defaults to `min-width: auto`, so a wide table pushes the whole page wider than
the window instead of scrolling in its own frame. That is how every staff screen
came to scroll sideways at 390px.

## Verification — the part that keeps being skipped

- **Verify at a real viewport with a screenshot, not a number.** A passing
  measurement told us the sidebar was present; the screenshot showed it off the
  side of the screen. Drive the browser over CDP and capture the PNG.
- **Check 390px as well as desktop, in both languages.** Assert
  `document.documentElement.scrollWidth === clientWidth` on every route you
  touched. Sideways scroll is the single most common regression here.
- **Reserve space for controls inside inputs.** A reveal button or icon sitting
  over text is not a layout you can see at a glance — pad the input to clear it,
  on the logical side, and re-check in RTL where the control moves.
- **Never signal by colour alone.** Every state carries a word or an icon:
  `Active`/`Inactive`, the `.chip--internal` label, the `.refusal` border plus
  text. Colour is reinforcement, never the message.
- **Respect `prefers-reduced-motion`.** Use Tailwind's `motion-safe:` variant,
  which compiles to `(prefers-reduced-motion: no-preference)`, so a reader who
  asked for reduced motion gets *no* transition rather than a shorter one.
- Focus is always visible: `focus:outline-none focus-visible:ring-2
  focus-visible:ring-primary-500`. Removing the outline without the ring is a
  keyboard user losing their place.
- Interactive controls that aren't links are `<button type="button">`.
  `aria-expanded`, `aria-controls` and an `aria-label` on icon-only buttons.

## Never

- A delete button for an entity the API refuses to delete. Offer what the API
  offers; say on the page why deletion isn't there.
- Client-side filtering standing in for scope. Lists arrive already filtered by
  the server; a component must not be able to widen a result.
- A client-side capability signal used as authorisation. `GET /auth/me`'s `show`
  is a rendering hint — see the comment in `backend/src/modules/auth/auth.service.js`.
