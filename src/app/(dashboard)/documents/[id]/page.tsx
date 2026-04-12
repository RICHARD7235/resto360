import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDocumentById,
  getVersions,
  getNotifications,
  getCategories,
} from "@/lib/documents/queries";
import {
  formatExpiry,
  urgencyColor,
  urgencyLabel,
} from "@/lib/documents/format";
import { requirePermission } from "@/lib/rbac";
import { VersionTimeline } from "../_components/version-timeline";
import { AddVersionDialog } from "../_components/add-version-dialog";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { restaurantId } = await requirePermission("m12_documents", "read");

  const doc = await getDocumentById(id, restaurantId);
  if (!doc) notFound();

  const [versions, notifications, categories] = await Promise.all([
    getVersions(id, restaurantId),
    getNotifications(id, restaurantId),
    getCategories(),
  ]);

  const category = categories.find((c) => c.id === doc.category_id);
  const currentVersion = versions.find((v) => v.id === doc.current_version_id);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/documents/bibliotheque" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la bibliothèque
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={urgencyColor(doc.urgency_level)}>
              {urgencyLabel(doc.urgency_level)}
            </Badge>
            {currentVersion && (
              <Badge variant="outline">v{currentVersion.version_number}</Badge>
            )}
            {category && <Badge variant="outline">{category.label}</Badge>}
          </div>
          {doc.description && (
            <p className="max-w-2xl text-muted-foreground">{doc.description}</p>
          )}
        </div>
        <AddVersionDialog documentId={doc.id} />
      </div>

      <Tabs defaultValue="metadata">
        <TabsList>
          <TabsTrigger value="metadata">Métadonnées</TabsTrigger>
          <TabsTrigger value="versions">
            Versions ({versions.length})
          </TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications ({notifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metadata" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Catégorie</dt>
                  <dd className="font-medium">{category?.label ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Référence</dt>
                  <dd className="font-medium">
                    {doc.reference_number ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Émetteur</dt>
                  <dd className="font-medium">{doc.issuer ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Date d&apos;émission</dt>
                  <dd className="font-medium">{formatExpiry(doc.issued_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Date d&apos;échéance</dt>
                  <dd className="font-medium">
                    {formatExpiry(doc.expires_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Jours restants</dt>
                  <dd className="font-medium">
                    {doc.days_until_expiry === null
                      ? "—"
                      : `${doc.days_until_expiry} j`}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4 pt-4">
          <VersionTimeline
            versions={versions}
            currentVersionId={doc.current_version_id}
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 pt-4">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune notification envoyée.
            </p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <Card key={n.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{n.notification_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {n.channel}
                        </span>
                      </div>
                      {n.payload &&
                        typeof (n.payload as { subject?: string }).subject ===
                          "string" && (
                          <div className="text-sm font-medium">
                            {(n.payload as { subject: string }).subject}
                          </div>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {n.sent_at
                        ? `Envoyée ${new Date(n.sent_at).toLocaleString("fr-FR")}`
                        : n.scheduled_for
                          ? `Planifiée ${new Date(n.scheduled_for).toLocaleString("fr-FR")}`
                          : "—"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
