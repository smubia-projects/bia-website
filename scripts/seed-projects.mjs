/**
 * Seed script — uploads existing project data to Vercel Blob.
 *
 * Usage:
 *   node scripts/seed-projects.mjs
 *
 * Reads BLOB_READ_WRITE_TOKEN from .env.local automatically.
 * Run once after setting up the Blob store to populate it with the
 * initial project data. Safe to re-run — overwrites the existing file.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { put, list, del } from "@vercel/blob";

// Load .env.local so the script works without manually exporting vars
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

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(
    "Error: BLOB_READ_WRITE_TOKEN not found.\n" +
      "Set it in .env.local or pass it as an environment variable."
  );
  process.exit(1);
}

const PROJECTS_KEY = "data/projects.json";

const projects = [
  {
    slug: "financial-sentiment",
    title: "Neural-Linguistics for FinTech",
    description:
      "A real-time NLP dashboard designed to identify market signals from unstructured financial news streams using fine-tuned BERT models.",
    badge: "DAP",
    category: "NLP",
    coverImage:
      "https://ssvs8thfuktvqsqk.public.blob.vercel-storage.com/placeholder-cover.jpg",
    images: [
      "https://ssvs8thfuktvqsqk.public.blob.vercel-storage.com/placeholder-cover.jpg",
    ],
    overview:
      "An advanced neural network framework designed to synthesize multi-modal financial data into actionable market sentiment indices with high historical accuracy.",
    rationale:
      "Financial markets are increasingly driven by sentiment found in alternative data sources. However, traditional tools often fail to capture the nuance of industry-specific jargon. This project was initiated to bridge the gap between raw web-scraped financial news and actionable quantitative data. By leveraging fine-tuned BERT models specifically trained on financial corpora, we achieved a 14% improvement in entity recognition accuracy compared to off-the-shelf models.",
    lessons: {
      satisfaction:
        "Team Satisfaction: 4.5/5. We are highly satisfied with the technical architecture and the accuracy of the model, though we feel there is room for further optimization in the real-time processing latency.",
      takeaway:
        "Moving forward, we identified that the latency in real-time streaming could be further optimized by shifting from REST to WebSockets for the final visualization layer. This would provide a more fluid user experience during peak market volatility hours.",
    },
    team: [
      { name: "Alex Thompson", role: "Lead Data Scientist", avatar: "" },
      { name: "Sarah Chen", role: "ML Engineer", avatar: "" },
      { name: "Marcus Rodriguez", role: "Frontend Architect", avatar: "" },
    ],
    programme: "DAP",
    status: "Completed",
    techStack: ["Python", "PyTorch", "Tailwind", "D3.js"],
    demoUrl: "",
    sourceUrl: "",
  },
  {
    slug: "study-assistant",
    title: "GPT-Powered Study Assistant",
    description:
      "A RAG-based educational tool that processes lecture materials and textbooks to provide contextual tutoring and automatic flashcard generation.",
    badge: "AI Lodge",
    category: "EdTech",
    coverImage:
      "https://ssvs8thfuktvqsqk.public.blob.vercel-storage.com/placeholder-cover.jpg",
    images: [
      "https://ssvs8thfuktvqsqk.public.blob.vercel-storage.com/placeholder-cover.jpg",
    ],
    overview:
      "A retrieval-augmented generation system that ingests university lecture slides and readings, then serves as an always-available tutor — answering questions with source citations and automatically generating Anki-compatible flashcards from key concepts.",
    rationale:
      "Students spend disproportionate time searching through dense PDFs rather than actively recalling knowledge. Existing AI chat tools hallucinate and lack source grounding. By building a RAG pipeline with chunked PDF ingestion and vector search, every answer is grounded in the uploaded material — students can trust the responses and trace them back to the source slide.",
    lessons: {
      satisfaction:
        "Team Satisfaction: 4.6/5. The quality of answers surprised even our sceptics once we tuned the chunk size and overlap parameters. The flashcard export feature became the most-used feature by far.",
      takeaway:
        "Chunking strategy has an outsized impact on RAG quality. We iterated through fixed-size, sentence-boundary, and semantic chunking before landing on a hybrid that balanced context window usage with retrieval precision.",
    },
    team: [
      { name: "Rachel Tan", role: "ML Engineer", avatar: "" },
      { name: "Bryan Ong", role: "Full Stack Developer", avatar: "" },
    ],
    programme: "AI Lodge",
    status: "Completed",
    techStack: ["Python", "LangChain", "Pinecone", "Next.js"],
    demoUrl: "",
    sourceUrl: "",
  },
  {
    slug: "singing-scorer",
    title: "Singing Scorer",
    description:
      "An ML model trained to evaluate singing performances using objective criteria like pitch accuracy and vocal stability — because human judgment is subjective.",
    badge: "DAP",
    category: "Audio ML",
    coverImage: "",
    images: [""],
    overview:
      "Singing Scorer is a web application that uses a fine-tuned MERT-v1-95M model with a custom regression head to score singing recordings on objective acoustic criteria such as pitch accuracy and stability. The frontend is built with React 19 and Vite, with a Flask backend handling audio processing and inference.",
    rationale:
      "Human judgment of singing quality is inherently subjective and inconsistent. The team wanted to train an ML model to evaluate performances against objective acoustic metrics — pitch accuracy, vocal stability, and tonal consistency — removing the variability of human scoring. The project was also driven by curiosity and a desire to build something genuinely fun to use.",
    lessons: {
      satisfaction:
        "Team Satisfaction: 4/5. The model achieved a meaningful level of accuracy in scoring singing performances. There is room to improve further, particularly in edge cases with unconventional vocal styles.",
      takeaway:
        "Model accuracy is an iterative process. The team identified that further fine-tuning with a more diverse training dataset would significantly improve scoring consistency across different vocal ranges and styles.",
    },
    team: [
      { name: "Julia Wong", role: "Team Member", avatar: "" },
      { name: "Minn Ong", role: "Team Member", avatar: "" },
      { name: "Yeo Wei Ting", role: "Team Member", avatar: "" },
    ],
    programme: "DAP",
    status: "Completed",
    techStack: [
      "React 19",
      "Vite 7",
      "Python",
      "Flask",
      "PyTorch",
      "Transformers",
      "Docker",
      "Hugging Face Spaces",
    ],
    demoUrl: "https://pitchperfect.minn.codes/",
    sourceUrl: "https://github.com/jhulyea/singmos-demo",
  },
  {
    slug: "enhance-ai",
    title: "Enhance AI",
    description:
      "An AI-powered photo enhancement platform with fun filters — face morphers, style effects, and automatic Telegram delivery via QR code.",
    badge: "AI Lodge",
    category: "Computer Vision",
    coverImage: "",
    images: [""],
    overview:
      "Enhance AI is a web platform that applies AI-generated effects to photos — including style transfers (Trump effect, Obama effect, kid effect) and face morphing. A standout feature automatically sends processed photos to the user's Telegram when they scan a QR code, removing the need to download anything manually.",
    rationale:
      "The project started as a face-merging experiment — showing what two people would look like combined. It quickly expanded into a broader photo enhancement platform with multiple filters and morphers. The goal was to make AI image manipulation accessible and genuinely entertaining, without requiring any technical knowledge from the user.",
    lessons: {
      satisfaction:
        "Team Satisfaction: 4/5. The original vision was delivered in full, plus several additional features including the Telegram QR-code delivery system, which became the most impressive demo moment.",
      takeaway:
        "Prompt engineering has an outsized impact on the quality of AI-generated image effects. Well-structured, specific prompts consistently produced more accurate and visually compelling results than generic ones.",
    },
    team: [{ name: "Yashwanth A.", role: "Developer", avatar: "" }],
    programme: "AI Lodge",
    status: "Completed",
    techStack: ["Python", "Telegram API", "Image Generation API"],
    demoUrl: "",
    sourceUrl: "https://github.com/Yashnm2/Lodge_project/",
  },
];

async function seed() {
  console.log("Seeding projects to Vercel Blob...");

  const { blobs } = await list({ prefix: PROJECTS_KEY, limit: 1 });
  if (blobs.length > 0) {
    console.log("Deleting existing projects.json...");
    await del(blobs[0].url);
  }

  const result = await put(
    PROJECTS_KEY,
    JSON.stringify(projects, null, 2),
    { access: "public", addRandomSuffix: false }
  );

  console.log(`Seeded ${projects.length} projects.`);
  console.log(`Blob URL: ${result.url}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
