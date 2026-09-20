# Borrowing from an external design system — what transferred, what didn't

**Source:** `design-system.md` at the repository root — the design system for an
appointment scheduler. Tailwind CSS v4, shadcn/ui (Radix), lucide-react,
framer-motion, Geist Variable. Dark only, by its own statement: `<html class="dark">`,
`color-scheme: dark`, no light theme.

**Status:** analysed, not adopted wholesale. Passes 1 and 2 applied; four items
sequenced for pass 3 and one for pass 4; the palette, the glass panel and the
component library rejected with reasons. Nothing open.

**Why this document exists.** The interesting part of the exercise was not what we
took but what we refused and why. A later reader who finds that document and
wonders why the app doesn't look like it should find the argument here rather
than re-derive it.

---

## The three conflicts, stated up front

1. **It is dark only.** Our app is light. A dark sidebar was already rejected for
   the same reason: two visual languages in one screen.
2. **It has no RTL.** Every example uses physical properties — `left-0`, `pl-4`,
   `object-left`, `after:left-1/2`. Our absolute rule is logical properties only.
3. **It is a different stack.** React, shadcn/ui, Radix, framer-motion against our
   Angular 22 and Tailwind. The components do not transfer.

None of these is fatal to borrowing *values*. All three are fatal to borrowing
*components*.

---

## Portable

| Item | Verdict | Reasoning |
|---|---|---|
| Spacing values | **No-op** | Both projects use Tailwind's 4px scale. Nothing to adopt. |
| Motion durations and easing | **Adopted** | Their easing is `cubic-bezier(0.16, 1, 0.3, 1)`. So is ours, already, at `styles.css` `--animate-toast-in`. Arrived at independently. |
| Where to spend the loud colour | **Adopted as a shape, not as values** | Theirs is "white is loudest; the accent is never a button fill". Ours is the inverse — `bg-primary-600` *is* our button fill, 31 sites. What transferred is the **closed enumerated list**. |
| The reveal rule for secondary actions | **Adopted, with two changes** | See below. |
| "Separation is a border, never a shadow" | **Half** | "No shadow" is portable; we are at three violations. "Translucent" is not — see rejected. |
| The row hierarchy rule | **Sequenced** | "Within any row the title is largest and lightest-coloured; never let three lines read at one weight." Expressible as values; real improvement. |
| Radius derived from one variable | **Half, sequenced** | Tailwind v4 already derives `rounded-*` from `--radius-*`; their ×0.6/×0.8/×1.4 table reimplements a default. What is worth taking is the **assignment table** — which radius on which surface. We use four steps with no stated rule. |
| `.tnum` (tabular numerals) | **Sequenced** | Three `tabular-nums` sites exist; every time, date and count wants it. |
| Fixed height ladder | **Sequenced last** | See cost. |
| The type scale | **Rejected** | Their 15/13/11/10px ladder is Geist and Latin. Ours is Cairo at `line-height: 1.7` because `012 AS-06` requires leading for diacritics. The values do not survive the font change. |
| `.label-caps` (10px, uppercase, 0.12em) | **Rejected — and it exposed a defect of ours** | See the typography section. |

## Not portable

| Item | Reasoning |
|---|---|
| The palette | Twelve OKLCH tokens authored for a near-black ground. Our violet-and-stone is verified across both interfaces and both languages. Not repainting a working app. |
| The frosted glass panel | Not because it is dark. It needs the photograph from their §7 underneath it. Our auth card sits on flat `surface-50`, where `backdrop-blur` renders nothing. It would not transfer even if we went dark. |
| Translucent borders | `rgba(255,255,255,0.08)` over near-black is how you get a hairline on dark. Translucent black over warm stone is muddier than the solid `border-surface-200` we already use, and it compounds unpredictably over our tinted rows (`.msg--internal`, `bg-primary-50`). |
| The component library | shadcn/Radix has no Angular equivalent worth chasing. **But** what shadcn actually buys is Radix's *behaviour* contracts — focus trap, roving tabindex, dismiss layers. See the note on `@angular/cdk` below. |
| The photograph-plus-overlay auth treatment | Two gradient layers whose direction flips with the layout. We have no auth photograph, and the directional layer would need mirroring we would rather not own. |

### Two corrections to the "physical direction" objection

The blanket objection — "anything with a physical direction in it" — is too broad
in one place and too narrow in another.

**Too broad.** Their busy-day dot uses `after:left-1/2 after:-translate-x-1/2`.
That is a *centring* idiom, not a direction: it renders identically in both
directions because there is nothing to mirror. A rule that flags it as a
violation is a rule that will be ignored. The test now recorded in the skill is
whether swapping start for end changes the rendering. If it doesn't, it isn't a
direction.

**Too narrow.** Their 2px accent rule on the appointment row would indeed sit on
the wrong side in Arabic — but the fix is one word, `left-0` to `start-0`, and we
already run that exact pattern correctly at `layouts/sidebar/sidebar.html:220`
(`before:absolute before:inset-y-1 before:start-[1.4rem]`). Their sticky
translucent nav is likewise already ours at `layouts/main-layout/main-layout.html:27`.
We had independently arrived at two of their components, in logical properties.

---

## The reveal rule — adopted, with two changes

Their rule, which is the single best thing in the document:

```
opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100
```

Hidden at rest on pointer devices only; always visible on touch; always visible on
keyboard focus. Never hide an action behind hover alone.

**Change one: `md:` becomes `pointer-fine:`.** `md:` asks how wide the screen is,
which is not the same question as whether there is a mouse. Tailwind 4.3 — this
project's version — has the right variant. Verified by compiling it through this
repo's own Tailwind:

```
@media (pointer: fine) {
  .pointer-fine\:opacity-0 { … }
  .pointer-fine\:group-focus-within\:opacity-100:is(:where(.group):focus-within *) { … }
  .pointer-fine\:group-hover\:opacity-100:is(:where(.group):hover *) { … }
}
```

**Change two: it is written as a prohibition, because we have nothing to fix.**
`grep -rn "group-hover\|opacity-0\|group-focus" frontend/src` returns nothing.
Every row-level secondary action in the app is a permanently visible text button.
So the rule costs no remediation; it exists to stop the pattern arriving badly.

One caveat recorded with it: **never for a destructive action.** `opacity-0` is not
`hidden` — the control stays focusable and clickable while invisible.

---

## Motion: the Angular answer

framer-motion has no Angular twin, and the honest answer is that we need neither
of their two presets.

| Their preset | What it becomes here |
|---|---|
| `pageTransition` — 180ms, 4px in / 2px out | **Nothing.** 180ms of content shift on every navigation, in a CRM where an agent moves between list and detail all day, is a cost with no benefit. If it is ever wanted it is one `@keyframes` plus a `@theme --animate-*`, exactly like the toast — never a library. |
| `listItem` — 160ms, 8ms stagger capped at 6 | **Nothing, and adopting it would be a regression.** Our lists re-render on the polling interval (`AD-19`). A stagger replays on every tick. |

Angular 22 does ship `animate.enter` / `animate.leave` in `@angular/core` — CSS
class driven, no dependency — so the capability exists if a genuine enter/exit
ever appears. It is not needed today.

Their reduced-motion handling is a global `!important` override producing 0.01ms
animations. Ours is the `motion-safe:` variant, which gives *no* transition at
all. Ours is better and was kept.

**Two dependencies removed as a result.** `@angular/animations` and `@angular/cdk`
were both declared in `frontend/package.json` and imported nowhere in `src`,
`angular.json` or any tsconfig. Both are gone; `npm run build` is clean.

`@angular/cdk` is the one to reconsider deliberately rather than by accident: when
a dialog, menu or overlay is eventually needed, the answer is to reinstate it, not
to hand-roll a focus trap. That is the real transferable lesson from shadcn — not
components, but that behaviour contracts are worth a dependency and decoration is
not.

---

## Typography: the item that exposed a defect of ours

`.label-caps` — 10px, uppercase, `letter-spacing: 0.12em` — was rejected, and
tracing why turned up twenty-one sites already in our tree applying a Latin
typographic treatment to strings that render in Arabic: ten on
`uppercase tracking-wide/wider`, eleven on `tracking-tight`, two of the latter
rendering user-authored values (`customer-detail.html:24`,
`ticket-detail.html:19`) that are Arabic whenever the customer is.

**What the measurement found, including where it corrected us.** Before and
after, in Arabic, at 1440×900, against seeded data, the inked width of each
string was measured with a `Range`. All twenty-one moved by less than 1.7px, and
275 untouched strings on the same pages moved by less than 0.5px. More
precisely: six of the ten `uppercase` labels moved by **exactly zero**, and the
observed delta equals (number of spaces × tracking) in all ten cases, to within
0.01px.

That disproves something this analysis originally asserted. The first draft
claimed the tracking was breaking Arabic's cursive joins, and cited `012 AS-06`
("correct joining"). It was not: **Blink applies letter-spacing to Arabic only
where the run already breaks, never between joined letters.** The joins were
never disturbed and AS-06 was never violated. The citation was withdrawn on the
evidence.

**The reason the change was made anyway** is the one that survives measurement.
`uppercase` cannot act on a unicameral script, and the tracking acted on almost
nothing — so the device that tells an English reader "this is a quiet section
heading, not a content heading" is, in Arabic, absent. One class list, two
languages, one of them served. That is constitution I's typography clause —
not its formal Test, which concerns string values and is satisfied here. A class
list that only makes sense for Latin script asserts that the string is Latin,
and it is wrong about half this product's content, silently.

Full workings, including the table that separates the per-space model from the
per-character one: `docs/decisions-pending.md` §29.

---

## Cost, and the order of work

Twenty routed screens across twenty-four templates (twenty feature, four layout).
`docs/state.md` and `docs/handover.md` both still say sixteen.

| # | Change | Edit surface | Cost | Pass |
|---|---|---|---|---|
| 1 | Reveal rule as a prohibition plus one sanctioned class string | skill only | zero | **1 — done** |
| 2 | Motion values table; drop two dependencies | skill, `package.json` | zero | **1 — done** |
| 5 | Loud colour as a closed list of four | skill only; tree already complies | zero | **1 — done** |
| — | Skill restructured to values-in-tables, causes-as-footnotes | skill only | zero | **1 — done** |
| — | Latin case and tracking on Arabic text | 21 sites, 16 files | small | **2 — done** |
| 3 | Radius assignment table | skill; 22 call sites if enforced | small | 3 |
| 4 | "1px border, no shadow" | 3 sites, 2 files, plus a judgement call on the auth cards | small | 3 |
| 6 | Row hierarchy as values | list and table templates | medium | 3 |
| 7 | `.tnum` on times, dates, counts | ~20–30 sites | medium | 3 |
| 8 | Fixed height ladder (44 / 36 / 32) | 63 inputs + 84 buttons across 24 templates | **large** | 4 |

**On #8.** The arithmetic says the visual change is almost nil: an unsized input at
`px-3 py-2` inherits body `0.9375rem × 1.7`, giving roughly 43.5px — their 44px,
by accident. So we would pay 147 call-site edits to pin something already nearly
pinned. `shared/components/tag/tag.ts` documents this exact failure in its header
("px-2, px-2.5, with and without font-medium") and the fix that worked was
extracting a component. `frontend/src/app/shared/ui/` is currently an empty
`.gitkeep`. Fill it with a button and an input first, and the ladder becomes a
two-file change instead of a 147-site one.

---

## On "every rule is a value, never an adjective"

Adopted, with one deliberate exception.

That document can be all values because it describes a finished surface with no
history. Our skill is a rulebook that encodes four specific failures: `px-3`
beating `pe-11`, `routerLinkActive` losing to `@theme` declaration order,
`lg:w-auto` tying with `lg:w-60`, and the sidebar stretching past the fold. Those
paragraphs are not descriptions — they are the causal half of a rule, and deleting
them is how the fault returns.

The form the skill now takes: **values in tables, causes as one-line "Why"
footnotes keyed to the rule above them.** Nothing was deleted; the loose prose
became tables and the remaining prose is all causal.

---

## Open

Nothing. The letter-spacing scope question is closed: all twenty-one sites
were changed together, on the argument that splitting them would let a reader of
the smaller commit assume the rest were fine.

Next is pass 3 — items 3, 4, 6 and 7 in the table above.
