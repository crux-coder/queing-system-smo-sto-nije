<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:daisyui-agent-rules -->

# Use daisyUI for components and styling

Use [daisyUI](https://daisyui.com) as the component library and primary styling system for this project.

- Read the relevant current daisyUI documentation before building or changing UI.
- Prefer daisyUI component classes, patterns, and theme tokens over bespoke components or one-off styling systems.
- Use Tailwind CSS utilities for responsive layout, spacing, and small composition adjustments where needed.
- Do not introduce another component library or recreate a primitive already provided by daisyUI unless a documented product requirement cannot be met with daisyUI.
- Keep the interface mobile-first, modern, light-themed, accessible, and consistent with the Samo Što Nije PRD.

<!-- END:daisyui-agent-rules -->
