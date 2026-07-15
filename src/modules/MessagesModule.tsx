import React, { useState, useEffect, useRef } from "react";
import { Project, ChatMessage, TeamMember } from "../types";
import { Send, MessageSquare, Clock, RefreshCw, Sparkles } from "lucide-react";

interface MessagesModuleProps {
  activeProject: Project | null;
  chats: ChatMessage[];
  userMember: TeamMember | null;
  onSendMessage: (msg: ChatMessage) => void;
  onRefresh: () => void;
}

export default function MessagesModule({
  activeProject,
  chats,
  userMember,
  onSendMessage,
  onRefresh
}: MessagesModuleProps) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isPolling, setIsPolling] = useState(true);

  const projectChats = chats.filter((c) => c.project_id === activeProject?.id);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [projectChats]);

  // Auto refresh every 5 seconds to simulate real-time chat sync
  useEffect(() => {
    let interval: any = null;
    if (isPolling && activeProject) {
      interval = setInterval(() => {
        onRefresh();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isPolling, activeProject, onRefresh]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeProject || !userMember) return;

    const newChat: ChatMessage = {
      id: "c-" + Math.random().toString(36).substr(2, 9),
      project_id: activeProject.id,
      sender_name: userMember.name,
      sender_email: userMember.email,
      message: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    onSendMessage(newChat);
    setInputText("");
  };

  if (!activeProject) {
    return (
      <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl text-center max-w-xl mx-auto space-y-3 mt-12">
        <MessageSquare className="w-12 h-12 text-slate-400 mx-auto" />
        <h4 className="font-bold text-gray-800">Proyek Aktif Belum Dipilih</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          Silakan buka modul **Projects** terlebih dahulu dan pilih salah satu proyek aktif untuk mulai berdiskusi dengan tim secara real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white border border-gray-150 rounded-2xl shadow-sm h-[70vh] flex flex-col overflow-hidden">
      {/* Header Discussion Room */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm text-white">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs tracking-tight text-white">Chat Proyek: {activeProject.name}</h4>
            <p className="text-[10px] text-slate-300 mt-0.5">Kolaborasi Divisi {activeProject.division}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Polling toggle */}
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`text-[9px] px-2 py-1 rounded-full font-bold border transition-all duration-150 cursor-pointer ${
              isPolling
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
          >
            {isPolling ? "● Auto Sync" : "Sync Mati"}
          </button>
          
          <button
            onClick={onRefresh}
            className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-lg hover:text-white cursor-pointer transition-colors"
            title="Segarkan Chat"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Feed body */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50 custom-scrollbar">
        {projectChats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-300" />
            <div>
              <p className="text-xs font-bold text-slate-400">Papan Diskusi Kosong</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                Belum ada percakapan. Kirim pesan pertama untuk menyapa tim divisi Anda!
              </p>
            </div>
          </div>
        ) : (
          projectChats.map((c) => {
            const isMe = c.sender_email.toLowerCase() === userMember?.email?.toLowerCase();
            return (
              <div
                key={c.id}
                className={`flex flex-col max-w-[70%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                {/* Sender Metadata */}
                <span className="text-[10px] text-gray-400 font-semibold mb-1 block px-1">
                  {c.sender_name} • <span className="font-mono text-[9px]">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>

                {/* Message Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white border border-gray-100 text-slate-800 rounded-tl-none"
                  }`}
                >
                  {c.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Message input panel footer */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-150 flex gap-2.5 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Tulis pesan Anda untuk tim divisi ${activeProject.division}...`}
          className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold p-3.5 rounded-xl cursor-pointer shadow-md shadow-indigo-600/10 transition-colors"
        >
          <Send className="w-4 h-4 shrink-0" />
        </button>
      </form>
    </div>
  );
}
