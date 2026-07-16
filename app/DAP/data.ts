/**
 * Data Associate Programme page content — edit here, not in page.tsx.
 * The page is a restrained "programme brief" in deep pine; keep copy tight.
 */

/* ── Curriculum — AY 26/27, the centrepiece ─────────────────────────── */

export interface CurriculumTopic {
  title: string;
  blurb: string;
}

export const CURRICULUM: CurriculumTopic[] = [
  {
    title: "Regression",
    blurb:
      "Modelling continuous outcomes. Normal Equation, Loss, Regularisation, the basics of machine learning.",
  },
  {
    title: "Classification",
    blurb:
      "Drawing decision boundaries, from logistic regression to margin-based classifiers.",
  },
  {
    title: "Ensemble Learning",
    blurb:
      "Bagging, boosting and forests. How weak learners can be combined into a strong one.",
  },
  {
    title: "Recommender Systems",
    blurb:
      "Collaborative filtering and matrix factorisation — the logic behind what you're shown next.",
  },
  {
    title: "Neural Networks",
    blurb:
      "Backpropagation, Perceptrons and the building blocks that sit beneath modern deep learning.",
  },
  {
    title: "Natural Language Processing I",
    blurb: "Tokens, N-grams, embeddings and representing meaning as vectors.",
  },
  {
    title: "Natural Language Processing II",
    blurb:
      "Attention and transformers — the architecture under today's Large Language Models.",
  },
  {
    title: "Computer Vision",
    blurb: "Convolutional architectures that allow a machine to read an image.",
  },
  {
    title: "Reinforcement Learning",
    blurb: "Agents that learn by acting: reward, policy and the exploration trade-off.",
  }
];

/* ── Cohort photo — the wide moment ─────────────────────────────────── */

export const COHORT_PHOTO = {
  src: "/images/dap/dap-cohort.webp",
  caption: "The AY 25/26 cohort",
};

/* ── Programme structure — two movements ────────────────────────────── */

export interface Movement {
  label: string;
  title: string;
  blurb: string;
  photos: { src: string; alt: string }[];
}

export const STRUCTURE: Movement[] = [
  {
    label: "Co-learning",
    title: "Learn a topic by teaching it",
    blurb:
      "The surest way to learn something is to teach it. Teams of four are assigned a topic from the curriculum. Mentors then teach them the mathematics and intuition, then they teach it back to the cohort. Week by week, all associates build the machine learning core together.",
    photos: [
      { src: "/images/dap/dap-colearning-1.webp", alt: "Associates presenting a co-learning session" },
      { src: "/images/dap/dap-colearning-2.webp", alt: "A co-learning team leading a topic" },
    ],
  },
  {
    label: "The project",
    title: "Build something, from end to end",
    blurb:
      "Application first. Alongside the theory, every team proposes and builds a data project of their own. They will be mentored from proposal to working demo, and presented to the DAP community at the end of the semester.",
    photos: [
      { src: "/images/dap/dap-presentation-1.webp", alt: "A project team presenting their findings" },
      { src: "/images/dap/dap-presentation-2.webp", alt: "Associates sharing a final project" },
      { src: "/images/dap/dap-presentation-3.webp", alt: "A project showcase presentation" },
    ],
  },
];
