/**
 * One-off, idempotent seed — adds the three AI Lodge "Tech Comms" projects
 * (CaloTracko, Storie, Enhance AI) to Upstash Redis with their long-form
 * `article` bodies extracted from _intake/project-showcase/Tech Comms.pdf.
 *
 * Usage:
 *   node scripts/add-lodge-projects.mjs
 *
 * SAFETY:
 *   - Every project is added with `hidden: true` — they will NOT appear on the
 *     public /Projects listing until an admin flips them visible in /admin.
 *   - The script SKIPS any slug that already exists. It never overwrites,
 *     modifies, or deletes existing project keys, and never rebuilds the index.
 *     Safe to re-run.
 *
 * NOTE on CaloTracko: the PDF contains two write-ups, v1 (longer) and v2
 * (tighter). We use v2 here. If you'd rather run the longer v1, it's in the PDF
 * under "CaloTracko v1" — swap the `article` string below.
 *
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from .env.local.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { Redis } from "@upstash/redis";

const envPath = resolve(process.cwd(), ".env.local");
try {
  const envFile = readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // No .env.local — rely on environment variables being set externally
}

if (
  !process.env.UPSTASH_REDIS_REST_URL ||
  !process.env.UPSTASH_REDIS_REST_TOKEN
) {
  console.error(
    "Error: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN not found.\n" +
      "Set them in .env.local or pass them as environment variables."
  );
  process.exit(1);
}

const redis = Redis.fromEnv();

const INDEX_KEY = "projects:index";
const projectKey = (slug) => `project:${slug}`;

const CALOTRACKO_ARTICLE = `Want to track your health? We'd love to introduce a new buddy to you: **CaloTracko!**

Isn't it so cute! (say yes)

Created by **Sean Koh** from AI Lodge, CaloTracko is an AI-powered calorie tracking Telegram bot that makes meal logging as simple as sending a food photo or text description!

Users can track their nutrition through these commands:

- \`/log\` — Log a meal (text or photo)
- \`/today\` — Check today's progress
- \`/week\` — See weekly history
- \`/profile\` — View or update your settings
- \`/saved\` — Browse your saved meals
- \`/goal\` — View or set your calorie goal
- \`/history\` — View a past date
- \`/reminder\` — Set meal reminders

Built with Python, FastAPI, OpenAI's GPT-4o-mini, Vercel, and Supabase, CaloTracko uses AI to estimate calories and macronutrients. It calculates your calorie goals and stores meal history so that users can monitor their progress over time. Features like 'Saved Meals' make logging easier by letting users reuse commonly eaten meals, and conversational follow-ups help to provide extra details.

You see, Sean created CaloTracko after finding traditional apps tedious to use. Logging meals often required manually searching food databases and entering detailed information, making it difficult to stay consistent. While some apps offered photo analysis (e.g. "MealScan"), these features were typically locked behind premium subscriptions. That's when he thought: isn't this something ChatGPT/Gemini could also do through a photo upload? What if he created a simple interface that used AI APIs to analyse images while automatically logging the nutritional data?

The project ended up working better than he expected, being able to identify even multiple foods from a single image. However, a potential improvement is to capture 3D volume data to improve calorie estimation accuracy.`;

const STORIE_ARTICLE = `What if you could be the main character of your own story? Say hi to: **Storie!**

Created by **Samuel Tan**, Storie is an AI-powered storybook generator. It creates personalised stories for you with custom illustrations (you can choose between Watercolour, Pastel, Digital Art, and more)!

Prompt → AI generates the story and artwork → a fully illustrated storybook. The result is a personalised reading experience that can be generated in just minutes for you, your friends, or any kids!

Samuel created Storie as an experiment to explore how AI workflows and text-to-image generation could be combined to serve a meaningful purpose. The goal was to bring them together into a complete storybook experience that children could enjoy before bedtime.

He found the project successful. However, the quality of the generated illustrations was largely constrained by the image generation model being used. In the future, Sam would like to spend more time planning a project out before diving straight into coding, making the overall development process smoother.

**Tech stack**

- Frontend: React 19 + Vite 7
- Styling: Tailwind CSS 3.4
- Routing: React Router 7
- Backend: InsForge BaaS (Database, Storage, AI)
- AI Story Generation: OpenAI GPT-4o-mini
- AI Image Generation: Wavespeed AI`;

const ENHANCE_AI_ARTICLE = `What would you look like when combined with Trump's face? Or the Rock?

**Yashwanth** created Enhance AI to let you do just that!

It is an AI-powered photo enhancement platform that lets you play around with different filters and effects. From turning yourself into a child to trying out celebrity-inspired looks, it's easy to generate entertaining results with just a few clicks. As an extra touch, users can simply scan a QR code to receive their images on Telegram. Simple, interactive, and fun!

The project originally started with a much simpler idea: creating an AI tool that could merge two people's faces to show what the result might look like. As development progressed, the concept expanded into a collection of AI-powered filters, face morphers, and sharing features, turning it into a much more complete photo playground.

One of his biggest takeaways from building Enhance AI was learning how important prompt engineering is for image generation. Small changes to prompts can produce dramatically different outputs, making prompt design just as important as the underlying AI model itself.`;

const projects = [
  {
    slug: "calotracko",
    title: "CaloTracko",
    description:
      "An AI-powered calorie-tracking Telegram bot — log a meal by snapping a photo or typing a description.",
    badge: "AI Lodge",
    category: "Health / LLM",
    coverImage: "",
    images: [],
    overview: "",
    rationale: "",
    lessons: { satisfaction: "", takeaway: "" },
    team: [{ name: "Sean Koh", role: "Builder", avatar: "" }],
    programme: "AI Lodge",
    status: "Completed",
    techStack: ["Python", "FastAPI", "GPT-4o-mini", "Vercel", "Supabase"],
    sourceUrl: "https://github.com/TerrorByter/CaloTracko",
    article: CALOTRACKO_ARTICLE,
    hidden: true,
  },
  {
    slug: "storie",
    title: "Storie",
    description:
      "An AI storybook generator that turns a prompt into a fully illustrated, personalised story in minutes.",
    badge: "AI Lodge",
    category: "Generative AI",
    coverImage: "",
    images: [],
    overview: "",
    rationale: "",
    lessons: { satisfaction: "", takeaway: "" },
    team: [{ name: "Samuel Tan", role: "Builder", avatar: "" }],
    programme: "AI Lodge",
    status: "Completed",
    techStack: [
      "React 19",
      "Vite 7",
      "Tailwind CSS",
      "React Router 7",
      "InsForge BaaS",
      "GPT-4o-mini",
      "Wavespeed AI",
    ],
    sourceUrl: "https://github.com/tancysam/Storie",
    article: STORIE_ARTICLE,
    hidden: true,
  },
  {
    slug: "enhance-ai",
    title: "Enhance AI",
    description:
      "An AI photo-enhancement playground — filters, face morphs, and celebrity looks delivered to your Telegram via QR.",
    badge: "AI Lodge",
    category: "Computer Vision",
    coverImage: "",
    images: [],
    overview: "",
    rationale: "",
    lessons: { satisfaction: "", takeaway: "" },
    team: [{ name: "Yashwanth", role: "Builder", avatar: "" }],
    programme: "AI Lodge",
    status: "Completed",
    techStack: ["Python", "Image Generation API", "Telegram API"],
    sourceUrl: "https://github.com/Yashnm2/Lodge_project/",
    article: ENHANCE_AI_ARTICLE,
    hidden: true,
  },
];

async function run() {
  console.log("Adding AI Lodge article projects (idempotent, hidden)...\n");

  const index = (await redis.lrange(INDEX_KEY, 0, -1)) || [];
  const inIndex = new Set(index);

  let added = 0;
  let skipped = 0;

  for (const project of projects) {
    const existing = await redis.get(projectKey(project.slug));
    if (existing || inIndex.has(project.slug)) {
      console.log(`  ↷ skip  ${project.slug} — already exists, left untouched`);
      skipped++;
      continue;
    }

    await redis.set(projectKey(project.slug), project);
    await redis.rpush(INDEX_KEY, project.slug);
    console.log(`  ✔ added ${project.slug} (hidden)`);
    added++;
  }

  console.log(`\nDone. Added ${added}, skipped ${skipped}.`);
  console.log(
    "Added projects are HIDDEN — flip them visible in /admin when ready."
  );
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
