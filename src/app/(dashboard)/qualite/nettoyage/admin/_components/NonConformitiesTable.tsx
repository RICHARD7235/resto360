"use client";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PinPad } from "../../_components/PinPad";
import { closeNcAction } from "../../../actions";
import type { QhsNonConformity } from "@/lib/supabase/qhs/types";

const graviteColors: Record<number, string> = {
  1: "bg-yellow-200 text-yellow-900",
  2: "bg-orange-200 text-orange-900",
  3: "bg-red-200 text-red-900",
};

export function NonConformitiesTable({ ncs }: { ncs: QhsNonConformity[] }) {
  const [closing, setClosing] = useState<QhsNonConformity | null>(null);
  const [action, setAction] = useState("");
  const [pin, setPin] = useState("");

  const submit = async () => {
    if (!closing) return;
    const fd = new FormData();
    fd.set("ncId", closing.id);
    fd.set("pin", pin);
    fd.set("action_corrective", action);
    const r = await closeNcAction(fd);
    if (r.ok) {
      toast.success("Non-conformité clôturée");
      setClosing(null);
      setAction("");
      setPin("");
    } else {
      toast.error(r.error);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Gravité</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ncs.map((nc) => (
            <TableRow key={nc.id}>
              <TableCell>{nc.date_constat.slice(0, 10)}</TableCell>
              <TableCell>{nc.description}</TableCell>
              <TableCell>
                <Badge className={graviteColors[nc.gravite]}>
                  G{nc.gravite}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={nc.statut === "cloturee" ? "outline" : "destructive"}
                >
                  {nc.statut}
                </Badge>
              </TableCell>
              <TableCell>
                {nc.statut !== "cloturee" && (
                  <Button size="sm" onClick={() => setClosing(nc)}>
                    Clôturer
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!closing} onOpenChange={(o) => !o && setClosing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôturer la non-conformité</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Action corrective réalisée"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Code PIN responsable :
          </p>
          <PinPad onComplete={setPin} />
          <Button onClick={submit} disabled={!action || pin.length < 4}>
            Confirmer la clôture
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
