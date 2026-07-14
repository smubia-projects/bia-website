"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  logout,
  addProject,
  updateProject,
  deleteProject,
  toggleProjectVisibility,
  fetchProjects,
} from "./actions";
import { Project, HighlightCard } from "@/app/Projects/data/types";
import {
  CARD_ICONS,
  DEFAULT_CARD_ICON,
  getCardIcon,
} from "@/app/Projects/data/cardIcons";
import ImageCropper from "./ImageCropper";
import styles from "./Admin.module.css";
import { AnimatePresence, motion } from "framer-motion";
import {
  AdminButton,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminToggle,
} from "./AdminMotion";

interface Props {
  initialProjects: Project[];
}

type View = "list" | "add" | "edit";

interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  linkedin: string;
  github: string;
  website: string;
}

const EMPTY_MEMBER: TeamMember = {
  name: "",
  role: "",
  avatar: "",
  linkedin: "",
  github: "",
  website: "",
};

const EMPTY_CARD: HighlightCard = {
  icon: DEFAULT_CARD_ICON,
  title: "",
  body: "",
};

/** Load a project's cards, migrating legacy `lessons` into the new format. */
function cardsFromProject(project: Project): HighlightCard[] {
  if (project.cards && project.cards.length > 0) {
    return project.cards.map((c) => ({ ...EMPTY_CARD, ...c }));
  }
  const legacy: HighlightCard[] = [];
  if (project.lessons?.satisfaction?.trim()) {
    legacy.push({
      icon: "circle-check",
      title: "Project Satisfaction",
      body: project.lessons.satisfaction,
    });
  }
  if (project.lessons?.takeaway?.trim()) {
    legacy.push({
      icon: "lightbulb",
      title: "Key Takeaway",
      body: project.lessons.takeaway,
    });
  }
  return legacy.length > 0 ? legacy : [{ ...EMPTY_CARD }];
}

interface CroppedImage {
  blob: Blob;
  preview: string;
}

interface CropperState {
  imageSrc: string;
  aspectRatio: number;
  aspectLabel: string;
  type: "cover" | "carousel";
  pendingFiles: File[];
  currentIndex: number;
}

const COVER_ASPECT = 16 / 10;
const CAROUSEL_ASPECT = 16 / 9;

const EMPTY_FORM = {
  title: "",
  description: "",
  badge: "DAP" as "DAP" | "AI Lodge",
  category: "",
  overview: "",
  techStack: "",
  demoUrl: "",
  sourceUrl: "",
  liveUrl: "",
};

export default function AdminClient({ initialProjects }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [view, setView] = useState<View>("list");
  const [editSlug, setEditSlug] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [cards, setCards] = useState<HighlightCard[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingCover, setExistingCover] = useState("");
  const [croppedCover, setCroppedCover] = useState<CroppedImage | null>(null);
  const [croppedImages, setCroppedImages] = useState<CroppedImage[]>([]);
  const [cropperState, setCropperState] = useState<CropperState | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (croppedCover) URL.revokeObjectURL(croppedCover.preview);
      croppedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [croppedCover, croppedImages]);

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
    if (type === "success") {
      setTimeout(() => setMessage(null), 4000);
    }
  }

  async function refreshProjects() {
    const fresh = await fetchProjects();
    setProjects(fresh);
  }

  function startAdd() {
    setForm(EMPTY_FORM);
    setTeam([{ ...EMPTY_MEMBER }]);
    setCards([{ ...EMPTY_CARD }]);
    setExistingImages([]);
    setExistingCover("");
    setCroppedCover(null);
    setCroppedImages([]);
    setView("add");
  }

  function startEdit(project: Project) {
    setForm({
      title: project.title,
      description: project.description,
      badge: project.badge,
      category: project.category,
      // Overview absorbed the old rationale — show them merged so the editor
      // sees (and re-saves) one field.
      overview: [project.overview, project.rationale]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join("\n\n"),
      techStack: project.techStack.join(", "),
      demoUrl: project.demoUrl || "",
      sourceUrl: project.sourceUrl || "",
      liveUrl: project.liveUrl || "",
    });
    setTeam(
      project.team.length > 0
        ? project.team.map((t) => ({ ...EMPTY_MEMBER, ...t }))
        : [{ ...EMPTY_MEMBER }]
    );
    setCards(cardsFromProject(project));
    setExistingImages(project.images);
    setExistingCover(project.coverImage);
    setCroppedCover(null);
    setCroppedImages([]);
    setEditSlug(project.slug);
    setView("edit");
  }

  function cancelForm() {
    setView("list");
    setMessage(null);
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateTeamMember(
    idx: number,
    field: keyof TeamMember,
    value: string
  ) {
    setTeam((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }

  function addTeamMember() {
    setTeam((prev) => [...prev, { ...EMPTY_MEMBER }]);
  }

  function removeTeamMember(idx: number) {
    setTeam((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCard(idx: number, field: keyof HighlightCard, value: string) {
    setCards((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }

  function addCard() {
    setCards((prev) => [...prev, { ...EMPTY_CARD }]);
  }

  function removeCard(idx: number) {
    setCards((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeExistingImage(idx: number) {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeCroppedImage(idx: number) {
    setCroppedImages((prev) => {
      const removed = prev[idx];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function removeCover() {
    if (croppedCover) {
      URL.revokeObjectURL(croppedCover.preview);
      setCroppedCover(null);
    } else {
      setExistingCover("");
    }
  }

  // --- Cropper flow ---

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const src = URL.createObjectURL(file);
    setCropperState({
      imageSrc: src,
      aspectRatio: COVER_ASPECT,
      aspectLabel: "16 : 10 (Card Cover)",
      type: "cover",
      pendingFiles: [],
      currentIndex: 0,
    });
  }

  function handleCarouselSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";
    const src = URL.createObjectURL(files[0]);
    setCropperState({
      imageSrc: src,
      aspectRatio: CAROUSEL_ASPECT,
      aspectLabel: "16 : 9 (Carousel)",
      type: "carousel",
      pendingFiles: files,
      currentIndex: 0,
    });
  }

  const handleCropComplete = useCallback(
    (blob: Blob) => {
      if (!cropperState) return;
      const preview = URL.createObjectURL(blob);

      if (cropperState.type === "cover") {
        if (croppedCover) URL.revokeObjectURL(croppedCover.preview);
        setCroppedCover({ blob, preview });
        setExistingCover("");
        URL.revokeObjectURL(cropperState.imageSrc);
        setCropperState(null);
      } else {
        setCroppedImages((prev) => [...prev, { blob, preview }]);
        URL.revokeObjectURL(cropperState.imageSrc);

        const nextIndex = cropperState.currentIndex + 1;
        if (nextIndex < cropperState.pendingFiles.length) {
          const nextSrc = URL.createObjectURL(
            cropperState.pendingFiles[nextIndex]
          );
          setCropperState({
            ...cropperState,
            imageSrc: nextSrc,
            currentIndex: nextIndex,
          });
        } else {
          setCropperState(null);
        }
      }
    },
    [cropperState, croppedCover]
  );

  function handleCropCancel() {
    if (!cropperState) return;
    URL.revokeObjectURL(cropperState.imageSrc);

    if (cropperState.type === "carousel") {
      const nextIndex = cropperState.currentIndex + 1;
      if (nextIndex < cropperState.pendingFiles.length) {
        const nextSrc = URL.createObjectURL(
          cropperState.pendingFiles[nextIndex]
        );
        setCropperState({
          ...cropperState,
          imageSrc: nextSrc,
          currentIndex: nextIndex,
        });
        return;
      }
    }
    setCropperState(null);
  }

  // --- Submit ---

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    fd.set("team", JSON.stringify(team.filter((t) => t.name.trim())));
    fd.set(
      "cards",
      JSON.stringify(
        cards
          .filter((c) => c.title.trim() || c.body.trim())
          .map((c) => ({
            icon: c.icon || DEFAULT_CARD_ICON,
            title: c.title.trim(),
            body: c.body,
          }))
      )
    );
    fd.set("existingImages", JSON.stringify(existingImages));
    fd.set("existingCoverImage", existingCover);

    fd.delete("coverImage");
    fd.delete("images");

    if (croppedCover) {
      fd.set(
        "coverImage",
        new File([croppedCover.blob], "cover.jpg", { type: "image/jpeg" })
      );
    }

    croppedImages.forEach((img) => {
      fd.append(
        "images",
        new File([img.blob], `carousel-${Date.now()}.jpg`, {
          type: "image/jpeg",
        })
      );
    });

    let result;
    if (view === "edit") {
      fd.set("slug", editSlug);
      result = await updateProject(fd);
    } else {
      result = await addProject(fd);
    }

    if (result.success) {
      showMessage(
        "success",
        view === "edit"
          ? "Project updated"
          : "Project added — hidden by default, toggle it visible when ready"
      );
      await refreshProjects();
      setView("list");
    } else {
      showMessage("error", result.error || "Something went wrong");
    }
    setLoading(false);
  }

  async function handleDelete(slug: string) {
    setLoading(true);
    const result = await deleteProject(slug);
    if (result.success) {
      showMessage("success", "Project deleted");
      await refreshProjects();
    } else {
      showMessage("error", result.error || "Failed to delete");
    }
    setDeleteConfirm(null);
    setLoading(false);
  }

  async function handleToggleVisibility(p: Project) {
    const newHidden = !p.hidden;
    // optimistic flip; revert on failure
    setProjects((prev) =>
      prev.map((x) => (x.slug === p.slug ? { ...x, hidden: newHidden } : x))
    );
    const result = await toggleProjectVisibility(p.slug, newHidden);
    if (!result.success) {
      setProjects((prev) =>
        prev.map((x) => (x.slug === p.slug ? { ...x, hidden: !newHidden } : x))
      );
      showMessage("error", result.error || "Failed to update visibility");
    }
  }

  async function handleLogout() {
    await logout();
    router.refresh();
  }

  const hasCover = !!(croppedCover || existingCover);
  const allCarouselPreviews = [
    ...existingImages.map((url, i) => ({
      type: "existing" as const,
      src: url,
      index: i,
    })),
    ...croppedImages.map((img, i) => ({
      type: "new" as const,
      src: img.preview,
      index: i,
    })),
  ];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowLine} />
              <span className={styles.eyebrowText}>Admin Panel</span>
            </div>
            <h1 className={styles.heading}>Project Management</h1>
          </div>
          <AdminButton
            onClick={handleLogout}
            className={styles.logoutBtn}
            effect="neutral"
          >
            Logout
          </AdminButton>
        </header>

        {/* Messages */}
        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              key={`${message.type}-${message.text}`}
              className={
                message.type === "success" ? styles.successMsg : styles.errorMsg
              }
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* List View */}
        {view === "list" && (
          <>
            <div className={styles.toolbar}>
              <span className={styles.projectCount}>
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </span>
              <AdminButton
                onClick={startAdd}
                className={styles.primaryBtn}
                effect="primary"
              >
                + Add Project
              </AdminButton>
            </div>

            <motion.div className={styles.projectList} layout>
              <AnimatePresence mode="popLayout">
              {projects.map((p) => (
                <motion.div
                  key={p.slug}
                  className={`${styles.projectRow} ${
                    p.hidden ? styles.projectRowHidden : ""
                  }`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                >
                  <div className={styles.projectRowImage}>
                    {p.coverImage ? (
                      <Image
                        src={p.coverImage}
                        alt={p.title}
                        fill
                        className={styles.projectRowImg}
                        sizes="64px"
                      />
                    ) : (
                      <div className={styles.projectRowPlaceholder}>
                        {p.title.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className={styles.projectRowInfo}>
                    <h3 className={styles.projectRowTitle}>{p.title}</h3>
                    <div className={styles.projectRowMeta}>
                      <span
                        className={
                          p.badge === "AI Lodge"
                            ? styles.badgeAI
                            : styles.badgeDAP
                        }
                      >
                        {p.badge}
                      </span>
                      <span className={styles.projectRowCategory}>
                        {p.category}
                      </span>
                      <span className={styles.projectRowStatus}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                  <div className={styles.projectRowActions}>
                    <div className={styles.visControl}>
                      <AdminToggle
                        role="switch"
                        aria-checked={!p.hidden}
                        aria-label={
                          p.hidden
                            ? `Show ${p.title} on the Projects page`
                            : `Hide ${p.title} from the Projects page`
                        }
                        onClick={() => handleToggleVisibility(p)}
                        className={styles.visToggle}
                        on={!p.hidden}
                        knobClassName={styles.visKnob}
                      />
                      <span className={styles.visLabel}>
                        {p.hidden ? "Hidden" : "Visible"}
                      </span>
                    </div>
                    <AdminButton
                      onClick={() => startEdit(p)}
                      className={styles.editBtn}
                      effect="edit"
                    >
                      Edit
                    </AdminButton>
                    {deleteConfirm === p.slug ? (
                      <div className={styles.deleteConfirm}>
                        <span className={styles.deleteConfirmText}>
                          Delete?
                        </span>
                        <AdminButton
                          onClick={() => handleDelete(p.slug)}
                          className={styles.deleteConfirmYes}
                          disabled={loading}
                          effect="delete"
                        >
                          Yes
                        </AdminButton>
                        <AdminButton
                          onClick={() => setDeleteConfirm(null)}
                          className={styles.deleteConfirmNo}
                          effect="neutral"
                        >
                          No
                        </AdminButton>
                      </div>
                    ) : (
                      <AdminButton
                        onClick={() => setDeleteConfirm(p.slug)}
                        className={styles.deleteBtn}
                        effect="delete"
                      >
                        Delete
                      </AdminButton>
                    )}
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>

              {projects.length === 0 && (
                <p className={styles.emptyText}>
                  No projects yet. Click &quot;Add Project&quot; to get started.
                </p>
              )}
            </motion.div>
          </>
        )}

        {/* Add / Edit Form */}
        {(view === "add" || view === "edit") && (
          <motion.form
            onSubmit={handleSubmit}
            className={styles.form}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.formHeader}>
              <h2 className={styles.formHeading}>
                {view === "edit" ? "Edit Project" : "Add New Project"}
              </h2>
              <AdminButton
                type="button"
                onClick={cancelForm}
                className={styles.cancelBtn}
                effect="neutral"
              >
                Cancel
              </AdminButton>
            </div>

            {/* Basic Info */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Basic Information</legend>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Title *
                  <AdminInput
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    className={styles.input}
                    required
                  />
                </label>
                <label className={styles.label}>
                  Short Description *
                  <AdminTextarea
                    name="description"
                    value={form.description}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                    className={styles.textarea}
                    rows={2}
                    required
                  />
                </label>
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.label}>
                  Badge *
                  <AdminSelect
                    name="badge"
                    value={form.badge}
                    onChange={(e) => updateField("badge", e.target.value)}
                    className={styles.select}
                  >
                    <option value="DAP">DAP</option>
                    <option value="AI Lodge">AI Lodge</option>
                  </AdminSelect>
                </label>
                <label className={styles.label}>
                  Category *
                  <AdminInput
                    type="text"
                    name="category"
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className={styles.input}
                    placeholder="e.g. NLP, Computer Vision"
                    required
                  />
                </label>
              </div>
            </fieldset>

            {/* Images */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Images</legend>

              {/* Cover Image */}
              <div className={styles.imageSection}>
                <div className={styles.imageSectionHeader}>
                  <span className={styles.imageSectionTitle}>Cover Image</span>
                  <span className={styles.imageSectionHint}>
                    16:10 ratio — used on the project card
                  </span>
                </div>
                {hasCover ? (
                  <div className={styles.coverPreview}>
                    <div className={styles.coverPreviewImage}>
                      {croppedCover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={croppedCover.preview}
                          alt="Cropped cover"
                          className={styles.coverImg}
                        />
                      ) : (
                        <Image
                          src={existingCover}
                          alt="Current cover"
                          fill
                          className={styles.coverImg}
                          sizes="400px"
                        />
                      )}
                    </div>
                    <div className={styles.coverPreviewActions}>
                      <AdminButton
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className={styles.editBtn}
                        effect="edit"
                      >
                        Replace
                      </AdminButton>
                      <AdminButton
                        type="button"
                        onClick={removeCover}
                        className={styles.deleteBtn}
                        effect="delete"
                      >
                        Remove
                      </AdminButton>
                    </div>
                  </div>
                ) : (
                  <AdminButton
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className={styles.uploadZone}
                    effect="upload"
                  >
                    <span className={styles.uploadIcon}>+</span>
                    <span className={styles.uploadText}>
                      Click to upload cover image
                    </span>
                  </AdminButton>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className={styles.hiddenInput}
                />
              </div>

              {/* Carousel Images */}
              <div className={styles.imageSection}>
                <div className={styles.imageSectionHeader}>
                  <span className={styles.imageSectionTitle}>
                    Carousel Images
                  </span>
                  <span className={styles.imageSectionHint}>
                    16:9 ratio — shown on the project detail page
                  </span>
                </div>
                {allCarouselPreviews.length > 0 && (
                  <div className={styles.carouselGrid}>
                    {allCarouselPreviews.map((item, i) => (
                      <div key={i} className={styles.carouselThumb}>
                        <div className={styles.carouselThumbInner}>
                          {item.type === "existing" ? (
                            <Image
                              src={item.src}
                              alt={`Image ${i + 1}`}
                              fill
                              className={styles.carouselThumbImg}
                              sizes="200px"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.src}
                              alt={`New image ${i + 1}`}
                              className={styles.carouselThumbImg}
                            />
                          )}
                          {item.type === "new" && (
                            <span className={styles.newBadge}>New</span>
                          )}
                        </div>
                        <AdminButton
                          type="button"
                          onClick={() =>
                            item.type === "existing"
                              ? removeExistingImage(item.index)
                              : removeCroppedImage(item.index)
                          }
                          className={styles.removeThumbBtn}
                          effect="remove"
                        >
                          ×
                        </AdminButton>
                      </div>
                    ))}
                  </div>
                )}
                <AdminButton
                  type="button"
                  onClick={() => imagesInputRef.current?.click()}
                  className={styles.uploadZone}
                  effect="upload"
                >
                  <span className={styles.uploadIcon}>+</span>
                  <span className={styles.uploadText}>
                    {allCarouselPreviews.length > 0
                      ? "Add more images"
                      : "Click to upload carousel images"}
                  </span>
                </AdminButton>
                <input
                  ref={imagesInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCarouselSelect}
                  className={styles.hiddenInput}
                />
              </div>
            </fieldset>

            {/* Details */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Project Details</legend>
              <label className={styles.label}>
                Details (markdown)
                <AdminTextarea
                  name="overview"
                  value={form.overview}
                  onChange={(e) => updateField("overview", e.target.value)}
                  className={styles.textarea}
                  rows={9}
                  placeholder="What the project is, why the team built it, and how it works. Supports **bold**, *italic*, `code`, [links](https://…), - bullet lists, and ## headings. Blank lines separate paragraphs; single newlines become line breaks."
                />
              </label>
            </fieldset>

            {/* Highlight cards */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Highlight Cards</legend>
              <p className={styles.fieldHint}>
                Customizable cards shown below the project details. Pick an icon,
                give each a heading and markdown body.
              </p>
              {cards.map((card, i) => {
                const PreviewIcon = getCardIcon(card.icon);
                return (
                  <motion.div
                    key={i}
                    className={styles.cardEditor}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className={styles.cardEditorHead}>
                      <span className={styles.cardIconPreview}>
                        <PreviewIcon size={18} strokeWidth={2.25} aria-hidden />
                      </span>
                      <AdminSelect
                        value={card.icon}
                        onChange={(e) => updateCard(i, "icon", e.target.value)}
                        className={styles.select}
                        aria-label="Card icon"
                      >
                        {CARD_ICONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </AdminSelect>
                      <AdminInput
                        type="text"
                        value={card.title}
                        onChange={(e) => updateCard(i, "title", e.target.value)}
                        placeholder="Card heading (e.g. Project Satisfaction)"
                        className={styles.input}
                      />
                      {cards.length > 1 && (
                        <AdminButton
                          type="button"
                          onClick={() => removeCard(i)}
                          className={styles.removeBtn}
                          effect="delete"
                        >
                          ×
                        </AdminButton>
                      )}
                    </div>
                    <AdminTextarea
                      value={card.body}
                      onChange={(e) => updateCard(i, "body", e.target.value)}
                      className={styles.textarea}
                      rows={3}
                      placeholder="Card text (markdown). Supports **bold**, `code`, [links](…), and - bullet lists."
                    />
                  </motion.div>
                );
              })}
              <AdminButton
                type="button"
                onClick={addCard}
                className={styles.addTeamBtn}
                effect="add"
              >
                + Add Card
              </AdminButton>
            </fieldset>

            {/* Team */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Team Members</legend>
              {team.map((member, i) => (
                <motion.div
                  key={i}
                  className={styles.teamMemberCard}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={styles.teamRow}>
                    <AdminInput
                      type="text"
                      value={member.name}
                      onChange={(e) =>
                        updateTeamMember(i, "name", e.target.value)
                      }
                      placeholder="Name"
                      className={styles.input}
                    />
                    <AdminInput
                      type="text"
                      value={member.role}
                      onChange={(e) =>
                        updateTeamMember(i, "role", e.target.value)
                      }
                      placeholder="Role"
                      className={styles.input}
                    />
                    <AdminInput
                      type="text"
                      value={member.avatar}
                      onChange={(e) =>
                        updateTeamMember(i, "avatar", e.target.value)
                      }
                      placeholder="Avatar URL (optional)"
                      className={styles.input}
                    />
                    {team.length > 1 && (
                      <AdminButton
                        type="button"
                        onClick={() => removeTeamMember(i)}
                        className={styles.removeBtn}
                        effect="delete"
                      >
                        ×
                      </AdminButton>
                    )}
                  </div>
                  <div className={styles.teamSocialRow}>
                    <AdminInput
                      type="url"
                      value={member.linkedin}
                      onChange={(e) =>
                        updateTeamMember(i, "linkedin", e.target.value)
                      }
                      placeholder="LinkedIn URL (optional)"
                      className={styles.input}
                    />
                    <AdminInput
                      type="url"
                      value={member.github}
                      onChange={(e) =>
                        updateTeamMember(i, "github", e.target.value)
                      }
                      placeholder="GitHub URL (optional)"
                      className={styles.input}
                    />
                    <AdminInput
                      type="url"
                      value={member.website}
                      onChange={(e) =>
                        updateTeamMember(i, "website", e.target.value)
                      }
                      placeholder="Website URL (optional)"
                      className={styles.input}
                    />
                  </div>
                </motion.div>
              ))}
              <AdminButton
                type="button"
                onClick={addTeamMember}
                className={styles.addTeamBtn}
                effect="add"
              >
                + Add Member
              </AdminButton>
            </fieldset>

            {/* Links & Tech */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Links & Technology</legend>
              <label className={styles.label}>
                Tech Stack (comma-separated)
                <AdminInput
                  type="text"
                  name="techStack"
                  value={form.techStack}
                  onChange={(e) => updateField("techStack", e.target.value)}
                  className={styles.input}
                  placeholder="e.g. Python, PyTorch, Next.js"
                />
              </label>
              <div className={styles.fieldRow}>
                <label className={styles.label}>
                  Live URL (deployed demo)
                  <AdminInput
                    type="url"
                    name="liveUrl"
                    value={form.liveUrl}
                    onChange={(e) => updateField("liveUrl", e.target.value)}
                    className={styles.input}
                    placeholder="https://... (shows 'Try it live')"
                  />
                </label>
                <label className={styles.label}>
                  Source Code URL
                  <AdminInput
                    type="url"
                    name="sourceUrl"
                    value={form.sourceUrl}
                    onChange={(e) => updateField("sourceUrl", e.target.value)}
                    className={styles.input}
                    placeholder="https://github.com/..."
                  />
                </label>
                <label className={styles.label}>
                  Demo URL (legacy)
                  <AdminInput
                    type="url"
                    name="demoUrl"
                    value={form.demoUrl}
                    onChange={(e) => updateField("demoUrl", e.target.value)}
                    className={styles.input}
                    placeholder="https://..."
                  />
                </label>
              </div>
            </fieldset>

            <div className={styles.formFooter}>
              <AdminButton
                type="button"
                onClick={cancelForm}
                className={styles.cancelBtn}
                effect="neutral"
              >
                Cancel
              </AdminButton>
              <AdminButton
                type="submit"
                className={styles.primaryBtn}
                disabled={loading}
                effect="primary"
              >
                {loading
                  ? "Saving..."
                  : view === "edit"
                    ? "Update Project"
                    : "Add Project"}
              </AdminButton>
            </div>
          </motion.form>
        )}
      </div>

      {/* Cropper Modal */}
      <AnimatePresence>
        {cropperState && (
          <ImageCropper
          imageSrc={cropperState.imageSrc}
          aspectRatio={cropperState.aspectRatio}
          aspectLabel={
            cropperState.type === "carousel" &&
            cropperState.pendingFiles.length > 1
              ? `${cropperState.aspectLabel} — Image ${cropperState.currentIndex + 1} of ${cropperState.pendingFiles.length}`
              : cropperState.aspectLabel
          }
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
