import React from "react";
import { TeamMember, Task, TimeLog, TaskStatus } from "../types";
import { Trophy, Award, Activity, ShieldCheck, Zap } from "lucide-react";

interface PointsModuleProps {
  members: TeamMember[];
  tasks: Task[];
  timeLogs: TimeLog[];
}

export default function PointsModule({ members, tasks, timeLogs }: PointsModuleProps) {
  // Sort members by points descending
  const sortedMembers = [...members].sort((a, b) => b.points - a.points);

  // Generate dynamic point history logs
  const pointHistory: {
    id: string;
    name: string;
    email: string;
    action: string;
    points: number;
    timestamp: string;
    type: "completion" | "tracking";
  }[] = [];

  // Log completed tasks (+15 pts)
  tasks
    .filter((t) => t.status === TaskStatus.DONE)
    .forEach((task) => {
      pointHistory.push({
        id: `ph-task-${task.id}`,
        name: task.assignee_name,
        email: task.assignee_email,
        action: `Menyelesaikan tugas "${task.title}"`,
        points: 15,
        timestamp: task.due_date || "2026-07-04",
        type: "completion",
      });
    });

  // Log time tracking logs (+1 pts for each 30 mins)
  timeLogs.forEach((log) => {
    const calculatedPoints = Math.max(1, Math.floor(log.duration_mins / 30));
    const memberObj = members.find((m) => m.email === log.user_email);
    pointHistory.push({
      id: `ph-log-${log.id}`,
      name: memberObj ? memberObj.name : log.user_email,
      email: log.user_email,
      action: `Mencatat durasi kerja ${log.duration_mins} menit pada tugas`,
      points: calculatedPoints,
      timestamp: log.timestamp.split("T")[0],
      type: "tracking",
    });
  });

  // Sort history by date descending
  const sortedHistory = pointHistory.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
      {/* Scoreboard List */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-1 space-y-5 flex flex-col">
        <div>
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Klasemen Poin Performa
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Skor produktivitas kumulatif anggota divisi aktif</p>
        </div>

        <div className="space-y-3.5 flex-1 overflow-y-auto">
          {sortedMembers.map((member, index) => {
            const isTop1 = index === 0;
            const isTop2 = index === 1;
            const isTop3 = index === 2;

            return (
              <div
                key={member.email}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  isTop1
                    ? "bg-amber-500/5 border-amber-300"
                    : isTop2
                    ? "bg-slate-50 border-slate-200"
                    : "bg-white border-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Position Badge */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                    isTop1
                      ? "bg-amber-500 text-white"
                      : isTop2
                      ? "bg-slate-400 text-white"
                      : isTop3
                      ? "bg-amber-700 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-800 block leading-tight">{member.name}</span>
                    <span className="text-[9px] text-gray-400 block mt-1">{member.role} • Divisi {member.division}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-mono font-black text-xs text-gray-800">{member.points} pts</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Point activity logs */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
        <div>
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Catatan Transaksi Poin
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Riwayat rincian reward points tim secara realtime</p>
        </div>

        <div className="space-y-2.5 max-h-[450px] overflow-y-auto custom-scrollbar">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-16 text-gray-300 text-xs border border-dashed border-gray-200 rounded-xl">
              Belum ada aktivitas poin yang terekam.
            </div>
          ) : (
            sortedHistory.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-800 font-bold">{item.name}</strong>
                    <span className="text-[10px] text-slate-400 font-medium">({item.email})</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1.5 leading-snug">{item.action}</p>
                  <span className="text-[9px] text-slate-400 block mt-1 font-mono">{item.timestamp}</span>
                </div>

                <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 font-bold text-[10px]">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>+{item.points} PTS</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
