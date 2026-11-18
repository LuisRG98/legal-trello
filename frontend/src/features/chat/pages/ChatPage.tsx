import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { MessageCircle, Send } from "lucide-react";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useChatMessages,
  useSendChatMessage,
} from "../hooks/useChat";
import type { ChatRoom } from "../services/chatService";


function roleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "MANAGER":
      return "Manager";
    case "SALES":
      return "Ventas";
    default:
      return role;
  }
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}


export default function ChatPage() {
  const { user } = useAuth();
  const canAccessManagement =
    user?.role === "MANAGER" || user?.role === "ADMIN";

  const [room, setRoom] = useState<ChatRoom>("general");
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useChatMessages(room);
  const sendMessage = useSendChatMessage();

  useEffect(() => {
    if (!canAccessManagement && room === "management") {
      setRoom("general");
    }
  }, [canAccessManagement, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sendMessage.isPending) {
      return;
    }

    sendMessage.mutate(
      { room, content },
      { onSuccess: () => setDraft("") },
    );
  }

  const messages = messagesQuery.data ?? [];

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm font-medium text-blue-600">Workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Chat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Los mensajes se ocultan al cumplir 24 horas y luego se eliminan automáticamente.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
          <button
            type="button"
            onClick={() => setRoom("general")}
            aria-pressed={room === "general"}
            className={
              room === "general"
                ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                : "rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            }
          >
            General
          </button>
          {canAccessManagement && (
            <button
              type="button"
              onClick={() => setRoom("management")}
              aria-pressed={room === "management"}
              className={
                room === "management"
                  ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                  : "rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              }
            >
              Managers y admins
            </button>
          )}
        </div>

        <div
          className="h-[min(62vh,640px)] min-h-80 space-y-4 overflow-y-auto p-4 sm:p-6"
          aria-live="polite"
          aria-label="Mensajes del chat"
        >
          {messagesQuery.isLoading && (
            <p className="py-8 text-center text-sm text-slate-500">
              Cargando mensajes…
            </p>
          )}

          {messagesQuery.isError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              No se pudieron cargar los mensajes. Intenta actualizar el chat.
            </p>
          )}

          {!messagesQuery.isLoading && !messagesQuery.isError && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessageCircle size={32} className="text-slate-300" />
              <p className="mt-3 font-medium text-slate-700">Aún no hay mensajes</p>
              <p className="mt-1 text-sm text-slate-500">Inicia la conversación.</p>
            </div>
          )}

          {messages.map((message) => {
            const isOwnMessage = message.author_id === user?.id;
            return (
              <article
                key={message.id}
                className={isOwnMessage ? "ml-auto max-w-[88%]" : "mr-auto max-w-[88%]"}
              >
                <div className={
                  isOwnMessage
                    ? "rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-white"
                    : "rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-slate-800"
                }>
                  <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold">{message.author_name}</span>
                    <span className={
                      isOwnMessage
                        ? "rounded-full bg-white/15 px-2 py-0.5 text-xs text-blue-50"
                        : "rounded-full bg-white px-2 py-0.5 text-xs text-slate-600"
                    }>
                      {roleLabel(message.author_role)}
                    </span>
                    <time
                      dateTime={message.created_at}
                      className={isOwnMessage ? "ml-auto text-xs text-blue-100" : "ml-auto text-xs text-slate-500"}
                    >
                      {formatTime(message.created_at)}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {message.content}
                  </p>
                </div>
              </article>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-3 border-t border-slate-200 p-3 sm:p-4">
          <label className="sr-only" htmlFor="chat-message">
            Escribe un mensaje
          </label>
          <textarea
            id="chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Escribe un mensaje…"
            className="max-h-32 min-h-12 flex-1 resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sendMessage.isPending}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
        {sendMessage.isError && (
          <p role="alert" className="px-4 pb-4 text-sm text-red-600">
            No se pudo enviar el mensaje. Vuelve a intentarlo.
          </p>
        )}
      </div>
    </section>
  );
}
