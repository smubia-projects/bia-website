/**
 * Data Associate Programme page content — edit here, not in page.tsx.
 * Content carried over from the original DAP section component.
 */

export interface Pillar {
  title: string;
  imageSrc: string;
  points: { lead: string; text: string }[];
}

export const PILLARS: Pillar[] = [
  {
    title: "Co-learning",
    imageSrc: "/images/Co-learning2022.jpg",
    points: [
      {
        lead: "Co-Learning Sessions",
        text: "We believe the best way to learn is to teach. These sessions help Data Associates build a strong foundation in Machine Learning concepts, focusing on the math and intuition behind key techniques.",
      },
      {
        lead: "Team-Based Learning",
        text: "Data Associates are split into teams of 4, each presenting a topic to their peers — from Regression to Natural Language Processing.",
      },
    ],
  },
  {
    title: "Project",
    imageSrc: "/images/dapProject.jpg",
    points: [
      {
        lead: "Project-Based Learning",
        text: "We believe in an application-first approach. Each Data Associate works in a group of 4 to propose and develop a data analytics project.",
      },
      {
        lead: "Creative Freedom",
        text: "We don't limit the type of projects — only that they must be related to Data Analytics. The focus is on practical experience and real-world problem-solving.",
      },
      {
        lead: "Share Your Findings",
        text: "At the end of the project, Data Associates present their findings and final outcomes to the community.",
      },
    ],
  },
  {
    title: "Community",
    imageSrc: "/images/dapWelcome1.jpg",
    points: [
      {
        lead: "A Strong Community",
        text: "The programme emphasises collaboration, networking and growth within a supportive community.",
      },
      {
        lead: "Knowledge Sharing",
        text: "Through events, workshops and group projects, Data Associates exchange knowledge and gain insights from peers.",
      },
      {
        lead: "Continuous Support",
        text: "A space to ask questions, collaborate on challenges and keep learning from each other beyond the formal sessions.",
      },
    ],
  },
];

export const CURRICULUM_TOPICS = [
  "Regression",
  "Classification",
  "Ensemble Learning",
  "Neural Networks",
  "Unsupervised Learning",
  "Natural Language Processing",
];

export interface FeaturedProject {
  title: string;
  team: string;
  mentors: string;
  text: string;
  media: { type: "image"; src: string } | { type: "video"; src: string };
}

export const FEATURED_PROJECTS: FeaturedProject[] = [
  {
    title: "ASL Fingerspelling Detection Tool",
    team: "Jolene Yeo, Regine Tan, Rheza Paleva, Vicky Qu",
    mentors: "Jowett",
    text: "As part of our DAP project, we delved into the realm of American Sign Language (ASL), exploring how we could harness machine learning to create a model capable of detecting and spelling out the sign languages given by the user.",
    media: { type: "image", src: "/images/ASL2.jpg" },
  },
  {
    title: "HDB Price Prediction Model",
    team: "Elijah Khor, Htoo Myat Naing, Ivan Yeo, Keng Boon",
    mentors: "King Yeh, Gabriel Sidik",
    text: "We created new features for each individual flat using the OneMap API such as coordinate data, postal code, and distances from places of interest. We then clustered the data by sector code and coordinates, before comparing different Regression methods to find the optimal model.",
    media: { type: "image", src: "/images/Help-Htoo-Resale.jpg" },
  },
  {
    title: "Lyrics Machine",
    team: "Phyo, Rafe, Charmaine, Shu Rui",
    mentors: "Gabriel Sidik, Renata",
    text: "Ever wondered how cool it would be if we could use machine learning to generate some sick lyrics? That was exactly what went through our minds while writing the project proposal for SMUBIA's Data Associate Programme.",
    media: {
      type: "video",
      src: "https://thisisformygif2.s3.ap-southeast-1.amazonaws.com/Lyrics-Machine.gif.mp4",
    },
  },
];

export const DAP_SLIDES_URL = "https://smu.sg/DAP-Mentee-Slides";
