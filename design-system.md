# Design System — Appointment Scheduler

Everything here is a value, not a description. Copy the numbers and the class strings and the
result is reproducible in another project.

**Stack**: Tailwind CSS v4, shadcn/ui (Radix), lucide-react, framer-motion, Geist Variable.
**Mode**: dark only. `<html class="dark">`, `color-scheme: dark`. There is no light theme.

---

## 1. Colour

Tokens are authored in OKLCH in `src/index.css` under `.dark`. Hex and RGB below are the exact
sRGB conversions — use whichever your project prefers.

| Token | OKLCH (source) | Hex | RGB | Used for |
|---|---|---|---|---|
| `--background` | `oklch(0.125 0.004 264)` | `#060608` | `6, 6, 8` | Page ground |
| `--foreground` | `oklch(0.97 0.002 264)` | `#f4f5f6` | `244, 245, 246` | Primary text |
| `--card` | `oklch(0.165 0.004 264)` | `#0d0e10` | `13, 14, 16` | Panels, cards |
| `--popover` | `oklch(0.185 0.005 264)` | `#121315` | `18, 19, 21` | Dialogs, popovers |
| `--primary` | `oklch(0.985 0 0)` | `#fafafa` | `250, 250, 250` | Primary button fill |
| `--primary-foreground` | `oklch(0.145 0.004 264)` | `#090a0c` | `9, 10, 12` | Text on primary |
| `--secondary` | `oklch(0.225 0.005 264)` | `#1b1c1e` | `27, 28, 30` | Filled calendar cells |
| `--muted` | `oklch(0.215 0.005 264)` | `#18191c` | `24, 25, 28` | Muted fills |
| `--muted-foreground` | `oklch(0.62 0.01 264)` | `#83868c` | `131, 134, 140` | Metadata, secondary text |
| `--accent` / `--ring` | `oklch(0.62 0.19 264)` | `#497ef7` | `73, 126, 247` | The single accent |
| `--accent-foreground` | `oklch(0.98 0.002 264)` | `#f8f8fa` | `248, 248, 250` | Text on accent |
| `--destructive` | `oklch(0.66 0.2 22)` | `#f45058` | `244, 80, 88` | Delete, errors |

### Alpha values — separation is done with translucent white, never with a solid grey

| Token | Value | Used for |
|---|---|---|
| `--border` | `oklch(1 0 0 / 8%)` → `rgba(255,255,255,0.08)` | Every default hairline |
| `--border-strong` | `oklch(1 0 0 / 14%)` → `rgba(255,255,255,0.14)` | Border on hover |
| `--input` | `oklch(1 0 0 / 10%)` → `rgba(255,255,255,0.10)` | Input borders |
| `--surface-hover` | `oklch(1 0 0 / 5%)` → `rgba(255,255,255,0.05)` | Row and button hover fill |

### Rules of use

- **White (`#fafafa`) is the loudest thing on screen.** Spend it only on primary buttons and the
  selected calendar day. Never on body text blocks.
- **The accent `#497ef7` appears in five places only**: the busy-day dot, focus rings, the
  "today" numeral, the "Today" chip, and the hover rule on an appointment row. It is never a
  button fill.
- **Depth is three steps**: `#060608` ground → `#0d0e10` card → `#121315` dialog. Separation is a
  1px 8%-white border, not a shadow.

---

## 2. Typography

**Family**: `Geist Variable`, fallback `sans-serif`. Loaded via `@fontsource-variable/geist`.
`--font-sans: 'Geist Variable', sans-serif`. Body gets `antialiased`.

| Role | Size | Tailwind | Weight | Tracking |
|---|---|---|---|---|
| Auth headline | 30 / 36 / 48px | `text-3xl sm:text-4xl lg:text-5xl` | 600 | `tracking-tight`, `leading-[1.1]` |
| Page / auth title | 24px | `text-2xl` | 600 | `tracking-tight` |
| Panel title | 20px | `text-xl` | 600 | `tracking-tight` |
| Card heading | 16px | `text-base` | 600 | `tracking-tight` |
| **Appointment title** | **15px** | `text-[0.9375rem]` | 500 | `leading-snug` |
| Body / labels | 14px | `text-sm` | 400 | — |
| **Notes** | **13px** | `text-[0.8125rem]` | 400 | `leading-relaxed`, `line-clamp-2` |
| Metadata, field labels | 12px | `text-xs` | 400 | — |
| **"Today" chip** | **11px** | `text-[0.6875rem]` | 500 | — |
| **Small caps label** | **10px** | `.label-caps` | 500 | `uppercase`, `0.12em` |

Two utilities, defined in `@layer base`:

```css
.tnum       { font-variant-numeric: tabular-nums; }          /* all times and dates */
.label-caps { font-size: 0.625rem; font-weight: 500;
              text-transform: uppercase; letter-spacing: 0.12em; }
```

**Hierarchy rule**: within any row, the title is the largest and lightest-coloured element; time
and notes are both smaller *and* `--muted-foreground`. Never let three lines read at one weight.

---

## 3. Spacing and radius

**Spacing** is Tailwind's 4px scale. Used: `0.5`=2px, `1`=4, `1.5`=6, `2`=8, `2.5`=10, `3`=12,
`3.5`=14, `4`=16, `5`=20, `6`=24, `7`=28, `8`=32, `10`=40, `12`=48, `14`=56, `20`=80.

**Radius** derives from one value:

```css
--radius: 0.625rem; /* 10px */
```

| Step | Formula | Value |
|---|---|---|
| `rounded-sm` | `--radius × 0.6` | 6px |
| `rounded-md` | `--radius × 0.8` | 8px |
| `rounded-lg` | `--radius` | 10px |
| `rounded-xl` | `--radius × 1.4` | 14px |
| `rounded-2xl` | `--radius × 1.8` | 18px |

Applied: **cards/panels** `rounded-xl` (14px) · **rows, inputs, buttons** `rounded-lg` (10px) ·
**glass panel** `rounded-2xl` (18px) · **icon badges** `rounded-lg` · **chips/dots** `rounded-full`.

**Fixed heights**: nav bar `h-14` (56px) · inputs and primary buttons `h-11` (44px) · small
buttons `h-8`/`size-8` (32px) · icon badges `size-9` (36px) · date block `size-12` (48px) ·
calendar cell `--cell-size: 40px`, `sm:44px`.

---

## 4. Surfaces

### Card / panel

```html
class="border-border bg-card rounded-xl border"
```
→ `background #0d0e10`, `border 1px rgba(255,255,255,0.08)`, `radius 14px`. **No shadow.**
Padding `p-4 sm:p-5`. A header inside gets `border-b` and the body a matching pad.

### Frosted glass panel — auth form only

```html
class="rounded-2xl border border-white/15 bg-white/[0.07] p-6 shadow-2xl
       shadow-black/40 backdrop-blur-xl sm:p-8"
```

| Property | Exact value |
|---|---|
| Background | `rgba(255, 255, 255, 0.07)` |
| Border | `1px solid rgba(255, 255, 255, 0.15)` |
| Backdrop filter | `blur(24px)` |
| Shadow | `0 25px 50px -12px rgba(0, 0, 0, 0.4)` |
| Radius | 18px |
| Padding | 24px, 32px from `sm` |

The border must be lighter than the fill — that edge is what makes it read as glass rather than
as a hole cut in the image.

### Appointment row

```html
class="group border-border bg-background/40 hover:border-border-strong
       hover:bg-surface-hover relative rounded-lg border p-3.5 pl-4 transition-colors"
```
Plus a 2px accent rule, hidden until hover:

```html
class="bg-accent/70 absolute inset-y-3 left-0 w-0.5 rounded-full opacity-0
       transition-opacity group-hover:opacity-100"
```

---

## 5. Controls

### Input / textarea

| State | Values |
|---|---|
| Rest | `h-11` (44px), `bg-background/60`, `border rgba(255,255,255,0.10)`, `rounded-lg` |
| Rest *on glass* | `bg-white/5`, `border-white/15`, `text-white`, `placeholder:text-white/35` |
| Focus | `ring 3px` of `--ring` `#497ef7` at 50%, border lifts to `rgba(255,255,255,0.25)` |
| Invalid | `border --destructive #f45058`, ring in destructive |
| Disabled | `opacity 50%`, `cursor-not-allowed` |

Time and date inputs additionally carry `.tnum`. Textareas use `resize-none`.

### Buttons

| Variant | Fill | Text | Hover | Active |
|---|---|---|---|---|
| **Primary** | `#fafafa` | `#090a0c` | `bg-white/90` | `scale(0.98–0.99)` |
| **Outline** | transparent, `border --border` | `--foreground` | `bg-surface-hover`, border → 14% | `scale(0.98)` |
| **Ghost** | none | `--muted-foreground` | `bg-surface-hover`, text → `--foreground` | — |
| **Destructive** | `#f45058` | `--foreground` | `bg-destructive/90` | — |
| **Icon** | none, `size-8` | `--muted-foreground` | delete → `text-destructive bg-destructive/10` | — |

All buttons: `rounded-lg`, `text-sm`, `font-medium`, `transition-transform`, and a
`focus-visible` ring of `--ring` at 50%, 3px. Minimum touch target 44px on primary actions.

### Icon buttons in rows — the reveal rule

```html
class="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100
       md:group-focus-within:opacity-100"
```

Hidden at rest **only on pointer devices**. Always visible on touch, always visible on keyboard
focus. Never hide an action behind hover alone.

---

## 6. Calendar day cells

| State | Treatment |
|---|---|
| Default | transparent, `--foreground` |
| **Busy** | `bg-secondary/70` `#1b1c1e` at 70%, `font-medium`, plus a **4px accent dot** centred 4px below the numeral |
| **Selected** | white chip `#fafafa`, text `#090a0c` |
| **Today** | numeral in `--accent` `#497ef7`, `font-semibold` |
| **Outside month** | `text-muted-foreground/35` |
| Weekday header | `.label-caps` in `--muted-foreground` |

The busy dot, exactly:

```html
after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2
after:rounded-full after:bg-accent after:content-['']
```

---

## 7. Photograph + overlay — auth screens

A full-bleed image with **two** overlay layers. One wash for legibility, one directional layer
that darkens whichever side the form occupies.

```html
<!-- ground colour: a missing image degrades to the gradient, not to white -->
<div class="bg-background relative min-h-svh w-full overflow-hidden">

  <img src="/auth-bg.jpg" alt="" aria-hidden
       class="absolute inset-0 size-full object-cover object-center" />

  <!-- 1. base wash, top to bottom -->
  <div class="from-background/75 via-background/55 to-background/85
              absolute inset-0 bg-gradient-to-b"></div>

  <!-- 2. directional: downward on small, rightward from lg -->
  <div class="to-background/80 absolute inset-0 bg-gradient-to-b from-transparent
              via-transparent lg:bg-gradient-to-r lg:via-transparent"></div>

  <div class="relative mx-auto flex min-h-svh max-w-6xl flex-col items-center
              justify-center gap-12 px-5 py-14 lg:flex-row lg:justify-between
              lg:gap-20 lg:px-8">…</div>
</div>
```

Overlay opacities: **75% → 55% → 85%** top-to-bottom, then **transparent → 80%** toward the form.
Text on the photo carries `drop-shadow-sm` (headline: `drop-shadow-md`) and uses `text-white` /
`text-white/70`, not the theme tokens.

**The direction flips with the layout.** Below `lg` the form is at the bottom, so the second
layer darkens downward; from `lg` it sits right, so it darkens rightward.

---

## 8. Motion

framer-motion, in **two places only**: route transitions and list enter/exit. Both presets live
in `src/lib/motion.ts`.

```ts
export const pageTransition = {
  initial:    { opacity: 0, y: 4 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -2 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
}

export const listItem = (index: number) => ({
  initial:    { opacity: 0, y: 6 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -4 },
  transition: { duration: 0.16, delay: Math.min(index, 6) * 0.008, ease: 'easeOut' },
})
```

| Value | Number |
|---|---|
| Page duration | 180ms |
| Page easing | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Page travel | 4px in, 2px out |
| List duration | 160ms |
| List travel | 6px in, 4px out |
| List stagger | 8ms per item, capped at 6 items (48ms) |
| CSS transitions | Tailwind default 150ms |

Everything is switched off for anyone who asks:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Layout and breakpoints

| Breakpoint | Width | Behaviour |
|---|---|---|
| base | 375px+ | One column. Gutters `px-4` (auth `px-5`). Icon actions always visible |
| `sm` | 640px | Panel padding → 32px, calendar cell → 44px, time fields side by side |
| `lg` | 1024px | Calendar and day panel side by side; month card `sticky top-20`; auth becomes two columns |

Page container `max-w-6xl` (1152px), centred, `px-4 py-6 sm:py-8`. Nav is `sticky top-0 z-30`
with `bg-background/80 backdrop-blur-md`.

---

## 10. Reproducing this elsewhere

1. Set `<html class="dark">` and `color-scheme: dark`.
2. Paste the twelve colour tokens and the four alpha tokens.
3. Set `--radius: 0.625rem` and load Geist Variable.
4. Add `.tnum` and `.label-caps`.
5. Cards: `bg-card` + 8%-white border + `rounded-xl`, **no shadow**.
6. Glass: `bg-white/[0.07]` + `border-white/15` + `backdrop-blur-xl` + `rounded-2xl`.
7. Spend white on primary actions only; spend `#497ef7` on dots, rings and today only.
8. Copy the two motion presets and the reduced-motion block. Add no third animation.
