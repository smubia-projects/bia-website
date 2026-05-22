---
name: add-project
description: Add one or more projects to the SMUBIA project showcase. Supports interactive Q&A, freeform paste import, and bulk CSV/JSON import.
---

Add one or more projects to the project showcase at `app/Projects/`. Detect which mode applies from the user's input and proceed accordingly.

## Data locations
- Types: `app/Projects/data/types.ts`
- One file per project: `app/Projects/data/[kebab-slug].ts`
- Barrel (update this after every new project): `app/Projects/data/index.ts`
- Template to copy: `app/Projects/data/NEW_PROJECT_TEMPLATE.ts`

## Project interface
```ts
interface TeamMember { name: string; role: string; avatar: string; }

interface Project {
  slug: string;           // kebab-case → /Projects/[slug]
  title: string;
  description: string;   // 1–2 sentence card blurb
  badge: "DAP" | "AI Lodge";
  category: string;
  coverImage: string;    // Vercel Blob URL
  images: string[];      // carousel (1+)
  overview: string;
  rationale: string;
  lessons: { satisfaction: string; takeaway: string; };
  team: TeamMember[];
  programme: string;
  status: "Completed" | "Ongoing";
  techStack: string[];
  demoUrl?: string;
  sourceUrl?: string;
}
```

## After writing each project file, update `index.ts`
```ts
import { myProject } from "./my-project"; // add import
export const projectsData = [...existing, myProject]; // add to array
```

---

## Mode A — Interactive Q&A
**Trigger:** User says "add a project" with no data.

Ask for fields in groups, waiting for each response:
1. Title, slug, badge (DAP / AI Lodge), category
2. Short card description, overview, rationale
3. Lessons: satisfaction rating + commentary, key takeaway
4. Team members: "Name — Role" (avatar URLs optional)
5. Cover image URL, carousel image URLs, demo URL, source URL (all optional)
6. Tech stack (comma-separated), status (Completed / Ongoing)

Then generate the file and update `index.ts`.

---

## Mode B — Single paste import
**Trigger:** User pastes freeform text (description, README, brief).

1. Extract and infer all `Project` fields from the text.
2. Show a summary table of inferred values.
3. Ask for confirmation or corrections before writing.
4. Write the file and update `index.ts`.

Fields that cannot be inferred (image URLs, avatars) → set to `""` and list what's missing.

---

## Mode C — Bulk import
**Trigger:** User pastes a JSON array, CSV, or structured table of multiple projects.

1. Map columns/keys to `Project` fields flexibly (e.g. "name" → `title`, "program" → `badge`).
2. Flag missing required fields per project.
3. Show summary: "Found N projects — X complete, Y missing fields: [list]."
4. On confirmation: write one `.ts` file per project, update `index.ts` with all imports in one edit.

Slug generation: derive from title if not provided — lowercase, spaces → hyphens, strip special chars.

---

## Rules
- Never guess image URLs — leave as `""` and tell the user what to upload to Vercel Blob.
- Always confirm before writing files in Mode B or C.
- Do not modify `types.ts` or `NEW_PROJECT_TEMPLATE.ts`.
