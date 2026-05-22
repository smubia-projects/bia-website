"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  logout,
  addProject,
  updateProject,
  deleteProject,
  fetchProjects,
} from "./actions";
import { Project } from "@/app/Projects/data/types";
import ImageCropper from "./ImageCropper";
import styles from "./Admin.module.css";

interface Props {
  initialProjects: Project[];
}

type View = "list" | "add" | "edit";

interface TeamMember {
  name: string;
  role: string;
  avatar: string;
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
  rationale: "",
  satisfaction: "",
  takeaway: "",
  status: "Completed" as "Completed" | "Ongoing",
  techStack: "",
  demoUrl: "",
  sourceUrl: "",
};

export default function AdminClient({ initialProjects }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [view, setView] = useState<View>("list");
  const [editSlug, setEditSlug] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [team, setTeam] = useState<TeamMember[]>([]);
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
    setTeam([{ name: "", role: "", avatar: "" }]);
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
      overview: project.overview,
      rationale: project.rationale,
      satisfaction: project.lessons.satisfaction,
      takeaway: project.lessons.takeaway,
      status: project.status,
      techStack: project.techStack.join(", "),
      demoUrl: project.demoUrl || "",
      sourceUrl: project.sourceUrl || "",
    });
    setTeam(
      project.team.length > 0
        ? project.team.map((t) => ({ ...t }))
        : [{ name: "", role: "", avatar: "" }]
    );
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
    setTeam((prev) => [...prev, { name: "", role: "", avatar: "" }]);
  }

  function removeTeamMember(idx: number) {
    setTeam((prev) => prev.filter((_, i) => i !== idx));
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
        view === "edit" ? "Project updated" : "Project added"
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
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </header>

        {/* Messages */}
        {message && (
          <div
            className={
              message.type === "success" ? styles.successMsg : styles.errorMsg
            }
          >
            {message.text}
          </div>
        )}

        {/* List View */}
        {view === "list" && (
          <>
            <div className={styles.toolbar}>
              <span className={styles.projectCount}>
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </span>
              <button onClick={startAdd} className={styles.primaryBtn}>
                + Add Project
              </button>
            </div>

            <div className={styles.projectList}>
              {projects.map((p) => (
                <div key={p.slug} className={styles.projectRow}>
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
                    <button
                      onClick={() => startEdit(p)}
                      className={styles.editBtn}
                    >
                      Edit
                    </button>
                    {deleteConfirm === p.slug ? (
                      <div className={styles.deleteConfirm}>
                        <span className={styles.deleteConfirmText}>
                          Delete?
                        </span>
                        <button
                          onClick={() => handleDelete(p.slug)}
                          className={styles.deleteConfirmYes}
                          disabled={loading}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className={styles.deleteConfirmNo}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(p.slug)}
                        className={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {projects.length === 0 && (
                <p className={styles.emptyText}>
                  No projects yet. Click &quot;Add Project&quot; to get started.
                </p>
              )}
            </div>
          </>
        )}

        {/* Add / Edit Form */}
        {(view === "add" || view === "edit") && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formHeader}>
              <h2 className={styles.formHeading}>
                {view === "edit" ? "Edit Project" : "Add New Project"}
              </h2>
              <button
                type="button"
                onClick={cancelForm}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>

            {/* Basic Info */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Basic Information</legend>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Title *
                  <input
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
                  <textarea
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
                  <select
                    name="badge"
                    value={form.badge}
                    onChange={(e) => updateField("badge", e.target.value)}
                    className={styles.select}
                  >
                    <option value="DAP">DAP</option>
                    <option value="AI Lodge">AI Lodge</option>
                  </select>
                </label>
                <label className={styles.label}>
                  Category *
                  <input
                    type="text"
                    name="category"
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className={styles.input}
                    placeholder="e.g. NLP, Computer Vision"
                    required
                  />
                </label>
                <label className={styles.label}>
                  Status
                  <select
                    name="status"
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                    className={styles.select}
                  >
                    <option value="Completed">Completed</option>
                    <option value="Ongoing">Ongoing</option>
                  </select>
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
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className={styles.editBtn}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={removeCover}
                        className={styles.deleteBtn}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className={styles.uploadZone}
                  >
                    <span className={styles.uploadIcon}>+</span>
                    <span className={styles.uploadText}>
                      Click to upload cover image
                    </span>
                  </button>
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
                        <button
                          type="button"
                          onClick={() =>
                            item.type === "existing"
                              ? removeExistingImage(item.index)
                              : removeCroppedImage(item.index)
                          }
                          className={styles.removeThumbBtn}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => imagesInputRef.current?.click()}
                  className={styles.uploadZone}
                >
                  <span className={styles.uploadIcon}>+</span>
                  <span className={styles.uploadText}>
                    {allCarouselPreviews.length > 0
                      ? "Add more images"
                      : "Click to upload carousel images"}
                  </span>
                </button>
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
                Overview
                <textarea
                  name="overview"
                  value={form.overview}
                  onChange={(e) => updateField("overview", e.target.value)}
                  className={styles.textarea}
                  rows={4}
                />
              </label>
              <label className={styles.label}>
                Rationale
                <textarea
                  name="rationale"
                  value={form.rationale}
                  onChange={(e) => updateField("rationale", e.target.value)}
                  className={styles.textarea}
                  rows={4}
                />
              </label>
            </fieldset>

            {/* Lessons */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Lessons Learned</legend>
              <label className={styles.label}>
                Project Satisfaction
                <textarea
                  name="satisfaction"
                  value={form.satisfaction}
                  onChange={(e) =>
                    updateField("satisfaction", e.target.value)
                  }
                  className={styles.textarea}
                  rows={3}
                />
              </label>
              <label className={styles.label}>
                Key Takeaway
                <textarea
                  name="takeaway"
                  value={form.takeaway}
                  onChange={(e) => updateField("takeaway", e.target.value)}
                  className={styles.textarea}
                  rows={3}
                />
              </label>
            </fieldset>

            {/* Team */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Team Members</legend>
              {team.map((member, i) => (
                <div key={i} className={styles.teamRow}>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) =>
                      updateTeamMember(i, "name", e.target.value)
                    }
                    placeholder="Name"
                    className={styles.input}
                  />
                  <input
                    type="text"
                    value={member.role}
                    onChange={(e) =>
                      updateTeamMember(i, "role", e.target.value)
                    }
                    placeholder="Role"
                    className={styles.input}
                  />
                  <input
                    type="text"
                    value={member.avatar}
                    onChange={(e) =>
                      updateTeamMember(i, "avatar", e.target.value)
                    }
                    placeholder="Avatar URL (optional)"
                    className={styles.input}
                  />
                  {team.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTeamMember(i)}
                      className={styles.removeBtn}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addTeamMember}
                className={styles.addTeamBtn}
              >
                + Add Member
              </button>
            </fieldset>

            {/* Links & Tech */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Links & Technology</legend>
              <label className={styles.label}>
                Tech Stack (comma-separated)
                <input
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
                  Demo URL
                  <input
                    type="url"
                    name="demoUrl"
                    value={form.demoUrl}
                    onChange={(e) => updateField("demoUrl", e.target.value)}
                    className={styles.input}
                    placeholder="https://..."
                  />
                </label>
                <label className={styles.label}>
                  Source Code URL
                  <input
                    type="url"
                    name="sourceUrl"
                    value={form.sourceUrl}
                    onChange={(e) => updateField("sourceUrl", e.target.value)}
                    className={styles.input}
                    placeholder="https://github.com/..."
                  />
                </label>
              </div>
            </fieldset>

            <div className={styles.formFooter}>
              <button
                type="button"
                onClick={cancelForm}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : view === "edit"
                    ? "Update Project"
                    : "Add Project"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Cropper Modal */}
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
    </main>
  );
}
