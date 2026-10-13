# Legion onboarding design language, as observed

**Goal.** Capture enough of Legion's visual language that a redesign still feels recognizably Legion. This is not a pixel-perfect clone. The companion file [design-system.html](design-system.html) renders the tokens and components with synthetic content. Open it in a browser.

## How the values were obtained, and how far to trust them

| Label | Meaning | Source |
|---|---|---|
| **Measured** | Read from the live site's computed CSS on 2026-10-10 (`/portal/join/fit` at 1440, 1024, and 375 px) | Exact |
| **Sampled** | Median of a 5×5 pixel patch from the walkthrough video | Calibrated against measured colors: within about 2 RGB units (CTA #3A67E8 sampled vs #3A68E9 true; panel #E0E7EF vs #E2E8F0) |
| **≈ Visual** | Judged by eye from frames, usually snapped to the nearest Tailwind value | Approximate. Verify before relying on it. |

**Stack (measured).** The front end is Tailwind CSS with **shadcn/ui** components. The button classes are shadcn's, and the theme exposes shadcn's CSS variables. The font is **Inter**. The base theme is shadcn's zinc palette with a custom blue primary, and Tailwind palette utilities (gray, blue, slate, green, amber, purple) are used directly for accents. *Inferred*: icons are Lucide, shadcn's default set. That matches every icon seen.

**Practical upshot.** A Next.js, Tailwind, and shadcn prototype can match Legion closely by copying the theme variables below and using the same Tailwind utilities.

## Theme variables (measured, from `:root`)

shadcn stores HSL channels without the `hsl()` wrapper.

| Variable | HSL | Hex | Used for |
|---|---|---|---|
| `--primary` | 224.2 79.9% 57.1% | **#3A68E9** | Primary buttons, selected controls, links |
| `--primary-foreground` | 0 0% 98% | #FAFAFA | Text on primary |
| `--foreground` / `--card-foreground` | 240 10% 3.9% | #09090B | Body text default |
| `--background` / `--card` / `--popover` | 0 0% 100% | #FFFFFF | Surfaces |
| `--muted` / `--secondary` / `--accent` | 240 4.8% 95.9% | #F4F4F5 | Subtle fills, hover |
| `--muted-foreground` | 240 3.8% 45% | #6E6E77 | Secondary text (shadcn components) |
| `--border` / `--input` | 240 5.9% 90% | #E4E4E7 | Hairlines, inputs |
| `--ring` | 240 5.9% 10% | #18181B | Focus ring |
| `--destructive` | 0 84% 48% (written 360) | #E11414 | Errors |
| `--radius` | 0.5rem | 8 px | Base radius |
| `--chart-gad7` | 224.2 79.9% 57.1% | #3A68E9 | GAD-7 charts |
| `--chart-phq9` | 262 83% 58% | #7C3BED | PHQ-9 charts |
| `--chart-green` / `-orange` / `-red` / `-red-light` / `-yellow` | | #16A249 / #F97415 / #E11414 / #EF4343 / #FACC14 | Score bands (*inferred*) |

## Brand mark

| Item | Value | Source |
|---|---|---|
| Logo file | `/legion-logo-dark-text.svg`, rendered 96 × 25.6 px in the header | Measured |
| Wordmark color | #313F4D (dark slate) | Measured from the SVG |
| Mark gradient | #3F71FA → #70D8FA (blue to sky), a heart inside a shield outline | Measured from the SVG |

The HTML reference uses a simple text wordmark and a placeholder heart, not Legion's logo file. Whether the prototype uses the real logo asset is a later decision.

## Color palette in use

**Text (measured unless marked):**

| Role | Tailwind | Hex |
|---|---|---|
| Headings, question titles | gray-900 | #111827 |
| Testimonial quote | gray-800 | #1F2937 |
| Answer-button text | gray-700 | #374151 |
| Subtitles, body copy | gray-600 | #4B5563 |
| Captions, attribution, footers, "Question N of 6" | gray-500 / gray-600 | #6B7280 / #4B5563 |
| Upcoming stepper labels, "% Complete" (≈ visual) | gray-400 | #9CA3AF |

**Surfaces:**

| Surface | Value | Source |
|---|---|---|
| Header | white at 60% plus backdrop blur, 1 px bottom border #E4E4E7 | Measured |
| Onboarding form column | gradient white → blue-50 (#EFF6FF), top to bottom | Measured |
| Testimonial panel | slate-200 #E2E8F0 | Measured |
| Info callout ("Your Safety & Care Come First") | blue-50 #EFF6FF | Measured |
| Portal page background | ≈ slate-50 #F8FAFC (sampled #F7FBFC) | Sampled |
| Empty-state box | #FAFAFA | Sampled |
| "Earliest available" bar | ≈ slate-50 | Sampled |

**State and accent colors:**

| State | Value | Source |
|---|---|---|
| Fit progress, current | blue-500 #3B82F6 | Measured |
| Fit progress, upcoming | gray-200 #E5E7EB | Measured |
| Fit progress, done | ≈ green-500 #22C55E | Visual |
| Selected answer (fit) | green border, green-50 tint, filled green button with ✓ | Visual (mobile) |
| Selected time slot | green-50 #F0FDF4 fill, green border | Sampled |
| Needs card, selected "existing diagnosis" | ≈ #3071EF (between blue-500 and blue-600) | Sampled |
| Needs card, selected "new diagnosis" | ≈ #9B41F0 (between purple-500 and purple-600) | Sampled |
| Needs card, selected "not sure" | ≈ #29A26F (green or emerald, about 600) | Sampled |
| Condition tile, Anxiety selected | amber border, ≈ #F8C540 icon disc (amber-400) | Sampled |
| Condition tile, Depression selected | blue-500 border and icon disc | Visual |
| "Action needed" banner | ≈ amber-50 #FFFBEB background (sampled #FFFCEB), amber-200 border, amber-800 text | Sampled + visual |
| Status chip, Incomplete | ≈ red-100 background / red-700 text | Visual |
| Status chip, In Progress | ≈ amber-100 / amber-800 | Visual |
| Status chip, Complete | ≈ green-100 / green-700 | Visual |
| Portal form progress, current | ≈ amber-500 #F59E0B (sampled #E7A432 on a thin bar) | Sampled |
| Portal form progress, done | ≈ green-500, with a ✓ | Visual |
| "Legion clinician" badge | ≈ green-50 background, green-700 text, check-circle icon | Visual |
| "Intake Appointment" tag | ≈ purple-100 / purple-700 | Visual |
| Expertise-chip dots | ≈ blue, green, amber, pink, red, gray (one hue per condition) | Visual |

**Accessibility notes (computed with WCAG formulas from the values above):**

| Pair | Contrast | Verdict |
|---|---|---|
| White on primary #3A68E9 | 4.84:1 | Passes AA for normal text |
| White on the sampled needs-card blue | 4.44:1 | Fails AA for normal text |
| White on the sampled needs-card green | 3.23:1 | Fails AA for normal text |
| White on the sampled needs-card purple | 4.76:1 | Marginal pass |
| gray-500 on the slate-200 testimonial panel | 3.92:1 | Fails for small text |
| gray-400 stepper labels on white | ≈ 2.5:1 | Fails |

This supports Emeka's comment that the needs step is hard to read. The secondary lines on those cards are also lighter and smaller.

## Typography (measured unless marked)

- **Family.** Inter, falling back to Inter Fallback, ui-sans-serif, system-ui, sans-serif. Weights loaded: 400, 500, 700, and variable 100 to 900. Root size 16 px.

| Role | Size / line height | Weight | Notes |
|---|---|---|---|
| Page title ("Let's Make Sure We're the Right Fit") | 20/28 mobile, 24/32 from `lg` | 600 | gray-900, centered, `mb-3` |
| Page subtitle | 16/24 | 400 | gray-600, centered |
| Question or card title | 16/24, 18/28 from `lg` | 600 | gray-900, `text-balance` |
| Body | 16/24 | 400 | |
| Small text, buttons, labels | 14/20 | 400 to 500 | Buttons are 500 |
| Captions, chips | ≈ 12/16 | 400 to 500 | Visual |
| Testimonial quote | 14 → 16 (`md`) → 18/28 (`lg`) | 400 | gray-800, `leading-relaxed`, centered |
| Section headings in onboarding ("What brings you here?") | ≈ 20 to 24 | 600 | Visual |
| Dashboard greeting ("Hey [name]!") | ≈ 24 | 700 | Visual, followed by gray subtitle |
| Appointment date numeral | ≈ 24 to 28 | 700 | Visual, primary blue on the payment card |

- **Case.** Title Case for page titles ("Your Matched Providers"); sentence case elsewhere. Brand blue is used for a single emphasized word ("Your Matched **Providers**").

## Layout and width (measured)

- **Header.**
  - `sticky top-0 z-50`, 56 px plus a 1 px border (`h-14`), translucent white with backdrop blur
  - Logo at the left
  - Avatar circle at the right: "A" while anonymous, then the patient's initial
- **Onboarding, `lg` and up (≥1024 px).**
  - **Grid.** Two columns (`lg:grid lg:grid-cols-2 lg:gap-8`).
  - **Left column.** The form column, `max-w-3xl`, padding `px-4 py-8 sm:px-6 lg:px-8`, on the white → blue-50 gradient. Content stacks in a centered flex column with `gap-8` (32 px). Cards fill the column: about 392 px wide at a 1024 px viewport, about 600 px at 1440.
  - **Right column.** The testimonial panel, `lg:sticky lg:top-14`, height `calc(100vh − 3.5rem)`, slate-200, `p-6`. The quote is centered vertically, with a footer line: "Join thousands of patients who trust Legion Health."
- **Below `lg`.** A single column. The testimonial panel moves **above** the form as a full-width slate-200 block (about 217 px tall at 375 px).
- **Patient portal.** A single centered column, about 480 to 500 px wide on desktop (≈ `max-w-lg`), with a stack of cards and a two-up row (Next Appointment, Navigation).

## Spacing rhythm

Tailwind's 4 px scale.

| Spacing | Value | Source |
|---|---|---|
| Card and callout padding | 24 px (`p-6`); callouts `p-5 sm:p-6` | Measured |
| Gap between major blocks | 32 px (`gap-8`) | Measured |
| Title → subtitle | 12 px (`mb-3`) | Measured |
| Question title → body | 8 px (`mb-2`) | Measured |
| Footer note | 24 px (`mt-6`) | Measured |
| Form fields, label to input | ≈ 6 to 8 px | Visual |
| Form fields, field to field | ≈ 16 px | Visual |
| Tile grids | ≈ 12 to 16 px gaps; 3 columns on desktop, 2 on mobile | Visual |

## Radii, borders, and shadows

| Element | Value | Source |
|---|---|---|
| Cards and callouts | 8 px (`rounded-lg`) | Measured |
| Buttons and inputs | 6 px (`rounded-md`) | Measured |
| Chips, badges, progress segments, avatar | fully round | Measured (segments) / visual (others) |
| Fit question card | 2 px gray-200 border plus `shadow-sm` (0 1px 2px rgb(0 0 0 / .05)) | Measured |
| Other cards | 1 px #E4E4E7 border, with or without `shadow-sm` | Visual |
| Selected states | Colored 2 px borders, often with a light tint | Visual |
| Modals | White, 8 px, larger shadow, dimmed backdrop | Visual |

## Components

### Buttons

| Kind | Spec | Source |
|---|---|---|
| **Primary** | Primary fill, white text, `rounded-md`, 14 px/500, about 40 px tall, usually full width in forms; disabled = 50% opacity | Height visual |
| **Outline answer button** | `h-11` (44 px), `px-8`, white, 1 px gray-300 border, gray-700 text, hover gray-50, 14 px/500 | Measured |
| **Small outline** | "Need help? Call us" with a phone icon; "Sign in to continue" with a log-in icon | Visual |
| **Text link** | "← Go back" (gray, 14 px); "show more ⌄" / "+ 15 more times" (primary blue, 12 to 14 px) | Visual |
| **Full-width list control** | "Show More Providers (40 remaining)" in primary | Visual |

### Cards and tiles

- **Question card (fit check).** White, 2 px gray-200 border, `rounded-lg`, `p-6`. It holds a title, explanatory text, and two equal outline buttons. Answering slides the card out over about 500 ms.
- **Info callout.** blue-50, `rounded-lg`, `p-6`, a blue info icon, a semibold title, and gray-600 body.
- **Condition tile.**
  - Default: white, bordered, rounded, with an icon in a gray-100 circle above a 14 px/600 label. Three columns on desktop, two on mobile.
  - Selected: a colored border, a filled icon disc, a check badge at the top right, and the tile **expands** to show a one-line message with an emoji.
- **Payer tile.** The payer logo image with the name underneath. Text tiles are used for "Other" and "None." Selected = a darker border.
- **Needs row.**
  - Default: an icon in a circle at the left, a semibold title, and a gray description.
  - Selected: a **saturated fill** (blue, purple, or green), white text, a check at the top right, and an extra explanatory line under a divider.
- **Provider card.**
  - An optional badge sits above the card: "⚡ Soonest available" with a green outline, or "❤️ Highly recommended" with a red outline.
  - The header has a 48 px photo, the name (16 px/600), a "Legion clinician" pill, and "★ 4.9 (52)."
  - Then the credential (gray), and "Areas of Expertise" chips (white, bordered, a colored dot, about 11 px).
  - A blue-50 "About" box with a truncated bio and "show more."
  - A gray "Earliest available ... · N times across M available dates" bar.
  - A slot grid of 2 to 3 dated columns with outline time buttons.
  - Selecting a slot adds a green tint, an "earlier appointment" checkbox, a full-width primary "Book appointment for [day, date] at [time]," and a gray note about the visit length.
- **Appointment summary (payment).** A light blue card. A date block (small "MON," a large numeral, "OCT"), then day, time in primary, and "60 minute session." Below it, the provider initials avatar, name, and credential, plus an "Intake Appointment" tag, with a "Change Appointment" outline button.
- **Checklist card (portal).**
  - Rows contain an icon tile, a title, a status chip, and a one-line description.
  - Each row has a primary "Start" or "Continue" at the right, or "Get help ↗" when complete.
- **Celebration card.**
  - A light card with confetti dots and a check in a circle.
  - A bold playful headline ("Progress! 🎯", "Awesome! Next up?", "You're on a roll! 🚀") and a primary "Let's go →."
- **Toast.** Bottom-right white card with a bold title and a gray body ("Account created," "Success," "Form Completed!").
- **Modal.** A centered white card with a bold title, gray body, and primary "Close" at the bottom right.

### Inputs

- **Text fields.** Label above (about 14 px/500, gray-900). The input is about 40 px tall, with a 1 px #E4E4E7 border, `rounded-md`, and gray-400 placeholders ("John," "Doe," "john.doe@example.com," "(555) 123-4567").
- **Error state.** A red border plus red 12 px helper text under the field. Raw schema messages leak through in at least one form.
- **Date of birth.** A button-like field ("Select your birth date" with a calendar icon). It opens a calendar popover that starts on the current month and year, with month and year dropdowns.
- **Select.** Chevron at the right.
- **Checkbox.** 16 px, primary when checked. Consent labels contain underlined policy links.
- **Likert control.** A bordered segmented group of four equal options; the selected option is a primary fill with white text.
- **Radios and checkbox lists.** Small controls with 14 px labels, used in history forms.
- **Upload.** A dashed or bordered dropzone with an upload icon, a primary "Upload Front of ID" button, "or drag and drop," and a file-type hint.
- **Textarea.** About 3 rows, with a resize handle.

### Progress and navigation

- **Fit check.** "Question N of 6" (14 px gray-600) above six 4 px pill segments (`flex gap-1`, `max-w-md`), plus a "← Go back" link.
- **Onboarding stepper.**
  - "Step N of 6" with "X% Complete" (lighter), and "Need help? Call us" at the right.
  - A continuous blue bar.
  - Six labels under it on desktop only: Conditions, Insurance, How can we help you?, Find Match, Basic Info, Payment Method. The current label is bold.
- **Portal.**
  - Each form group has a segmented bar with labels under each segment. The current segment is amber, done segments are green with a ✓, and the rest gray.
  - "N of M forms completed" appears below the bar.
- **Advancing.** Single-choice questions auto-advance. Multi-select steps use a full-width Continue. The portal uses Previous, Next, and "Skip This Form."
- **Waiting.** A centered spinner with a short line: "Setting up your session...", "Saving your progress...", "Completing form...". The match step uses an animated checklist.

### Iconography

- **Style.** Outline icons at about 1.5 px stroke (Lucide style): info circle, shield, stethoscope, clipboard, phone, log-in arrow, heart, brain, cloud, lightning, question mark, ellipsis, link, upload, calendar, check circle.
- **Containers.** Icons sit in 40 px gray-100 circles on tiles. On selection, the circle fills with the accent color.
- **Emoji in copy.** 🎉 💊 🤝 🎯 🚀 ⚡ ❤️

## Responsive and mobile behavior

Recorded in iOS Safari, and measured at 375 × 812.

- **Testimonial first.** The testimonial block comes first on every onboarding step. On the fit check, the first answer button starts at **820 px**, below an 812 px viewport, before Safari's toolbars are counted.
- **Stepper.** Collapses to "X% Complete · Step N of 6" plus the bar, with no labels.
- **Tiles.** Two-column grids.
- **Provider slots.** One column (one time per date), so each provider card is taller than the phone screen.
- **Buttons.** Full width. The header stays sticky.
- **Not seen on mobile.** The date-of-birth picker was not reached in the mobile recording.

## Tone and copy patterns

- **Warm, upbeat, exclamatory.** "Great news! We've got you covered," "Yay! We're All Done! 🎉," "Perfect match found!," "Hey [name]!," "You're on a roll! 🚀"
- **Reassurance around eligibility.** "If any of the above don't apply to you, it doesn't mean you don't deserve care, it means you deserve the **right** kind of care."
- **Plain policy statements.**
  - "We do not prescribe benzodiazepines over 1mg a day."
  - "We're unable to serve patients who have Medicaid or Medicare, even on a cash-pay basis."
  - The fee schedule in "What to expect."
- **"Why this matters" framing on heavier asks.**
  - "Helps us close the loop and avoid duplicate work."
  - "Quick identity check so pharmacies and payers don't hold things up."
  - "so we can personalize your care from visit #1."
- **Social proof.** Rotating patient quotes, star ratings with counts, "Join thousands of patients who trust Legion Health."
- **Second person, short sentences, light emoji.** Capitalization is sometimes inconsistent ("New Patient Intakes & $150 for Followups").
- **Where the tone over-promises or mismatches.**
  - "We've got you covered" appears before insurance is chosen.
  - "Perfect match" heads a list of 43.
  - Insurance cost estimates are shown to a self-pay patient.

Keep the warmth. Make claims specific and true for the person reading them.

## Keep and avoid, for a redesign that still feels like Legion

This is guidance on look and feel only, not product scope.

| Keep | Avoid |
|---|---|
| Inter, the #3A68E9 primary, the zinc neutrals, 8 px cards and 6 px controls | White small text on mid-saturation fills (the needs-card colors) |
| White cards on soft blue-tinted backgrounds; blue-50 callouts | gray-400 text for anything the patient needs to read |
| Calm left-form, right-reassurance split on desktop | Putting reassurance content above the first action on mobile |
| Warm second-person microcopy and "why this matters" lines | Claims that are not specific to the person's situation |
| Small celebratory moments after real milestones | |
