import React from "react";

export default function ChatMessage({ role, text }) {
  const isUser = role === "user";

  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm " +
          (isUser
            ? "bg-primary text-white"
            : "bg-white text-dark border border-slate-200")
        }
      >
        <div className="whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  );
}
