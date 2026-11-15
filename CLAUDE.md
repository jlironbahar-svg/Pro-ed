# ProEd project rules

This is the ProEd project. The full spec is in SPEC.md. Progress is in PROGRESS.md.
When the user types 'continue' (or starts a new session): read PROGRESS.md, find the exact phase and step marked DOING NOW, and resume that step. Never restart from phase 1, never redo finished steps, never ask questions. Keep building until all phases are done.
Update PROGRESS.md after every finished step.

## Working rules

- Fully autonomous: never ask questions, never wait for plan approval, never stop to check with the user between phases. Make sensible decisions and write them down in PROGRESS.md (Decisions section).
- Save PROGRESS.md after EVERY finished step (not only at the end of a phase), so if usage runs out mid-phase nothing is lost and work resumes exactly there.
- Before starting each phase, print one line: "Starting phase X: <name>". After finishing it, print one line: "Phase X done. Next: phase Y." Then keep going without waiting.
- Keep chat messages very short. Spend tokens on code, not explanations.
- Write each file completely once. To change something, edit the file; don't rewrite whole files.
- Never guess library APIs. After installing a library, read its README and type definitions in node_modules before using it. This is critical for pawnote.
- Keep dependencies few and well known. Build exactly the spec, no extra features.
- At the end of each phase, run the TypeScript check + build (and the tests when they exist), fix all errors, then move straight on to the next phase.
- If something can't be done here (for example building a signed APK without Android Studio), prepare everything, write the exact steps in the README, and move on.
- Commit and push to the working branch after each phase (git push -u origin <current branch>).

## Design rules (short)

- No emojis anywhere. Lucide icons only, sparingly.
- One brand color (deep blue), neutral grays, Inter font, 8px grid, subtle borders, no heavy shadows, no gradients, no glassmorphism.
- French by default, English available. Light and dark mode.
- Design tokens and shared components live in /shared and are used by both apps.

## Layout

- /shared: design system (tailwind preset, CSS, React UI components), shared types, logo.
- /proed-app: student app (PWA + Capacitor Android).
- /proed-admin: admin app (Capacitor Android).
- /server: Fastify backend (relay, access API, admin API, PWA hosting).
- Commands: `npm run typecheck`, `npm run build`, `npm test` at the root.
