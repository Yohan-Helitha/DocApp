import React, { useEffect, useRef, useState } from "react";

export default function ChatComposer({
  disabled,
  placeholder = "Describe your symptoms…",
  onSend,
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus?.();
  }, [disabled]);

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <div className="flex items-end gap-3">
        <textarea
          ref={inputRef}
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-dark outline-none focus:border-primary"
          rows={2}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          className={
            "shrink-0 rounded-xl px-5 py-2 text-sm font-bold transition-colors " +
            (disabled
              ? "bg-slate-200 text-slate-400"
              : "bg-primary text-white hover:opacity-95")
          }
          disabled={disabled}
          onClick={send}
        >
          Send
        </button>
      </div>
      <div className="mt-2 text-[11px] text-slate-500">
        Press Enter to send, Shift+Enter for a new line.
      </div>
    </div>
  );
}
