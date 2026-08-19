// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

type ShareButtonsProps = {
  url: string;
  title: string;
};

export const ShareButtons = ({ url, title }: ShareButtonsProps) => {
  const encodedUrl = encodeURIComponent(url);

  const shareLinks = [
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z" />
        </svg>
      ),
    },
  ];

  const handleShare = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-neutral-500">Chia sẻ:</span>
      {shareLinks.map((platform) => (
        <button
          key={platform.name}
          type="button"
          onClick={() => handleShare(platform.href)}
          aria-label={`Chia sẻ "${title}" lên ${platform.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
        >
          {platform.icon}
        </button>
      ))}
    </div>
  );
};
