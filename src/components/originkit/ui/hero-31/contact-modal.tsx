"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useContactModal } from "./contact-modal-context";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactModal() {
  const { isOpen, prefillEmail, closeModal } = useContactModal();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Mỗi lần modal mở lại, nạp sẵn email đã gõ trong hero (nếu có) và
  // reset trạng thái submit — tránh còn dính "Đã gửi thành công" từ
  // lần mở trước.
  useEffect(() => {
    if (isOpen) {
      setEmail(prefillEmail);
      setStatus("idle");
    }
  }, [isOpen, prefillEmail]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!response.ok) throw new Error("failed");

      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      onClick={closeModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 text-neutral-900 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Get in Touch</h2>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Đóng"
            className="text-neutral-400 transition hover:text-neutral-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div className="mt-6 text-center">
            <p className="text-neutral-700">
              Đã gửi thành công! Mình sẽ phản hồi sớm nhất có thể.
            </p>
            <button
              type="button"
              onClick={closeModal}
              className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
            >
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên của bạn"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email của bạn"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
            />
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Bạn muốn nhắn gì?"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
            />

            {status === "error" && (
              <p className="text-sm text-red-600">Gửi thất bại, bạn thử lại nhé.</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="mt-1 rounded-md bg-[#00ddff] px-4 py-2.5 text-sm font-semibold text-[#0b1432] transition hover:opacity-90 disabled:opacity-50"
            >
              {status === "submitting" ? "Đang gửi..." : "Gửi tin nhắn"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
