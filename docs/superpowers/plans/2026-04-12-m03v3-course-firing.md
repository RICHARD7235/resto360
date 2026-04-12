# M03 V3 — Course Firing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Hold & Fire course sequencing so the kitchen only sees the current service (entrées → plats → desserts), with the server controlling the pace from the dining room.

**Architecture:** Add `course_number` to `order_items` and `preparation_tickets`, plus `fired_at` on tickets. Tickets with `fired_at IS NULL` are HOLD (invisible to kitchen). A new `fireNextCourse` server action lets the server fire the next service. Auto-fire is an optional client-side timer based on `restaurants.auto_fire_delay_minutes`.

**Tech Stack:** Next.js 16 (App Router), Supabase (PostgreSQL + Realtime), React 19, TypeScript strict, shadcn/ui, Zustand

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/app/(dashboard)/commandes/actions.ts` | Add `fireNextCourse`, modify `createOrder` (course_number on items), modify `getPreparationTickets` (filter fired_at), modify `updatePreparationTicketStatus` (course-aware aggregation) |
| Modify | `src/lib/preparation-tickets.ts` | `createPreparationTickets` now accepts course map, creates per-station-per-course tickets with `fired_at` |
| Modify | `src/app/(dashboard)/commandes/page.tsx` | Fire button UI, course progress indicators, auto-fire timer |
| Modify | `src/components/modules/commandes/order-summary.tsx` | Group items by course, show course status indicators |
| Modify | `src/components/modules/commandes/kitchen-ticket.tsx` | Add course badge on ticket header |
| Create | `supabase/migrations/20260412_m03v3_course_firing.sql` | Migration file for repo tracking |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260412_m03v3_course_firing.sql`

The migration for `menu_categories.default_course` is already applied on Supabase. This task applies the remaining migrations.

- [ ] **Step 1: Apply migration on Supabase via MCP**

Run these SQL statements via `mcp__1e6e2ae8-8acf-4185-aa8b-689fda7dd9bc__execute_sql` (project_id: `vymwkwziytcetjlvtbcc`):

```sql
-- 1. order_items.course_number
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS course_number int NOT NULL DEFAULT 1;

-- 2. preparation_tickets: drop old unique, add course_number + fired_at
ALTER TABLE preparation_tickets
  DROP CONSTRAINT IF EXISTS preparation_tickets_order_id_station_id_key;

ALTER TABLE preparation_tickets
  ADD COLUMN IF NOT EXISTS course_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fired_at timestamptz;

ALTER TABLE preparation_tickets
  ADD CONSTRAINT preparation_tickets_order_station_course_key
    UNIQUE (order_id, station_id, course_number);

-- 3. Backfill: mark all existing tickets as fired (they were created pre-coursing)
UPDATE preparation_tickets SET fired_at = created_at WHERE fired_at IS NULL;

-- 4. Auto-fire setting on restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS auto_fire_delay_minutes int DEFAULT NULL;

-- 5. Index for fired_at filtering
CREATE INDEX IF NOT EXISTS idx_preparation_tickets_fired
  ON preparation_tickets(fired_at) WHERE fired_at IS NOT NULL;
```

- [ ] **Step 2: Verify migration**

Run via MCP:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'preparation_tickets'
  AND column_name IN ('course_number', 'fired_at')
ORDER BY column_name;
```

Expected: 2 rows — `course_number` (integer, NO), `fired_at` (timestamp with time zone, YES).

- [ ] **Step 3: Create migration file for repo tracking**

Write the SQL to `supabase/migrations/20260412_m03v3_course_firing.sql` with all statements from Step 1.

- [ ] **Step 4: Regenerate TypeScript types**

Run via MCP `generate_typescript_types` for project `vymwkwziytcetjlvtbcc`. Parse the JSON result and write to `src/types/database.types.ts`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260412_m03v3_course_firing.sql src/types/database.types.ts
git commit -m "chore(m03v3): migration course_number + fired_at on tickets, auto_fire on restaurants"
```

---

### Task 2: Update `preparation-tickets.ts` — Course-Aware Ticket Creation

**Files:**
- Modify: `src/lib/preparation-tickets.ts`

The key change: `createPreparationTickets` now receives a `courseMap` (item_id → course_number), groups items by (station, course), and sets `fired_at` only on course 0 and the min course > 0.

- [ ] **Step 1: Update `createPreparationTickets` signature and logic**

In `src/lib/preparation-tickets.ts`, replace the entire `createPreparationTickets` function (lines 90-154) with:

```typescript
/**
 * Creates preparation tickets for an order by splitting items by station AND course.
 * Tickets for course 0 and the lowest non-zero course are FIRED immediately.
 * Higher courses are HOLD (fired_at = null).
 */
export async function createPreparationTickets(
  orderId: string,
  items: { order_item_id: string; product_id: string | null; course_number: number }[],
  restaurantId: string
): Promise<void> {
  const supabase = await createClient();

  // Resolve stations
  const productIds = items.map((i) => i.product_id);
  const stationMap = await resolveStationsForProducts(productIds);

  // Group items by (station, course)
  const groups = new Map<string, { orderItemIds: string[]; course: number; stationId: string }>();
  const unassigned: { order_item_id: string; course_number: number }[] = [];

  for (const item of items) {
    const stationId = item.product_id ? stationMap.get(item.product_id) ?? null : null;
    if (stationId) {
      const key = `${stationId}::${item.course_number}`;
      const group = groups.get(key) ?? { orderItemIds: [], course: item.course_number, stationId };
      group.orderItemIds.push(item.order_item_id);
      groups.set(key, group);
    } else {
      unassigned.push(item);
    }
  }

  // Assign unassigned items to default station
  if (unassigned.length > 0) {
    const defaultStationId = await getDefaultStation(supabase, restaurantId);
    if (defaultStationId) {
      for (const item of unassigned) {
        const key = `${defaultStationId}::${item.course_number}`;
        const group = groups.get(key) ?? { orderItemIds: [], course: item.course_number, stationId: defaultStationId };
        group.orderItemIds.push(item.order_item_id);
        groups.set(key, group);
      }
    } else {
      console.warn(`[KDS] No default station for restaurant ${restaurantId}. ${unassigned.length} items unrouted.`);
    }
  }

  // Determine which courses to fire immediately
  const allCourses = [...new Set([...groups.values()].map((g) => g.course))];
  const nonZeroCourses = allCourses.filter((c) => c > 0);
  const minNonZero = nonZeroCourses.length > 0 ? Math.min(...nonZeroCourses) : null;

  const now = new Date().toISOString();

  // Create tickets and link items
  for (const group of groups.values()) {
    const shouldFire = group.course === 0 || group.course === minNonZero;

    const { data: ticket, error: ticketError } = await supabase
      .from("preparation_tickets")
      .insert({
        order_id: orderId,
        station_id: group.stationId,
        status: "pending",
        course_number: group.course,
        fired_at: shouldFire ? now : null,
      })
      .select()
      .single();

    if (ticketError) {
      throw new Error(`Erreur creation ticket: ${ticketError.message}`);
    }

    const { error: linkError } = await supabase
      .from("order_items")
      .update({ preparation_ticket_id: ticket.id })
      .in("id", group.orderItemIds);

    if (linkError) {
      throw new Error(`Erreur liaison items au ticket: ${linkError.message}`);
    }
  }
}
```

- [ ] **Step 2: Update `addItemsToPreparationTickets` signature**

In the same file, update `addItemsToPreparationTickets` (lines 159-250). The items parameter now includes `course_number`. Replace the function:

```typescript
/**
 * Adds items to existing preparation tickets or creates new ones.
 * Respects course grouping — items join tickets matching (station, course).
 */
export async function addItemsToPreparationTickets(
  orderId: string,
  items: { order_item_id: string; product_id: string | null; course_number: number }[],
  restaurantId: string
): Promise<void> {
  const supabase = await createClient();

  // Resolve stations
  const productIds = items.map((i) => i.product_id);
  const stationMap = await resolveStationsForProducts(productIds);

  // Get existing tickets for this order
  const { data: existingTickets } = await supabase
    .from("preparation_tickets")
    .select("id, station_id, status, course_number")
    .eq("order_id", orderId);

  const ticketByKey = new Map<string, { id: string; status: string }>();
  for (const t of existingTickets ?? []) {
    const key = `${t.station_id}::${t.course_number ?? 1}`;
    ticketByKey.set(key, { id: t.id, status: t.status ?? "pending" });
  }

  // Group items by (station, course)
  const groups = new Map<string, { orderItemIds: string[]; course: number; stationId: string }>();
  const unassigned: { order_item_id: string; course_number: number }[] = [];

  for (const item of items) {
    const stationId = item.product_id ? stationMap.get(item.product_id) ?? null : null;
    if (stationId) {
      const key = `${stationId}::${item.course_number}`;
      const group = groups.get(key) ?? { orderItemIds: [], course: item.course_number, stationId };
      group.orderItemIds.push(item.order_item_id);
      groups.set(key, group);
    } else {
      unassigned.push(item);
    }
  }

  if (unassigned.length > 0) {
    const defaultStationId = await getDefaultStation(supabase, restaurantId);
    if (defaultStationId) {
      for (const item of unassigned) {
        const key = `${defaultStationId}::${item.course_number}`;
        const group = groups.get(key) ?? { orderItemIds: [], course: item.course_number, stationId: defaultStationId };
        group.orderItemIds.push(item.order_item_id);
        groups.set(key, group);
      }
    } else {
      console.warn(`[KDS] No default station for restaurant ${restaurantId}. ${unassigned.length} items unrouted.`);
    }
  }

  // For each group, use existing ticket or create new
  for (const group of groups.values()) {
    const key = `${group.stationId}::${group.course}`;
    const existing = ticketByKey.get(key);

    let ticketId: string;

    if (existing && existing.status !== "served") {
      ticketId = existing.id;
      if (existing.status === "ready") {
        await supabase
          .from("preparation_tickets")
          .update({ status: "in_progress", ready_at: null })
          .eq("id", ticketId);
      }
    } else {
      // Determine if this new ticket should be fired
      // Check if any existing ticket for this order has this course fired
      const firedForCourse = (existingTickets ?? []).some(
        (t) => (t.course_number ?? 1) === group.course && t.status !== "served"
      );
      const shouldFire = group.course === 0 || firedForCourse;

      const { data: ticket, error } = await supabase
        .from("preparation_tickets")
        .insert({
          order_id: orderId,
          station_id: group.stationId,
          status: "pending",
          course_number: group.course,
          fired_at: shouldFire ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erreur creation ticket: ${error.message}`);
      }
      ticketId = ticket.id;
    }

    const { error: linkError } = await supabase
      .from("order_items")
      .update({ preparation_ticket_id: ticketId })
      .in("id", group.orderItemIds);

    if (linkError) {
      throw new Error(`Erreur liaison items: ${linkError.message}`);
    }
  }
}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: 0 errors. The `createPreparationTickets` callers in `actions.ts` will need updating in the next task, but TypeScript may not error if the extra `course_number` field on items is optional. If it does error, that's expected — proceed to Task 3.

- [ ] **Step 4: Commit**

```bash
git add src/lib/preparation-tickets.ts
git commit -m "feat(m03v3): course-aware ticket creation with fired_at hold/fire logic"
```

---

### Task 3: Update `actions.ts` — Course Resolution + `fireNextCourse`

**Files:**
- Modify: `src/app/(dashboard)/commandes/actions.ts`

Four changes: (1) `createOrder` resolves course_number per item, (2) `getPreparationTickets` filters on `fired_at IS NOT NULL`, (3) `updatePreparationTicketStatus` uses course-aware aggregation, (4) new `fireNextCourse` action.

- [ ] **Step 1: Add course resolution helper**

After the `getTodayDateString` helper (around line 28), add:

```typescript
// ---------------------------------------------------------------------------
// Course resolution
// ---------------------------------------------------------------------------

const COURSE_LABELS: Record<number, string> = {
  0: "Immediat",
  1: "Entrees",
  2: "Plats",
  3: "Desserts",
};

export function getCourseLabel(course: number): string {
  return COURSE_LABELS[course] ?? `Service ${course}`;
}

/**
 * Resolves course_number for each item based on product → category → default_course.
 * For takeaway/delivery, all items are course 0 (no sequencing).
 */
async function resolveCourseNumbers(
  productIds: (string | null)[],
  orderType: OrderType
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  // Takeaway/delivery: everything is course 0
  if (orderType === "takeaway" || orderType === "delivery") {
    for (const id of productIds) {
      if (id) result.set(id, 0);
    }
    return result;
  }

  const uniqueIds = [...new Set(productIds.filter((id): id is string => id !== null))];
  if (uniqueIds.length === 0) return result;

  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, category_id")
    .in("id", uniqueIds);

  if (!products) return result;

  const categoryIds = products
    .map((p) => p.category_id)
    .filter((id): id is string => id !== null)
    .filter((id, i, arr) => arr.indexOf(id) === i);

  const courseByCategory = new Map<string, number>();
  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("menu_categories")
      .select("id, default_course")
      .in("id", categoryIds);

    for (const cat of categories ?? []) {
      courseByCategory.set(cat.id, cat.default_course ?? 1);
    }
  }

  for (const product of products) {
    const course = product.category_id
      ? courseByCategory.get(product.category_id) ?? 1
      : 1;
    result.set(product.id, course);
  }

  return result;
}
```

- [ ] **Step 2: Update `createOrder` to pass course_number to items and tickets**

In `createOrder` (around line 766-804), replace the item insertion and ticket creation blocks:

Find:
```typescript
  // Insert order items
  // Menu headers have synthetic product_ids (not real UUIDs) — set to null
  const itemsToInsert = data.items.map((item) => ({
    order_id: order.id,
    product_id: item.is_menu_header ? null : item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    notes: item.notes ?? null,
    status: "pending" as const,
    menu_id: item.real_menu_id ?? null,
    menu_name: item.menu_name ?? null,
  }));
```

Replace with:
```typescript
  // Resolve course numbers for all products
  const productIds = data.items.map((item) => item.is_menu_header ? null : item.product_id);
  const courseMap = await resolveCourseNumbers(productIds, orderType);

  // Insert order items with course_number
  // Menu headers have synthetic product_ids (not real UUIDs) — set to null
  const itemsToInsert = data.items.map((item) => ({
    order_id: order.id,
    product_id: item.is_menu_header ? null : item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    notes: item.notes ?? null,
    status: "pending" as const,
    menu_id: item.real_menu_id ?? null,
    menu_name: item.menu_name ?? null,
    course_number: item.is_menu_header ? 0 : (courseMap.get(item.product_id) ?? 1),
  }));
```

Then find the ticket creation block:
```typescript
  const itemsForTickets = (orderItems ?? [])
    .filter((item) => item.product_id !== null)
    .map((item) => ({
      order_item_id: item.id,
      product_id: item.product_id,
    }));
```

Replace with:
```typescript
  const itemsForTickets = (orderItems ?? [])
    .filter((item) => item.product_id !== null)
    .map((item) => ({
      order_item_id: item.id,
      product_id: item.product_id,
      course_number: item.course_number ?? 1,
    }));
```

- [ ] **Step 3: Update `getPreparationTickets` to filter on fired_at and include course_number**

In `getPreparationTickets` (around line 562-567), add `.not("fired_at", "is", null)` to the ticket query:

Find:
```typescript
  let ticketQuery = supabase
    .from("preparation_tickets")
    .select("*")
    .in("order_id", orderIds)
    .in("status", ["pending", "in_progress", "ready"])
    .order("created_at", { ascending: true });
```

Replace with:
```typescript
  let ticketQuery = supabase
    .from("preparation_tickets")
    .select("*")
    .in("order_id", orderIds)
    .in("status", ["pending", "in_progress", "ready"])
    .not("fired_at", "is", null)
    .order("course_number", { ascending: true })
    .order("created_at", { ascending: true });
```

Then update the return mapping (around line 600-626) to include `course_number`:

Find:
```typescript
      id: ticket.id,
      order_id: ticket.order_id,
      station_id: ticket.station_id,
      station_name: station?.name ?? "Inconnu",
      station_color: station?.color ?? "#6B7280",
      status: ticket.status ?? "pending",
      started_at: ticket.started_at,
      ready_at: ticket.ready_at,
      created_at: ticket.created_at ?? new Date().toISOString(),
```

Replace with:
```typescript
      id: ticket.id,
      order_id: ticket.order_id,
      station_id: ticket.station_id,
      station_name: station?.name ?? "Inconnu",
      station_color: station?.color ?? "#6B7280",
      status: ticket.status ?? "pending",
      started_at: ticket.started_at,
      ready_at: ticket.ready_at,
      created_at: ticket.created_at ?? new Date().toISOString(),
      course_number: ticket.course_number ?? 1,
```

Also update the `PreparationTicketWithItems` interface (around line 125) to include `course_number`:

Find:
```typescript
export interface PreparationTicketWithItems {
  id: string;
  order_id: string;
  station_id: string;
  station_name: string;
  station_color: string;
  status: string;
  started_at: string | null;
  ready_at: string | null;
  created_at: string;
  table_number: string | null;
```

Replace with:
```typescript
export interface PreparationTicketWithItems {
  id: string;
  order_id: string;
  station_id: string;
  station_name: string;
  station_color: string;
  status: string;
  started_at: string | null;
  ready_at: string | null;
  created_at: string;
  course_number: number;
  table_number: string | null;
```

- [ ] **Step 4: Update `updatePreparationTicketStatus` for course-aware aggregation**

In `updatePreparationTicketStatus` (around line 663-681), replace the aggregation logic:

Find:
```typescript
  const { data: allTickets } = await supabase
    .from("preparation_tickets")
    .select("status")
    .eq("order_id", ticket.order_id);

  if (!allTickets || allTickets.length === 0) return;

  const statuses = allTickets.map((t) => t.status ?? "pending");

  let orderStatus: OrderStatus;
  if (statuses.every((s) => s === "served")) {
    orderStatus = "served";
  } else if (statuses.every((s) => s === "ready" || s === "served")) {
    orderStatus = "ready";
  } else if (statuses.some((s) => s === "in_progress")) {
    orderStatus = "preparing";
  } else {
    orderStatus = "sent";
  }
```

Replace with:
```typescript
  const { data: allTickets } = await supabase
    .from("preparation_tickets")
    .select("status, fired_at")
    .eq("order_id", ticket.order_id);

  if (!allTickets || allTickets.length === 0) return;

  const firedTickets = allTickets.filter((t) => t.fired_at !== null);
  const holdTickets = allTickets.filter((t) => t.fired_at === null);
  const firedStatuses = firedTickets.map((t) => t.status ?? "pending");

  let orderStatus: OrderStatus;
  if (firedStatuses.every((s) => s === "served") && holdTickets.length === 0) {
    // All tickets (fired + none held) are served → order fully served
    orderStatus = "served";
  } else if (firedStatuses.every((s) => s === "ready" || s === "served")) {
    // All fired tickets ready/served → current service is ready
    orderStatus = "ready";
  } else if (firedStatuses.some((s) => s === "in_progress")) {
    orderStatus = "preparing";
  } else {
    orderStatus = "sent";
  }
```

- [ ] **Step 5: Add `fireNextCourse` server action**

Add this new action after `updatePreparationTicketStatus` (before the `// Mutations` section):

```typescript
// ---------------------------------------------------------------------------
// Course firing
// ---------------------------------------------------------------------------

export async function fireNextCourse(orderId: string): Promise<{ firedCourse: number } | null> {
  const { restaurantId, role } = await getUserContext();
  const supabase = await createClient();

  // RBAC: only salle roles can fire
  if (!["owner", "admin", "manager", "staff"].includes(role)) {
    throw new Error("Seule la salle peut envoyer le service suivant.");
  }

  // Verify order belongs to restaurant
  const { data: order } = await supabase
    .from("orders")
    .select("id, restaurant_id")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!order) {
    throw new Error("Commande non trouvee.");
  }

  // Find the smallest held course
  const { data: heldTickets } = await supabase
    .from("preparation_tickets")
    .select("id, course_number")
    .eq("order_id", orderId)
    .is("fired_at", null)
    .order("course_number", { ascending: true });

  if (!heldTickets || heldTickets.length === 0) {
    return null; // Nothing to fire
  }

  const nextCourse = heldTickets[0].course_number ?? 1;
  const ticketsToFire = heldTickets.filter((t) => (t.course_number ?? 1) === nextCourse);

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("preparation_tickets")
    .update({ fired_at: now })
    .in("id", ticketsToFire.map((t) => t.id));

  if (error) {
    throw new Error(`Erreur envoi service: ${error.message}`);
  }

  return { firedCourse: nextCourse };
}

export async function getOrderCourseStatus(orderId: string): Promise<{
  courses: { course_number: number; label: string; status: "hold" | "fired" | "ready" | "served"; ticketCount: number }[];
  nextFireableCourse: number | null;
}> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("preparation_tickets")
    .select("course_number, status, fired_at")
    .eq("order_id", orderId);

  if (!tickets || tickets.length === 0) {
    return { courses: [], nextFireableCourse: null };
  }

  // Group by course
  const byCourse = new Map<number, typeof tickets>();
  for (const t of tickets) {
    const c = t.course_number ?? 1;
    const arr = byCourse.get(c) ?? [];
    arr.push(t);
    byCourse.set(c, arr);
  }

  const courses = [...byCourse.entries()]
    .sort(([a], [b]) => a - b)
    .map(([courseNum, courseTickets]) => {
      const allFired = courseTickets.every((t) => t.fired_at !== null);
      const statuses = courseTickets.map((t) => t.status ?? "pending");

      let status: "hold" | "fired" | "ready" | "served";
      if (!allFired) {
        status = "hold";
      } else if (statuses.every((s) => s === "served")) {
        status = "served";
      } else if (statuses.every((s) => s === "ready" || s === "served")) {
        status = "ready";
      } else {
        status = "fired";
      }

      return {
        course_number: courseNum,
        label: getCourseLabel(courseNum),
        status,
        ticketCount: courseTickets.length,
      };
    });

  // Next fireable = smallest held course, but only if all fired courses are ready/served
  const firedCourses = courses.filter((c) => c.status !== "hold");
  const allFiredDone = firedCourses.every((c) => c.status === "ready" || c.status === "served");
  const heldCourses = courses.filter((c) => c.status === "hold");
  const nextFireableCourse = allFiredDone && heldCourses.length > 0
    ? heldCourses[0].course_number
    : null;

  return { courses, nextFireableCourse };
}
```

- [ ] **Step 6: Build check**

```bash
npm run build
```

Expected: 0 errors (or minor type issues from the generated types needing `course_number` — if so, the types were already regenerated in Task 1).

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/commandes/actions.ts
git commit -m "feat(m03v3): course resolution, fireNextCourse action, course-aware KDS filtering"
```

---

### Task 4: Update `kitchen-ticket.tsx` — Course Badge

**Files:**
- Modify: `src/components/modules/commandes/kitchen-ticket.tsx`

Add a course badge in the ticket header.

- [ ] **Step 1: Add `course_number` to `TicketData` interface**

In `src/components/modules/commandes/kitchen-ticket.tsx`, find (around line 29):

```typescript
export interface TicketData {
  id: string;
  order_id: string;
  station_id: string;
  station_name: string;
  station_color: string;
  status: string;
  created_at: string;
  table_number: string | null;
  order_notes: string | null;
  order_type?: string;
```

Replace with:

```typescript
export interface TicketData {
  id: string;
  order_id: string;
  station_id: string;
  station_name: string;
  station_color: string;
  status: string;
  created_at: string;
  course_number?: number;
  table_number: string | null;
  order_notes: string | null;
  order_type?: string;
```

- [ ] **Step 2: Add course badge in the header**

Find the `CardAction` section with the station badge and elapsed timer (around the `<CardAction>` in the component). Add a course badge right after the station badge. Find:

```typescript
            {showStationBadge && (
              <Badge
                className="text-xs font-semibold text-white border border-white/30"
                style={{ backgroundColor: ticket.station_color }}
              >
                {ticket.station_name}
```

Add immediately after the closing of the station badge block (after `</Badge>`), but still inside the `<div className="flex items-center gap-2">`:

```typescript
            {ticket.course_number != null && ticket.course_number > 0 && (
              <Badge variant="outline" className="text-xs border-white/30 text-white">
                Service {ticket.course_number}
              </Badge>
            )}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/modules/commandes/kitchen-ticket.tsx
git commit -m "feat(m03v3): add course badge on kitchen tickets"
```

---

### Task 5: Update `order-summary.tsx` — Group Items by Course

**Files:**
- Modify: `src/components/modules/commandes/order-summary.tsx`

Group items by course with visual indicators (fired/ready/hold).

- [ ] **Step 1: Add `course_number` to item type and add course props**

In `src/components/modules/commandes/order-summary.tsx`, update `OrderSummaryItem`:

Find:
```typescript
interface OrderSummaryItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  status: string;
  payment_id?: string | null;
}
```

Replace with:
```typescript
interface OrderSummaryItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  status: string;
  payment_id?: string | null;
  course_number?: number;
}
```

Add to `OrderSummaryProps.order`:

Find:
```typescript
    items: OrderSummaryItem[];
  };
  onViewDetail: () => void;
```

Replace with:
```typescript
    items: OrderSummaryItem[];
    courses?: { course_number: number; label: string; status: "hold" | "fired" | "ready" | "served" }[];
  };
  onViewDetail: () => void;
```

Add a new prop for firing:

Find:
```typescript
  onOpenPayment?: (orderId: string) => void;
}
```

Replace with:
```typescript
  onOpenPayment?: (orderId: string) => void;
  onFireNextCourse?: (orderId: string) => void;
  nextFireableCourse?: number | null;
}
```

- [ ] **Step 2: Add course label map and update component**

Add at the top of the file (after the existing imports):

```typescript
import { Flame, Pause } from "lucide-react";
```

Then update the component to destructure the new props. Find:

```typescript
export function OrderSummary({
  order,
  onViewDetail,
  onCancelItem,
  onCancelOrder,
  onOpenPayment,
}: OrderSummaryProps) {
```

Replace with:

```typescript
const COURSE_LABELS: Record<number, string> = {
  0: "Immediat",
  1: "Entrees",
  2: "Plats",
  3: "Desserts",
};

export function OrderSummary({
  order,
  onViewDetail,
  onCancelItem,
  onCancelOrder,
  onOpenPayment,
  onFireNextCourse,
  nextFireableCourse,
}: OrderSummaryProps) {
```

- [ ] **Step 3: Add course grouping in the items list**

Replace the items rendering section (the `<ul>` block, around lines 154-201) with a course-grouped version:

Find:
```typescript
        <ul className="space-y-0.5 text-xs">
          {order.items.slice(0, 6).map((item) => {
```

Replace the entire `<ul>...</ul>` block (through the closing `</ul>`) with:

```typescript
        <div className="space-y-2 text-xs">
          {(() => {
            const courses = order.courses ?? [];
            const hasCourses = courses.length > 1;

            if (!hasCourses) {
              // No coursing — flat list (backward compat)
              return (
                <ul className="space-y-0.5">
                  {order.items.slice(0, 6).map((item) => {
                    const isCancelled = item.status === "cancelled";
                    const isPaid = !!item.payment_id;
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between gap-1",
                          isCancelled && "opacity-40 line-through"
                        )}
                      >
                        <span className="flex items-center gap-1 min-w-0">
                          <span className="truncate">
                            {item.quantity}x {item.product_name}
                          </span>
                          {isPaid && !isCancelled && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                              Paye
                            </Badge>
                          )}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="text-muted-foreground">
                            {(item.quantity * item.unit_price).toFixed(2)} EUR
                          </span>
                          {onCancelItem && !isCancelled && canCancel && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 min-h-0 min-w-0 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCancelItem(item.id, item.product_name);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </span>
                      </li>
                    );
                  })}
                  {order.items.length > 6 && (
                    <li className="text-muted-foreground italic">
                      +{order.items.length - 6} autre{order.items.length - 6 > 1 ? "s" : ""}
                    </li>
                  )}
                </ul>
              );
            }

            // Course-grouped rendering
            return courses.map((course) => {
              const courseItems = order.items.filter(
                (i) => (i.course_number ?? 1) === course.course_number
              );
              if (courseItems.length === 0) return null;

              const statusIcon =
                course.status === "ready" ? "🟢" :
                course.status === "served" ? "✅" :
                course.status === "fired" ? "🟡" :
                "⏸️";

              return (
                <div
                  key={course.course_number}
                  className={cn(course.status === "hold" && "opacity-50")}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
                    <span>{statusIcon}</span>
                    <span>{course.label}</span>
                  </div>
                  <ul className="space-y-0.5 pl-4">
                    {courseItems.map((item) => {
                      const isCancelled = item.status === "cancelled";
                      return (
                        <li
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between gap-1",
                            isCancelled && "opacity-40 line-through"
                          )}
                        >
                          <span className="truncate">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <span className="text-muted-foreground">
                              {(item.quantity * item.unit_price).toFixed(2)} EUR
                            </span>
                            {onCancelItem && !isCancelled && canCancel && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 min-h-0 min-w-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancelItem(item.id, item.product_name);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            });
          })()}
        </div>
```

- [ ] **Step 4: Add fire button in action buttons**

In the action buttons section, add the fire button before the payment button. Find:

```typescript
        <div className="flex gap-2 pt-1">
          {canPay && onOpenPayment && (
```

Replace with:

```typescript
        <div className="flex gap-2 pt-1">
          {onFireNextCourse && nextFireableCourse != null && (
            <Button
              className="min-h-11 flex-1 gap-2 bg-orange-500 hover:bg-orange-600"
              onClick={(e) => {
                e.stopPropagation();
                onFireNextCourse(order.id);
              }}
            >
              <Flame className="h-4 w-4" />
              Envoyer {COURSE_LABELS[nextFireableCourse] ?? `Service ${nextFireableCourse}`}
            </Button>
          )}
          {canPay && onOpenPayment && (
```

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/modules/commandes/order-summary.tsx
git commit -m "feat(m03v3): course-grouped items + fire button in order summary"
```

---

### Task 6: Update `page.tsx` — Wire Fire Button + Auto-Fire Timer

**Files:**
- Modify: `src/app/(dashboard)/commandes/page.tsx`

Wire the `fireNextCourse` action, fetch course status per selected order, and add the auto-fire timer.

- [ ] **Step 1: Import new actions**

Add to the imports from `./actions`:

Find:
```typescript
  getRestaurantId,
  cancelOrderItem,
  cancelOrder,
  getRestaurantTables,
  type RestaurantTable,
} from "./actions";
```

Replace with:
```typescript
  getRestaurantId,
  cancelOrderItem,
  cancelOrder,
  getRestaurantTables,
  fireNextCourse,
  getOrderCourseStatus,
  type RestaurantTable,
} from "./actions";
```

- [ ] **Step 2: Add course status state and fetching**

After the existing state declarations (around where `restaurantId` and `restaurantTables` are declared), add:

```typescript
  const [courseStatus, setCourseStatus] = useState<{
    courses: { course_number: number; label: string; status: "hold" | "fired" | "ready" | "served" }[];
    nextFireableCourse: number | null;
  } | null>(null);
```

Add a `useEffect` to fetch course status when `selectedTable` changes (after the existing `useEffect`s). Find a good spot after the realtime subscriptions:

```typescript
  // Fetch course status for selected order
  useEffect(() => {
    if (!selectedTable) {
      setCourseStatus(null);
      return;
    }
    const selectedOrder = orders.find((o) => o.table_number === selectedTable);
    if (!selectedOrder) {
      setCourseStatus(null);
      return;
    }
    getOrderCourseStatus(selectedOrder.id).then(setCourseStatus).catch(() => setCourseStatus(null));
  }, [selectedTable, orders]);
```

- [ ] **Step 3: Add fire handler**

Near the other handlers (`handleCancelItem`, `handleCancelOrder`, etc.), add:

```typescript
  const handleFireNextCourse = useCallback(async (orderId: string) => {
    try {
      const result = await fireNextCourse(orderId);
      if (result) {
        toast.success(`Service ${result.firedCourse} envoyé en cuisine !`);
        await fetchData();
      } else {
        toast.info("Tous les services ont déjà été envoyés.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur envoi service");
    }
  }, [fetchData]);
```

- [ ] **Step 4: Pass props to OrderSummary**

Find the `<OrderSummary` component usage and add the new props. Find:

```typescript
                onCancelOrder={handleCancelOrder}
                onOpenPayment={handleOpenPayment}
```

Add after `onOpenPayment`:

```typescript
                onFireNextCourse={handleFireNextCourse}
                nextFireableCourse={courseStatus?.nextFireableCourse ?? null}
```

Also, in the `order` prop passed to `OrderSummary`, add `courses`. Find where `items:` is mapped and add after it:

```typescript
                  courses: courseStatus?.courses,
```

Make sure to also pass `course_number` in the items mapping. Find the items map for OrderSummary and add `course_number`:

```typescript
                    course_number: item.course_number ?? 1,
```

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/commandes/page.tsx
git commit -m "feat(m03v3): wire fire button + course status in salle page"
```

---

### Task 7: Final Build + Integration Test

**Files:** None new — this is a verification task.

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: 0 errors, all 47+ routes compiled.

- [ ] **Step 2: Manual verification checklist**

Open the app and verify:
1. Create a dine-in order with items from Entrées + Plats + Desserts → only Entrées tickets visible in KDS
2. KDS tickets show "Service 1" badge
3. Salle page shows course progress (🟡 Entrées / ⏸️ Plats / ⏸️ Desserts)
4. Mark all Entrées items ready in KDS → course status shows 🟢
5. Click "Envoyer les Plats" → Plats tickets appear in KDS
6. Create a takeaway order → all items visible immediately (no coursing)
7. Boissons are always visible immediately regardless of course

- [ ] **Step 3: Push and verify Vercel deploy**

```bash
git push origin main
```

Check Vercel deployment status via GitHub API.

- [ ] **Step 4: Update Knowledge Graph**

Add observation to KG entity:
```
[2026-04-12] M03 V3 Course Firing implémenté — Hold & Fire / envoi par service.
Entrées→Plats→Desserts séquencés, boissons immédiates, takeaway sans coursing.
```
