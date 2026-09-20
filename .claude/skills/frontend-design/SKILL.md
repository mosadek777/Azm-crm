---
name: frontend-design
description: Rules and tokens for building or changing any screen in this Angular frontend — layout, styling, RTL/bilingual behaviour, forms, tables, motion, and how to verify a change is actually right. Read this BEFORE writing or editing anything under frontend/src, including a one-line Tailwind class change. Triggers on: screen, page, component, layout, sidebar, form, table, button, styling, Tailwind, CSS, RTL, Arabic, mirroring, dir, responsive, mobile, 390px, viewport, colours, tokens, accessibility, focus, keyboard, motion, hover, reveal, transition, animation.
---

# Frontend design — azm-crm

Derived from this codebase. Where a rule has a file, the file is the authority.

**Every rule here is a value or a class string.** The prose that survives is a
*cause* — each "Why" is a fault this project actually shipped. The values stop
you inventing; the causes stop the fault coming back. Delete neither.

## Tokens — never hardcode a colour, size or font

All tokens live in one place: `frontend/src/styles.css`, in `@theme`. They
generate real Tailwind utilities, so write `bg-surface-50`, `text-primary-700`,
`border-surface-200` — not `bg-[#fafaf9]`, not a loose custom property.

| Token group | Values | Use |
|---|---|---|
| `--color-primary-*` | violet, 50–950 | the loud colour — see the budget below |
| `--color-surface-*` | warm stone, 0–950 | every ground, border and text colour |
| `--font-sans` | `'Cairo', 'Segoe UI Arabic', Tahoma, 'Segoe UI', system-ui, sans-serif` | one stack, both languages |
| `--text-xs … --text-3xl` | `0.75 / 0.875 / 0.9375 / 1.125 / 1.375 / 1.75 / 2.25rem` | never invent a size between two steps |
| body | `--text-base`, `line-height: 1.7`, `surface-800` on `surface-50` | 1.7 is a requirement, not a taste |

**Why warm stone.** A cold blue-grey puts the page back in "blue on white"
through the background, even with a non-blue primary.

**Why the fallback stack is load-bearing.** It must keep an Arabic-glyph face
(`Segoe UI Arabic`, `Tahoma`) *ahead of* `Segoe UI`. A Latin-only face has no
Arabic glyphs, so the browser falls back per character and joining breaks —
the exact defect `012 AS-06` names. A font only one language gets is the
asymmetry constitution I exists to prevent.

**Why `line-height: 1.7`.** `012 AS-06`: Arabic needs more leading than Latin at
the same size — diacritics sit above the line and descenders below it.

Reusable primitives (`.page`, `table.grid`, `.field`, `.chip`, `.card`,
`.thread`, `.msg`) are in `@layer base` in the same file. In `base`, Tailwind's
utilities still win — which is why they are there and not at top level.

## The loud colour — a closed list of four

`bg-primary-600` is the loudest thing on any screen. It is permitted in exactly
four places, and the tree currently holds to this:

| # | Place | Class | Sites |
|---|---|---|---|
| 1 | The primary action of a view — button or link | `bg-primary-600 hover:bg-primary-700 text-white` | 29 |
| 2 | The brand mark | `bg-primary-600 text-white` | `layouts/sidebar/sidebar.html:29` |
| 3 | The collapsed-sidebar badge dot | `bg-primary-600 ring-2 ring-surface-0` | `layouts/sidebar/sidebar.html:160` |
| 4 | The shell's top rule | `border-t-4 border-t-primary-600` | the three layouts |

Anything else wanting emphasis takes `primary-50`/`primary-100` as a tint, or
`primary-700` as text. **A fifth place is a decision to record in
`docs/decisions-pending.md`, not a class to add.**

**Why a budget at all.** One emphasis colour used in four places reads as
emphasis. Used in twenty it reads as decoration, and the primary action on a
screen stops being findable. The list above is the enforcement:

```
grep -rnE "(bg|border-t)-primary-600" frontend/src   # 34 hits: 29 + 1 + 1 + 3
```

Every hit must be one of the four. `text-primary-600` and `accent-primary-600`
are not fills and are not budgeted.

## Motion — four values, and no animation library

| Value | Number |
|---|---|
| Shared easing | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Toast entry | 220ms — `--animate-toast-in` in `styles.css` |
| Colour and opacity transitions | Tailwind default, 150ms |
| Everything else | none |

- **Every transition goes through `motion-safe:`**, which compiles to
  `@media (prefers-reduced-motion: no-preference)`. A reader who asked for
  reduced motion gets *no* transition, not a shortened one. Never write a
  global `!important` reduced-motion override — that produces 0.01ms
  animations rather than none.
- **No animation library.** `@angular/animations` and `@angular/cdk` were both
  declared dependencies imported nowhere in `src`; both are removed. If an
  enter/exit genuinely needs one, Angular 22 ships `animate.enter` /
  `animate.leave` in core — CSS classes, no dependency.
- **No per-item stagger.** Lists re-render on the polling interval (`AD-19`),
  so a staggered enter replays on every tick. That is worse than no motion.
- **Physical transforms are the one place a keyframe may be physical.**
  `translateX` has no logical equivalent. Flip a custom property, don't
  duplicate the keyframe — `--toast-enter-x` in `styles.css`.

## Controls — the reveal rule

**Never hide an action behind hover alone.** The app currently has zero
hover-hidden actions, and that is the preferred state.

Where hidden-at-rest is genuinely wanted, it is permitted only with all of:

```
opacity-100 motion-safe:transition-opacity
pointer-fine:opacity-0
pointer-fine:group-hover:opacity-100
pointer-fine:group-focus-within:opacity-100
```

plus `group` on the containing row. Verified against this project's Tailwind
4.3: `pointer-fine:` emits `@media (pointer: fine)`, and both group variants
resolve inside it.

- **Visible at rest on every touch device.** `pointer-fine:` is the guard, not
  a width breakpoint — `md:` asks how wide the screen is, which is not the same
  question as whether there is a mouse.
- **Visible on keyboard focus**, via `group-focus-within`.
- **Never for a destructive action.** `opacity-0` is not `hidden`: the control
  stays focusable and clickable while invisible.

Other control rules:

| Rule | Class or element |
|---|---|
| Focus is always visible | `focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500` |
| Interactive controls that aren't links | `<button type="button">` |
| Icon-only buttons | `aria-label`, plus `aria-expanded` / `aria-controls` where they apply |
| Never signal by colour alone | every state carries a word or an icon |

**Why focus-visible and not outline removal.** Removing the outline without
adding the ring is a keyboard user losing their place on the page.

**Why never colour alone.** `Active`/`Inactive`, the `.chip--internal` label and
the `.refusal` border-plus-text all say it in words. Colour is reinforcement,
never the message.

## RTL — absolutes, not preferences

Direction is derived from the language and written onto `<html>` by
`core/i18n/language.service.ts`. Nothing else sets direction.

### 1. Logical properties only

| Never | Always |
|---|---|
| `ml-` `mr-` | `ms-` `me-` |
| `pl-` `pr-` | `ps-` `pe-` |
| `left-` `right-` | `start-` `end-` |
| `text-left` `text-right` | `text-start` `text-end` |
| `border-l` `border-r` | `border-s` `border-e` |

**Why.** Physical properties don't mirror, and the bug only shows in the
language you weren't looking at.

**The one exception besides keyframes:** a physical property used for *centring*
(`left-1/2` with `-translate-x-1/2`) renders identically in both directions,
because there is nothing to mirror. The test is whether swapping start for end
changes the rendering. If it doesn't, it isn't a direction.

### 2. `px-*` beats `pe-*`

| Never | Always |
|---|---|
| `px-3 pe-11` | `ps-3 pe-11` |

**Why.** In Tailwind v4 `px-3` emits the `padding-inline` SHORTHAND, which
overrides the `padding-inline-end` longhand from `pe-11`. This silently ate the
reserved space in `password-field.html` — see the comment there.

### 3. Direction-neutral values are pinned LTR unconditionally

Ticket references, phone numbers, email addresses, identifiers, numerals, times,
durations, and **passwords**. Use the `.ltr` class or `dir="ltr"`.

**Why passwords.** Decision 38: an Arabic password ending in `_` rendered with
the underscore at the visual start. `.ltr` is deliberately outside any layer —
it is a correctness rule, not a style, and must not lose to a utility.

### 4. Static and bound classes have equal specificity

| Never | Always |
|---|---|
| `class="lg:w-auto"` beside `[class]="'lg:w-60'"` | one `computed()` returning the whole string |

**Why.** They tie, and stylesheet order decides — which is how the sidebar came
out 155px wide. See `layouts/sidebar/sidebar.ts`.

**`routerLinkActive` is the same trap wearing a different hat**, and it cost a
third occurrence in that one component. It *adds* classes to an element that
already carries the resting ones, so `text-primary-700` (active) and
`text-surface-600` (resting) end up together at equal specificity — and because
`primary` is declared before `surface` in the `@theme` block, the **resting**
colour wins and the active one is silently ignored. Nothing errors; the state
simply never appears. Decide in the component from a `url` signal, emit one
class per decision, and set `aria-current` from the same answer, so what is
drawn and what is announced cannot disagree.

**Prefer absent over overridden.** An inactive `before:` bar present at
`opacity-0` needs the cascade to choose between it and `opacity-100`; omitting
the `before:` utilities entirely when inactive leaves nothing to arbitrate.

### 5. `max-lg:` removes a utility above the breakpoint

**Why.** Rather than letting a later rule override it. That is what fixed the
sidebar sitting outside the viewport at desktop RTL, where `lg:translate-x-0`
lost to `rtl:translate-x-full`.

## Typography that only works in one script

**Never** put any of these on an element whose text can render in Arabic —
which is every translated string and every user-authored value:

| Never | Why it is a one-language device |
|---|---|
| `uppercase` `lowercase` `capitalize` | Arabic is unicameral. There is no capital form to map to, so the utility does nothing. |
| `tracking-tight` `tracking-wide` `tracking-wider` … | Blink applies `letter-spacing` to Arabic only at the spaces, never between joined letters. Six of ten measured labels moved by **exactly 0px**. |
| `font-variant: small-caps` | Same reason as `uppercase`, with a second face involved. |

Carry the hierarchy with **size, weight and colour**, which work identically in
both scripts.

**Why, and it is not legibility.** Twenty-one sites carried these until the
rendering was measured in Arabic: `التنقل` was 27.67px wide with
`uppercase tracking-wider` and 27.67px without it. Nothing was broken and
nothing was illegible — the treatment simply was not there. Meanwhile in
English the same class list is doing real work. One string, one class, two
languages, and the signal reaches one of them. That is constitution I's
typography clause. A class list that only makes sense for Latin script is an
assertion that the string is Latin, and it is wrong about half this product's
content, silently. Full measurements: `docs/decisions-pending.md` §29.

**This is the shape of the trap, not just this instance.** Before reaching for
a typographic utility, ask what it does to Arabic. If the answer is "nothing",
it is decoration for one language and it does not belong in a shared class.

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

| Shell | For | Navigation |
|---|---|---|
| `layouts/main-layout` | staff | sidebar (`layouts/sidebar`, collapsible, overlay drawer below `lg`, state in `sidebar-state.ts`) plus a slim top bar holding identity, language and account only |
| `layouts/portal-layout` | customer | top bar, no sidebar — a customer has two screens |
| `layouts/auth-layout` | signed out | none |

`min-w-0` on the content column and on `<main>` is load-bearing.

**Why.** A flex child defaults to `min-width: auto`, so a wide table pushes the
whole page wider than the window instead of scrolling in its own frame. That is
how every staff screen came to scroll sideways at 390px.

## Verification — the part that keeps being skipped

| Assert | Where |
|---|---|
| `document.documentElement.scrollWidth === clientWidth` | every route touched, at 390px and desktop, in both languages |
| the document is taller than the viewport | before any screenshot is allowed to prove anything |
| a screenshot captured over CDP exists | every claim that a screen is correct |

**Verify against a screen with enough content to SCROLL, never an empty one.**
This is the rule that keeps being relearned. An empty list, a ticket with two
messages, a fresh install — all look fine, and none exercises the layout. Two
faults shipped past clean screenshots for exactly this reason: the staff pages
scrolling sideways at 390px, and the sidebar stretching to the document height
so its user block sat hundreds of pixels below the fold on a long ticket. Seed
the thread, fill the table, then look.

**Verify at a real viewport with a screenshot, not a number.** A passing
measurement told us the sidebar was present; the screenshot showed it off the
side of the screen.

**Chrome that should stay put is pinned to the VIEWPORT, not the page.** A
`position: static` flex child stretches to its container's content height.
Navigation, toolbars and anything with a pinned foot want
`sticky top-0 h-screen self-start` plus an internal `overflow-y-auto` on the
part that may overflow.

**Reserve space for controls inside inputs.** A reveal button or icon sitting
over text is not a layout you can see at a glance — pad the input to clear it,
on the logical side, and re-check in RTL where the control moves.

`npm test` in `backend/` **drops the database**; re-seed with
`npm run seed:demo` (the API must be running) before any browser verification.

## Never

- A delete button for an entity the API refuses to delete. Offer what the API
  offers; say on the page why deletion isn't there.
- Client-side filtering standing in for scope. Lists arrive already filtered by
  the server; a component must not be able to widen a result.
- A client-side capability signal used as authorisation. `GET /auth/me`'s `show`
  is a rendering hint — see the comment in
  `backend/src/modules/auth/auth.service.js`.
