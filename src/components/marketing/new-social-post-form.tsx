"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { createSocialPost } from "@/app/(dashboard)/marketing/actions";
import type { SocialPlatform, SocialPostStatus } from "@/types/marketing";
import { SocialPostMockup } from "./social-post-mockup";

export function NewSocialPostForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const tomorrow = new Date(Date.now() + 86400000);
  const initial = {
    platform: "instagram" as SocialPlatform,
    content: "",
    image_url: "",
    scheduled_at: tomorrow.toISOString().slice(0, 16),
    status: "scheduled" as SocialPostStatus,
  };
  const [form, setForm] = useState(initial);

  const submit = () => {
    startTransition(async () => {
      await createSocialPost({
        platform: form.platform,
        content: form.content,
        image_url: form.image_url || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        status: form.status,
      });
      setOpen(false);
      setForm(initial);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nouveau post
          </Button>
        }
      />
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Planifier un post</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Select
              value={form.platform}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  platform: (v ?? "instagram") as SocialPlatform,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Contenu du post..."
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <Input
              placeholder="URL image (optionnel)"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
            <div>
              <p className="mb-1 text-xs text-muted-foreground">
                Date de publication
              </p>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) =>
                  setForm({ ...form, scheduled_at: e.target.value })
                }
              />
            </div>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  status: (v ?? "scheduled") as SocialPostStatus,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="scheduled">Planifier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start justify-center">
            <SocialPostMockup
              platform={form.platform}
              content={form.content || "Votre post apparaîtra ici..."}
              imageUrl={form.image_url || null}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={pending || !form.content}>
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
