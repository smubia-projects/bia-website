import Image from "next/image";
import { Linkedin, Mail, Send } from "lucide-react";
import type { Profile } from "@/app/lib/db/schema";
import styles from "./public.module.css";

const telegramHref = (t: string) => (/^https?:\/\//i.test(t) ? t : `https://t.me/${t.replace(/^@/, "")}`);

/** DAP group members or mentors: photo (or initial), name and optional contact links. */
export default function PeopleList({
  people,
  compact = false,
  onDark = false,
  label,
}: {
  people: Profile[];
  /** One wrapping line of small chips (session boxes) instead of a list */
  compact?: boolean;
  onDark?: boolean;
  /** Accessible name for the list, e.g. "Group 2 members" */
  label?: string;
}) {
  if (people.length === 0) return null;
  return (
    <ul className={`${compact ? styles.peopleCompact : styles.people} ${onDark ? styles.peopleOnDark : ""}`} aria-label={label}>
      {people.map((p, i) => {
        const links = [
          p.linkedin && { href: p.linkedin, label: "LinkedIn", Icon: Linkedin },
          p.email && { href: `mailto:${p.email}`, label: "Email", Icon: Mail },
          p.telegram && { href: telegramHref(p.telegram), label: "Telegram", Icon: Send },
        ].filter(Boolean) as { href: string; label: string; Icon: typeof Mail }[];
        return (
          <li key={`${p.name}-${i}`} className={styles.person}>
            <span className={styles.personAvatar}>
              {p.image ? <Image src={p.image} alt="" fill sizes="40px" style={{ objectFit: "cover" }} /> : p.name.charAt(0)}
            </span>
            <span className={styles.personName}>{p.name}</span>
            {!compact && links.length > 0 && (
              <span className={styles.personLinks}>
                {links.map(({ href, label: l, Icon }) => (
                  <a key={l} href={href} target={l === "Email" ? undefined : "_blank"} rel="noopener noreferrer" aria-label={`${p.name} on ${l}`}>
                    <Icon size={15} strokeWidth={2} aria-hidden />
                  </a>
                ))}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
