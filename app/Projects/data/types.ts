export interface TeamMember {
  name: string;
  role: string;
  avatar: string;
}

export interface Project {
  slug: string;
  title: string;
  description: string;
  badge: "DAP" | "AI Lodge";
  category: string;
  coverImage: string;
  images: string[];
  overview: string;
  rationale: string;
  lessons: {
    satisfaction: string;
    takeaway: string;
  };
  team: TeamMember[];
  programme: string;
  status: "Completed" | "Ongoing";
  techStack: string[];
  demoUrl?: string;
  sourceUrl?: string;
  /** When true, the project is excluded from the public /Projects listing */
  hidden?: boolean;
}
