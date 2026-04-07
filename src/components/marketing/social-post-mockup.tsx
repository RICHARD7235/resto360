import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ThumbsUp, Share2 } from "lucide-react";
import type { SocialPlatform } from "@/types/marketing";

export function SocialPostMockup({
  platform,
  content,
  imageUrl,
}: {
  platform: SocialPlatform;
  content: string;
  imageUrl: string | null;
}) {
  if (platform === "instagram") {
    return (
      <div className="w-full max-w-[320px] overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[10px] font-bold">
                LCF
              </div>
            </div>
            <span className="text-xs font-semibold">lacabanequifume</span>
          </div>
          <MoreHorizontal className="h-4 w-4" />
        </div>
        <div className="aspect-square w-full bg-gradient-to-br from-orange-100 to-amber-200">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">
              🔥
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Heart className="h-5 w-5" />
              <MessageCircle className="h-5 w-5" />
              <Send className="h-5 w-5" />
            </div>
            <Bookmark className="h-5 w-5" />
          </div>
          <p className="mt-2 text-xs">
            <span className="font-semibold">lacabanequifume</span>{" "}
            <span className="whitespace-pre-wrap text-slate-700">{content}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[340px] overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="flex items-center gap-2 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          LCF
        </div>
        <div>
          <p className="text-sm font-semibold">La Cabane qui Fume</p>
          <p className="text-[10px] text-muted-foreground">
            Publication · Saint-Saturnin
          </p>
        </div>
      </div>
      <p className="whitespace-pre-wrap px-3 pb-3 text-sm text-slate-800">
        {content}
      </p>
      {imageUrl ? (
        <div className="aspect-video w-full bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video w-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-4xl">
          🍖
        </div>
      )}
      <div className="flex items-center justify-around border-t p-2 text-xs text-muted-foreground">
        <button className="flex items-center gap-1">
          <ThumbsUp className="h-4 w-4" /> J&apos;aime
        </button>
        <button className="flex items-center gap-1">
          <MessageCircle className="h-4 w-4" /> Commenter
        </button>
        <button className="flex items-center gap-1">
          <Share2 className="h-4 w-4" /> Partager
        </button>
      </div>
    </div>
  );
}
