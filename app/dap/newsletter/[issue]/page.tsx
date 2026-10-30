import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "@/app/components/ui/Markdown";
import ui from "@/app/components/cms/public.module.css";
import { formatIssueDate, getPublicIssue, issuePath } from "@/app/lib/cms/newsletter";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

interface Props {
  params: { issue: string };
}

export async function generateMetadata({ params }: Props) {
  const data = await getPublicIssue(params.issue);
  if (!data) return { title: "Issue not found | SMUBIA" };
  return {
    title: `${data.issue.title} | This week in DAP`,
    description: data.issue.summary,
    openGraph: data.issue.coverImage ? { images: [data.issue.coverImage] } : undefined,
  };
}

export default async function IssuePage({ params }: Props) {
  const data = await getPublicIssue(params.issue);
  if (!data) notFound();
  const { issue, siblings, sessions } = data;
  const session = sessions.find((s) => s.week === issue.week);
  const next = sessions.find((s) => s.week === issue.week + 1);
  const index = siblings.findIndex((s) => s.id === issue.id);
  const prev = siblings[index - 1];
  const after = siblings[index + 1];

  return (
    <main id="main-content" className={ui.page}>
      <article className={ui.issue}>
        <Link href="/dap/newsletter" className={ui.pill}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All issues
        </Link>
        <div className={ui.issueEyebrow}>
          This week in DAP · Week {issue.week}
          {issue.publishedAt ? ` · ${formatIssueDate(issue.publishedAt)}` : ""}
        </div>
        <h1 className={ui.issueH1}>{issue.title}</h1>
        {issue.summary && <p className={ui.issueSummary}>{issue.summary}</p>}

        {session?.topic && (
          <div className={ui.sessionBox}>
            <div className={ui.sessionBoxText}>
              <span className={ui.sessionBoxLabel}>This week&apos;s co-learning</span>
              <span className={ui.sessionBoxTopic}>{session.topic}</span>
              {session.group && <span className={ui.sessionBoxGroup}>Taught by {session.group}</span>}
            </div>
            {session.slides && (
              <a className={`${ui.pill} ${ui.pillOnDark}`} href={session.slides} target="_blank" rel="noopener noreferrer">
                Slides and notebook
              </a>
            )}
          </div>
        )}

        <div className={ui.prose}>
          {issue.blocks.map((b) => {
            if (b.type === "Image") {
              if (!b.image) return null;
              return (
                <figure key={b.id} className={ui.figure}>
                  {b.heading && <h2 className={ui.proseHeading}>{b.heading}</h2>}
                  <div className={ui.figureImg}>
                    <Image src={b.image} alt={b.body || b.heading || ""} fill sizes="(max-width: 800px) 100vw, 712px" style={{ objectFit: "cover" }} />
                  </div>
                  {b.body && <figcaption>{b.body}</figcaption>}
                </figure>
              );
            }
            if (!b.body.trim()) return null;
            return (
              <section key={b.id}>
                {b.heading && <h2 className={ui.proseHeading}>{b.heading}</h2>}
                <Markdown content={b.body} />
              </section>
            );
          })}
        </div>

        {next?.topic && (
          <div className={ui.comingUp}>
            <span className={ui.label} style={{ fontSize: 11 }}>
              Coming up
            </span>
            <div style={{ marginTop: 6, fontWeight: 600, color: "var(--ink)" }}>
              Week {next.week}: {next.topic}
            </div>
            {next.group && (
              <div className={ui.muted} style={{ fontSize: 14 }}>
                Taught by {next.group}
              </div>
            )}
          </div>
        )}

        {(prev || after) && (
          <nav aria-label="Issues" className={ui.issueNav}>
            {prev ? (
              <Link className={ui.pill} href={issuePath(prev.cohortSlug, prev.week)}>
                ← Week {prev.week}
              </Link>
            ) : (
              <span />
            )}
            {after && (
              <Link className={ui.pill} href={issuePath(after.cohortSlug, after.week)}>
                Week {after.week} →
              </Link>
            )}
          </nav>
        )}
      </article>
    </main>
  );
}
