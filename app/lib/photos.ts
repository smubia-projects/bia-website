/*
 * Every static photo on smubia.com (and the AI Lodge site), as a named slot.
 * The file shipped with the site is the default; the CMS (Settings › Photos)
 * can replace it. Pages read slots with getSitePhotos() (server) or
 * usePhoto() (client) and mark the <Image> with data-photo-slot so the CMS can
 * preview a new photo in place. Pure data: safe in client components.
 */

export interface Photo {
  src: string;
  alt: string;
}

interface SlotBase {
  key: string;
  /** Page group in the CMS */
  page: string;
  /** The page the slot is on, for the live preview; absolute when on another site */
  path: string;
  label: string;
  hint?: string;
  /** Crop ratio for new uploads (width / height); null keeps the whole photo */
  ratio: number | null;
}

export interface SingleSlot extends SlotBase {
  kind: "single";
  default: Photo;
}

/** An ordered set of photos, e.g. the AI Lodge site's "Past moments" belt. */
export interface GallerySlot extends SlotBase {
  kind: "gallery";
  default: Photo[];
}

export type PhotoSlot = SingleSlot | GallerySlot;

const AILODGE = "https://ailodge.smubia.com";
const BLOB = "https://ssvs8thfuktvqsqk.public.blob.vercel-storage.com";

export const PHOTO_SLOTS: PhotoSlot[] = [
  // Home
  { kind: "single", key: "home.heroCohort", page: "Home", path: "/", label: "Hero collage: DAP cohort", ratio: null, default: { src: "/images/home/hero-cohort.webp", alt: "SMUBIA Data Associate Programme cohort" } },
  { kind: "single", key: "home.heroDemoDay", page: "Home", path: "/", label: "Hero collage: demo day", ratio: null, default: { src: "/images/home/hero-demoday.webp", alt: "Members presenting at an AI Lodge demo day" } },
  { kind: "single", key: "home.heroAiLodge", page: "Home", path: "/", label: "Hero collage: AI Lodge", ratio: null, default: { src: "/images/home/hero-ailodge.webp", alt: "An AI Lodge team hanging out" } },
  { kind: "single", key: "home.pathwayDap", page: "Home", path: "/", label: "Programmes: Data Associate Programme", ratio: null, default: { src: "/images/dap/dap-presentation-1.webp", alt: "A Data Associate Programme member presenting their project" } },
  { kind: "single", key: "home.pathwayAiLodge", page: "Home", path: "/", label: "Programmes: AI Lodge", ratio: null, default: { src: "/images/ailodge/hero-1.webp", alt: "AI Lodge builders working together" } },
  { kind: "single", key: "home.pathwayWorkshops", page: "Home", path: "/", label: "Programmes: Curriculum", ratio: null, default: { src: "/images/excelWorkshop.jpg", alt: "Members at a hands-on data workshop" } },
  { kind: "single", key: "home.alumni1", page: "Home", path: "/", label: "Alumni: Jowett", hint: "A square portrait", ratio: 1, default: { src: `${BLOB}/jowett-Afv3kaIlSii6rjl5hBj3u2pm5uAy09.jpg`, alt: "Jowett" } },
  { kind: "single", key: "home.alumni2", page: "Home", path: "/", label: "Alumni: Gigi Teo", hint: "A square portrait", ratio: 1, default: { src: `${BLOB}/gigi3-DYIV83HGA7dhcL3KNN70Azz9stUjbA.jpg`, alt: "Gigi Teo" } },
  { kind: "single", key: "home.alumni3", page: "Home", path: "/", label: "Alumni: Aryan Khera", hint: "A square portrait", ratio: 1, default: { src: `${BLOB}/aryan3-FmkPn0Ey0i2lt1QVPbbbW4eNFusXn5.jpg`, alt: "Aryan Khera" } },

  // DAP
  { kind: "single", key: "dap.cohort", page: "DAP", path: "/dap", label: "Cohort photo (wide)", ratio: null, hint: "The caption under it is the alt text", default: { src: "/images/dap/dap-cohort.webp", alt: "The AY 25/26 cohort" } },
  { kind: "single", key: "dap.colearning1", page: "DAP", path: "/dap", label: "How it runs: co-learning 1", ratio: null, default: { src: "/images/dap/dap-colearning-1.webp", alt: "Associates presenting a co-learning session" } },
  { kind: "single", key: "dap.colearning2", page: "DAP", path: "/dap", label: "How it runs: co-learning 2", ratio: null, default: { src: "/images/dap/dap-colearning-2.webp", alt: "A co-learning team leading a topic" } },
  { kind: "single", key: "dap.project1", page: "DAP", path: "/dap", label: "How it runs: projects 1", ratio: null, default: { src: "/images/dap/dap-presentation-1.webp", alt: "A project team presenting their findings" } },
  { kind: "single", key: "dap.project2", page: "DAP", path: "/dap", label: "How it runs: projects 2", ratio: null, default: { src: "/images/dap/dap-presentation-2.webp", alt: "Associates sharing a final project" } },
  { kind: "single", key: "dap.project3", page: "DAP", path: "/dap", label: "How it runs: projects 3", ratio: null, default: { src: "/images/dap/dap-presentation-3.webp", alt: "A project showcase presentation" } },

  // Work with us
  { kind: "single", key: "partners.hero", page: "Work with us", path: "/work-with-us", label: "Hero photo", ratio: null, default: { src: `${BLOB}/biapic2-CKSujqIfzxfHoHCdrWlUtHD3XftCgu.jpg`, alt: "The SMUBIA community" } },

  // The AI Lodge site reads these from /api/public/ailodge (photos)
  { kind: "single", key: "ailodge.entry", page: "AI Lodge site", path: AILODGE, label: "Entry scene (desktop)", hint: "The full-screen cabin scene when the site opens on a computer", ratio: 16 / 9, default: { src: `${AILODGE}/entry/entry-hd.jpg`, alt: "" } },
  { kind: "single", key: "ailodge.entryPortrait", page: "AI Lodge site", path: AILODGE, label: "Entry scene (phone)", hint: "The same scene, portrait", ratio: 9 / 16, default: { src: `${AILODGE}/entry/entry-hd-portrait.jpg`, alt: "" } },
  { kind: "single", key: "ailodge.lodgeHero", page: "AI Lodge site", path: `${AILODGE}/lodges/mit`, label: "Lodge page backdrop", hint: "Behind the top of every lodge page", ratio: 16 / 9, default: { src: `${AILODGE}/entry/close-desktop.jpg`, alt: "" } },
  {
    kind: "gallery",
    key: "ailodge.moments",
    page: "AI Lodge site",
    path: AILODGE,
    label: "Past moments belt",
    hint: "The scrolling strip of photos on the home page, in order",
    ratio: null,
    default: [
      "awsome-group",
      "demo-candid-action",
      "jb-group-2",
      "demo-project-1",
      "lab-group",
      "demo-candid-group",
      "awsome-food",
      "demo-project-2",
      "jb-group",
      "demo-project-3",
      "demo-project-4",
      "demo-project-5",
      "demo-project-6",
    ].map((f) => ({ src: `${AILODGE}/moments/${f}.webp`, alt: "" })),
  },
];

export type PhotoKey = string;

/** Single-photo slots resolved to their current photo; galleries to their list. */
export interface SitePhotos {
  single: Record<PhotoKey, Photo>;
  gallery: Record<PhotoKey, Photo[]>;
  /** Slots that have been replaced in the CMS */
  custom: PhotoKey[];
}

export const DEFAULT_SITE_PHOTOS: SitePhotos = {
  single: Object.fromEntries(PHOTO_SLOTS.filter((s): s is SingleSlot => s.kind === "single").map((s) => [s.key, s.default])),
  gallery: Object.fromEntries(PHOTO_SLOTS.filter((s): s is GallerySlot => s.kind === "gallery").map((s) => [s.key, s.default])),
  custom: [],
};

export const photoSlot = (key: PhotoKey) => PHOTO_SLOTS.find((s) => s.key === key);

/** The current photo for a slot, falling back to the shipped file. */
export const pickPhoto = (photos: SitePhotos, key: PhotoKey): Photo =>
  photos.single[key] ?? DEFAULT_SITE_PHOTOS.single[key] ?? { src: "", alt: "" };
