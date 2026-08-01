import { NextResponse } from "next/server";
import { getAllHabitLogs, getUserHabits } from "@/lib/data";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const habits = await getUserHabits(user.id);
  const logs = await getAllHabitLogs(habits.map((h) => h.id));

  const payload = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
    },
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      kind: h.kind,
      weeklyTarget: h.weeklyTarget,
      scheduleDays: h.scheduleDays,
      sortOrder: h.sortOrder,
      createdAt: h.createdAt,
    })),
    logs: logs.map((l) => ({
      habitId: l.habitId,
      logDate: l.logDate,
      completed: l.completed,
      createdAt: l.createdAt,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="habit-dock-export.json"`,
    },
  });
}
