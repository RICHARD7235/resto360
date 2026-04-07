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
import { createCampaign } from "@/app/(dashboard)/marketing/actions";
import type {
  CampaignChannel,
  CampaignStatus,
  MarketingSegment,
} from "@/types/marketing";

export function NewCampaignForm({
  segments,
}: {
  segments: MarketingSegment[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const initial = {
    name: "",
    channel: "email" as CampaignChannel,
    segment_id: segments[0]?.id ?? "",
    subject: "",
    message: "",
    status: "draft" as CampaignStatus,
    scheduled_at: "" as string,
  };
  const [form, setForm] = useState(initial);

  const submit = () => {
    startTransition(async () => {
      await createCampaign({
        name: form.name,
        channel: form.channel,
        segment_id: form.segment_id || null,
        subject: form.channel === "email" ? form.subject : null,
        message: form.message,
        status: form.status,
        scheduled_at:
          form.status === "scheduled" && form.scheduled_at
            ? new Date(form.scheduled_at).toISOString()
            : null,
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
            <Plus className="mr-2 h-4 w-4" /> Nouvelle campagne
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une campagne</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Nom de la campagne"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={form.channel}
              onValueChange={(v) =>
                setForm({ ...form, channel: (v ?? "email") as CampaignChannel })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={form.segment_id}
              onValueChange={(v) => setForm({ ...form, segment_id: v ?? "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                {segments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.estimated_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.channel === "email" && (
            <Input
              placeholder="Objet de l'email"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          )}
          <Textarea
            placeholder="Message"
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm({ ...form, status: (v ?? "draft") as CampaignStatus })
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
            {form.status === "scheduled" && (
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) =>
                  setForm({ ...form, scheduled_at: e.target.value })
                }
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !form.name || !form.message}
          >
            {pending ? "Enregistrement..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
