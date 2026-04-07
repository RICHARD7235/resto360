import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, ThumbsUp } from "lucide-react";
import type { MarketingSocialPost } from "@/types/marketing";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function SocialCalendar({
  posts,
}: {
  posts: MarketingSocialPost[];
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (first.getDay() + 6) % 7; // Monday = 0

  const postsByDay = new Map<number, MarketingSocialPost[]>();
  for (const p of posts) {
    const d = new Date(p.scheduled_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!postsByDay.has(day)) postsByDay.set(day, []);
      postsByDay.get(day)!.push(p);
    }
  }

  const cells: Array<{ day: number | null; posts: MarketingSocialPost[] }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, posts: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, posts: postsByDay.get(d) ?? [] });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, posts: [] });

  const todayDay = now.getDate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Calendrier éditorial — {MONTHS[month]} {year}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            const isToday = cell.day === todayDay;
            return (
              <div
                key={i}
                className={`min-h-[72px] rounded-md border p-1 text-left text-xs ${
                  cell.day === null
                    ? "border-transparent"
                    : isToday
                      ? "border-[#E85D26] bg-orange-50/50"
                      : "bg-card"
                }`}
              >
                {cell.day !== null && (
                  <>
                    <div
                      className={`mb-1 text-[11px] font-semibold ${
                        isToday ? "text-[#E85D26]" : "text-muted-foreground"
                      }`}
                    >
                      {cell.day}
                    </div>
                    <div className="space-y-0.5">
                      {cell.posts.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] ${
                            p.platform === "instagram"
                              ? "bg-pink-50 text-pink-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                          title={p.content}
                        >
                          {p.platform === "instagram" ? (
                            <Camera className="h-2.5 w-2.5 shrink-0" />
                          ) : (
                            <ThumbsUp className="h-2.5 w-2.5 shrink-0" />
                          )}
                          <span className="truncate">{p.content}</span>
                        </div>
                      ))}
                      {cell.posts.length > 3 && (
                        <div className="text-[9px] text-muted-foreground">
                          +{cell.posts.length - 3} autre
                          {cell.posts.length - 3 > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
