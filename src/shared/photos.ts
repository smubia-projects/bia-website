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

/** Which site a slot is on; AI Lodge exco may edit the AI Lodge site's photos. */
export type PhotoSite = "smubia" | "ailodge";
export const photoSite = (key: string): PhotoSite => (key.startsWith("ailodge.") ? "ailodge" : "smubia");

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
  { kind: "single", key: "ailodge.hero", page: "AI Lodge site", path: AILODGE, label: "Home: framed photo", hint: "The framed group photo beside the headline", ratio: 4 / 3, default: { src: `${AILODGE}/moments/fall2026/OriPhoto.JPG`, alt: "A past AI Lodge group together after a session." } },
  { kind: "single", key: "ailodge.whyJoin", page: "AI Lodge site", path: AILODGE, label: "Home: Why join photo", ratio: null, default: { src: `${AILODGE}/moments/fall2026/tencent-ai-safety-workshop.webp`, alt: "AI Lodge lodgers and captains together at the Tencent × SCOGA AI Safety Workshop" } },
  {
    kind: "gallery",
    key: "ailodge.moments",
    page: "AI Lodge site",
    path: AILODGE,
    label: "Past moments belt",
    hint: "The scrolling strip of photos on the home page, in order",
    ratio: null,
    default: [
      { src: `${AILODGE}/moments/fall2026/CJBLodge.JPG`, alt: "The CJB lodge together" },
      { src: `${AILODGE}/moments/fall2026/CJBSession.JPG`, alt: "A CJB lodge session" },
      { src: `${AILODGE}/moments/fall2026/cjb2.JPG`, alt: "Lodgers in a CJB session" },
      { src: `${AILODGE}/moments/fall2026/cjb3.JPG`, alt: "CJB lodgers working together" },
      { src: `${AILODGE}/moments/fall2026/COMBINEDSession.JPG`, alt: "A combined session with multiple lodges" },
      { src: `${AILODGE}/moments/fall2026/CurMax.JPG`, alt: "Curiositymaxxer lodgers together" },
      { src: `${AILODGE}/moments/fall2026/CurMaxLodge.JPG`, alt: "The Curiositymaxxer lodge" },
      { src: `${AILODGE}/moments/fall2026/HackstreetLodge.JPG`, alt: "The Hackstreet Boys lodge" },
      { src: `${AILODGE}/moments/fall2026/PaisehLodge.JPG`, alt: "The Paiseh lodge" },
      { src: `${AILODGE}/moments/fall2026/PaisehSession.JPG`, alt: "A Paiseh lodge session" },
      { src: `${AILODGE}/moments/fall2026/Paiseh3.JPG`, alt: "Paiseh lodgers together" },
      { src: `${AILODGE}/moments/fall2026/VampireLodge2.JPG`, alt: "The Vampire lodge" },
      { src: `${AILODGE}/moments/fall2026/WSSLodge.JPG`, alt: "The WSS lodge" },
      { src: `${AILODGE}/moments/fall2026/DinnerLodges.JPG`, alt: "Lodges gathered over dinner" },
      { src: `${AILODGE}/moments/fall2026/Ori.JPG`, alt: "Orientation night" },
      { src: `${AILODGE}/moments/fall2026/Ori2.JPG`, alt: "Orientation night" },
      { src: `${AILODGE}/moments/fall2026/Ori3.JPG`, alt: "Orientation night" },
      { src: `${AILODGE}/moments/fall2026/OriPhoto.JPG`, alt: "Orientation group photo" },
      { src: `${AILODGE}/moments/fall2026/TencentWorkshop.JPG`, alt: "Industry workshop with Tencent" },
      { src: `${AILODGE}/moments/fall2026/Tencent2.JPG`, alt: "Lodgers at the Tencent workshop" },
      { src: `${AILODGE}/moments/fall2026/TencentPhoto.JPG`, alt: "Group photo at the Tencent workshop" },
      { src: `${AILODGE}/moments/fall2026/IMG_9007.JPG`, alt: "Lodgers at an AI Lodge event" },
      { src: `${AILODGE}/moments/fall2026/IMG_9106.JPG`, alt: "Lodgers at an AI Lodge event" },
      { src: `${AILODGE}/moments/spring2026/awsome-group.webp`, alt: "A lodge gathered together for a group photo" },
      { src: `${AILODGE}/moments/spring2026/demo-candid-action.webp`, alt: "Lodgers heads-down building during a session" },
      { src: `${AILODGE}/moments/spring2026/jb-group-2.webp`, alt: "A lodge posing together after a session" },
      { src: `${AILODGE}/moments/spring2026/demo-project-1.webp`, alt: "A team presenting their project on demo day" },
      { src: `${AILODGE}/moments/spring2026/lab-group.webp`, alt: "Lodge members together at the lab" },
      { src: `${AILODGE}/moments/spring2026/demo-candid-group.webp`, alt: "The cohort together on demo day" },
      { src: `${AILODGE}/moments/spring2026/awsome-food.webp`, alt: "A lodge hanging out over food" },
      { src: `${AILODGE}/moments/spring2026/demo-project-2.webp`, alt: "A team showing off what they built" },
      { src: `${AILODGE}/moments/spring2026/jb-group.webp`, alt: "A lodge group photo" },
      { src: `${AILODGE}/moments/spring2026/demo-project-3.webp`, alt: "Lodgers presenting their demo-day project" },
      { src: `${AILODGE}/moments/spring2026/demo-project-4.webp`, alt: "A project demo in front of the room" },
      { src: `${AILODGE}/moments/spring2026/demo-project-5.webp`, alt: "A team at the project exhibition" },
      { src: `${AILODGE}/moments/spring2026/demo-project-6.webp`, alt: "Lodgers demoing their final build" },
    ],
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
