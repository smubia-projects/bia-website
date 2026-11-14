import { notFound } from "next/navigation";
import { shortDate, sgtDay } from "@/app/lib/cms/bot-text";
import { todaySgt } from "@/app/lib/cms/people";
import { adminWho, getTimeline, listMembers, listProjectGroups } from "@/app/lib/cms/tracker";
import { nextMeetingBy } from "@/app/lib/cms/tracker-view";
import GroupTracker from "../../../../_run/GroupTracker";
import { loadRun } from "../../../../_run/load";

export default async function TrackerGroupPage(props: { params: Promise<{ run: string; group: string }> }) {
  const params = await props.params;
  const { actor, cohort } = await loadRun("DAP", params.run);
  const id = Number(params.group);
  if (!Number.isInteger(id)) notFound();
  const group = (await listProjectGroups(actor, cohort.id)).find((g) => g.id === id);
  if (!group) notFound();
  const who = adminWho(actor);
  const [members, milestones] = await Promise.all([listMembers(who, id), getTimeline(who, id)]);
  const today = todaySgt();
  // Dates are formatted here because the client component must not import server code.
  const day = (iso: string | null) => (iso ? shortDate(iso, today) : "");
  return (
    <GroupTracker
      key={`${group.id}-${group.lastMeetingAt}-${members.length}-${milestones.length}`}
      cohortId={cohort.id}
      cohortSlug={cohort.slug}
      today={today}
      group={{
        id: group.id,
        number: group.number,
        name: group.name,
        mentors: group.mentors,
        chatId: group.telegramChatId,
        remindersOn: group.meetingRemindersOn,
        lastMeeting: group.lastMeetingAt ? day(sgtDay(group.lastMeetingAt)) : "None logged",
        nextBy: day(nextMeetingBy(group)),
      }}
      members={members.map((m) => ({ id: m.id, name: m.name }))}
      milestones={milestones.map((m) => ({
        id: m.id,
        title: m.title,
        notes: m.notes,
        status: m.status,
        startsOn: m.startsOn,
        dueOn: m.dueOn,
        dates: m.startsOn ? `${day(m.startsOn)} to ${day(m.dueOn)}` : `Due ${day(m.dueOn)}`,
        overdue: m.status !== "done" && m.dueOn < today,
        subtasks: m.subtasks.map((s) => ({ id: s.id, title: s.title, status: s.status, dueOn: s.dueOn, assigneeId: s.assigneeId })),
        blockers: m.blockers.map((b) => ({ id: b.id, description: b.description, status: b.status })),
      }))}
    />
  );
}
