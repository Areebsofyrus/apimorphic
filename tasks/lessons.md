# Lessons Learned & Technical Patterns

## 1. Controlled Inputs and Database State Syncs
* **Problem:** Falsy fallback checks (`||`) during workspace configuration syncing prevented fields from being cleared (as `""` was falsy, triggering the default fallback values).
* **Rule:** Always use explicit nullish checks (`!== undefined && !== null`) when determining fallback values for controlled input bindings, especially when empty strings (`""`) are valid inputs.

## 2. Preventing React Cursor Jumping
* **Problem:** In controlled inputs where edits trigger debounced database writes and parent state refreshes, the returned prop updates cause React to programmatically re-render the input. This resets the browser's cursor selection to the end of the line.
* **Rule:** Do not blindly copy parent prop updates back to local input states on every render. Restrict configuration state synchronization effects to execute only when changing workspace contexts (e.g. checking if a workspace/spec ID has changed using a `useRef`).

## 3. Caret Visibility with Transparent Inputs
* **Problem:** Hiding input text characters with `color: transparent` to overlay syntax-highlighted backdrops underneath also renders the browser's text selection cursor (caret) transparent.
* **Rule:** When rendering custom overlay text backdrops on top of transparent inputs, always explicitly define a valid CSS `caret-color` (either via a Tailwind caret class like `caret-indigo-600` or inline `caretColor` styles) to keep the blinking caret visible.

## 4. Perfect Overlay Text Alignment
* **Problem:** Backdrop overlay layers must match the target `<Input>` or `<Textarea>` perfectly down to the single pixel. Adding horizontal paddings, borders, or font-weights (like `font-bold` or `font-medium`) to highlight spans in the backdrop container alters character widths. Over long inputs (such as JWT tokens), this accumulated width offset drifts the visible characters away from the input cursor caret.
* **Rule:** 
  - Ensure the backdrop overlay container and target input share the exact same `font-weight`, `font-family` (e.g., inheriting them), and `font-size`.
  - Highlighted spans in the backdrop must have `padding: 0` and `border: none` (or outline) so they do not add horizontal layout width.
  - Set `shrink-0` (`flex-shrink: 0`) on all children elements inside flex backdrop overlays to prevent character compression on long scrollable strings.

## 5. Handling Password Masks in Custom Highlight Inputs
* **Problem:** When an input switches to `type="password"`, standard characters are replaced by native password dots (which have completely different widths than standard characters). If the backdrop continues to render plaintext letters underneath, the caret (positioned on the password dots) drifts, and the plaintext password is exposed.
* **Rule:** If a custom syntax-highlighting input can have `type="password"`, dynamically check the type:
  - If `password`, hide the backdrop overlay completely and set the input style `color` to `inherit` so standard native password dots and cursor display correctly.
  - If `text`, restore input transparency and show the highlighted backdrop.
