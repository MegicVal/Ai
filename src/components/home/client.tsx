"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

/** Plays the clip only while it is on screen; poster and video are downloaded as it approaches. */
export function LazyVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nearby = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        video.poster = poster;
        nearby.disconnect();
      },
      { rootMargin: "800px" },
    );
    nearby.observe(video);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !still) {
          if (!video.src) video.src = src;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => {
      nearby.disconnect();
      observer.disconnect();
    };
  }, [src, poster]);

  return (
    <figure className="relative">
      <video
        ref={ref}
        className="aspect-video w-full bg-coal object-cover"
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
      />
      <figcaption className="label absolute top-3 left-3 bg-ink/80 px-2 py-1 text-paper">{label}</figcaption>
    </figure>
  );
}

export function NewsletterForm({ placeholder, cta, demo }: { placeholder: string; cta: string; demo: string }) {
  const [sent, setSent] = useState(false);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSent(true);
  };
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          {placeholder}
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          placeholder={placeholder}
          className="min-h-[46px] min-w-0 flex-1 basis-60 rounded-xs border border-ink bg-white px-4 placeholder:text-ink-2"
        />
        <button type="submit" className="btn btn-solid">
          {cta}
        </button>
      </div>
      <p role="status" className="min-h-5 text-sm text-ink-2">
        {sent ? demo : ""}
      </p>
    </form>
  );
}
