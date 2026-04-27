---
trigger: always_on
description: "AgentUI app platform rules — entity SDK, component structure, and available libraries"
---

# AgentUI App — AI Instructions

This repository is an **agentUI app** — a React-based application built on the agentUI platform.
Follow these rules when reading or modifying code.

## Architecture

- **pages/** — Full page components (max 100 lines each). These are the app's routes.
- **components/** — Reusable UI pieces (aim for <50 lines). Accept callbacks as props.
- **entities/** — JSON Schema files defining data models. The platform auto-generates CRUD APIs.
- **Layout.jsx** — Wraps all pages. Receives `children` and `currentPageName` props.

- **utils/** — Helper functions (optional).

## Current App Structure

- **Entities:** MovimentoContabile, Registrazione, PianoDeiConti
- **Pages:** BilancioDiVerifica, LibroGiornale, PrimaNota, PianoDeiConti, Dashboard, GuidaDeploy
- **Components:** none yet

## Entity SDK

Entities are NOT plain JSON — they have a runtime SDK. Import and use like this:

```jsx
import { Task } from "@/entities/Task";

// List & filter
Task.list("-updatedAt", 20);                        // sorted, limited
Task.filter({ status: "pending" }, "-createdAt");   // MongoDB-style query
Task.filter({ amount: { $gte: 100 } });
Task.filter({ $or: [{ status: "a" }, { status: "b" }] });

// Supported filter operators:
// $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin,
// $contains, $like, $startsWith, $endsWith, $regex, $or, $and, $exists

// CRUD
Task.create({ title: "New" });
Task.bulkCreate([{ title: "A" }, { title: "B" }]);
Task.update(id, { status: "done" });
Task.delete(id);
Task.get(id);
Task.schema();
```

**Built-in fields (auto-generated, never define these):** `id`, `createdAt`, `updatedAt`, `createdBy`

**User entity (built-in):**
```jsx
import User from "@/entities/User.js";
User.me();      // { id, email, firstName, lastName, roles, fullName, isAuthenticated }
User.update({ firstName: "John" });
User.logout();
User.login("email", "password");
User.signup({ email, password, firstName, lastName });
User.list("-createdAt", 50);   // admin/service only
```

## Data Fetching Pattern

Always use React Query — never raw useEffect for data:

```jsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Task } from "@/entities/Task";

export default function Tasks() {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => Task.list("-createdAt", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => Task.create(data),
    onSuccess: () => queryClient.invalidateQueries(["tasks"]),
  });

  // ... render
}
```

## Import Paths

| Path | Resolves to |
|------|-------------|
| `@/entities/EntityName` | Entity SDK (auto-generated CRUD) |
| `@/components/ui/*` | Shadcn UI components |
| `@/utils` | Platform utilities (`createPageUrl`, config) |
| `../components/*` | Your components (relative) |
| `../context/*` | Your context providers (relative) |

**CRITICAL:** `createPageUrl` comes from `@/utils`, NOT from your own utils folder.

## Available Libraries

| Library | Import |
|---------|--------|
| React, React Query | `react`, `@tanstack/react-query` |
| Tailwind CSS | Class names in JSX |
| Shadcn UI | `@/components/ui/button`, `@/components/ui/card`, etc. |
| Lucide icons | `lucide-react` |
| Recharts | `recharts` |
| react-router-dom | `Link`, `useNavigate` |
| moment, date-fns | Date utilities |
| lodash | Utility functions |
| react-hook-form | Form handling |
| jsPDF + autoTable | PDF generation |
| PapaParse | CSV parsing |
| react-quill | Rich text editor |
| react-markdown | Markdown rendering |
| react-leaflet | Maps |
| @hello-pangea/dnd | Drag and drop |

Run `agentui packages list` for the full current catalogue and
`agentui packages info <name>` for version + usage. That list is
authoritative — if a package appears there, it's available at runtime.

## Rules

1. **Max 100 lines per page file.** Extract sub-components if longer.
2. **Max 50 lines per component.** Keep them focused and reusable.
3. **No dynamic imports.** Use static imports only.
4. **No console.log in production code.** Remove all debugging statements.
5. **Invalidate queries after mutations.** Always call `queryClient.invalidateQueries()`.
6. **Parse numbers from inputs.** HTML inputs return strings — use `parseFloat()`/`parseInt()`.
7. **All strings should support translation.** Use a `t()` function if a LanguageContext exists.
8. **Entity name collisions.** If a page name matches an entity name, alias the import:
   ```jsx
   import { Invoice as InvoiceEntity } from "@/entities/Invoice";
   ```
9. **Nested/complex data.** Use `_json` suffix fields stored as strings:
   ```jsx
   // In entity schema: "history_json": { "type": "string", "default": "[]" }
   const history = JSON.parse(item.history_json || "[]");
   ```


## Entity Schema Format

Entities use JSON Schema. Example:

```json
{
  "name": "Task",
  "type": "object",
  "properties": {
    "title": { "type": "string", "minLength": 1 },
    "status": { "type": "string", "enum": ["pending", "in_progress", "done"], "default": "pending" },
    "priority": { "type": "string", "enum": ["low", "medium", "high"], "default": "medium" },
    "due_date": { "type": "string", "format": "date" },
    "amount": { "type": "number" },
    "is_active": { "type": "boolean", "default": true }
  },
  "required": ["title"]
}
```

**Supported types:** string, number, integer, boolean, array
**String formats:** email, date, date-time, uri
**Enums:** string with `enum` array and `default`

## Seed Data Format

`seed.json` provides sample data. Match field names to entity schemas (snake_case).
Do NOT include `id`, `createdAt`, `updatedAt`, `createdBy` — they're auto-generated.

## agentUI CLI (local editing)

This project (Contabilità Partita Doppia) can be pulled to disk, edited in your IDE or AI
assistant, and pushed back — without leaving the terminal. Source of truth
stays on the platform; the CLI syncs to/from it.

**Install:**

```bash
npm install -g @agentuiai/cli
```

Requires Node 22+.

**Log in and sync this project:**

```bash
agentui auth login                              # interactive OTP via email
agentui project list                            # find this workflow's "Project ID"
agentui project sync cmnxbbgiw0c17ry1iygmpji40 --dir .      # pulls everything you see here
```

A "project" in the CLI is a **workflow**. The id above is a workflow id —
*not* an app id.

**Edit loop:**

```bash
agentui project diff            # what changed locally since last sync
agentui validate --all          # run the platform's code validator
agentui project push --dry-run  # preview operations
agentui project push            # apply updates + creates (batched + atomic)
agentui project push --delete   # also archive components whose files were removed
```

`push` infers type from path: `components/*.jsx` → COMPONENT,
`pages/*.jsx` → PAGE, `functions/*.jsx` → FUNCTION, `Layout.jsx` at
the root → COMPONENT.

**Discovery:**

```bash
agentui skills list                 # platform skill docs (same docs the AgentUI LLM uses)
agentui skills info <name>
agentui packages list               # runtime packages you can import
agentui prompts list                # reusable prompt templates
agentui secrets list --accessible-only  # secret NAMES this workflow can read (values never returned)
```

**Deploy:**

```bash
agentui deploy --env staging --dry-run
agentui deploy --env production     # validates → batches → retries 429/503
```

**Autonomous agents:** pass `--json` on the root for machine-parseable
output on every command. Errors come back as
`{ "error": "...", "details": ... }` with exit code 1.

**Debug production issues:**

```bash
agentui logs invocations              # rich per-call records + consoleLogs (failures first, 50KB cap)
agentui logs invocations --search TypeError
agentui logs telemetry                # recurring runtime errors, sorted by frequency
```

**When to send feedback to the AgentUI support team:**

You have `agentui feedback` — use it. It creates a SkillGapReport and
emails support. The cost of sending is near zero; the value of flagging a
real blocker or missing capability compounds for every future agent.

```bash
agentui feedback "the CLI needs an entity sample-data command" --type feature_request
agentui feedback "no way to stream logs live from a function" --type harness
agentui feedback --stdin --type harness < detailed-report.txt
```

**Send feedback when:**
- You got stuck and had to abandon or work around a task because the
  platform or harness didn't expose what you needed (type: `harness`).
- You needed a CLI command, skill doc, package, or runtime API that
  doesn't exist (type: `feature_request`).
- An error message was unclear, an endpoint behaved unexpectedly, or
  documentation was wrong (type: `general`).
- The user expressed frustration about the platform (type: `frustration`).

**Don't send feedback for:**
- Your own mistakes (code that didn't compile, typos, etc.).
- Successfully-completed tasks (send it only when something was blocked
  or suboptimal).
- Every tiny preference — save it for things a maintainer should actually
  act on.

Be specific. Include what you were trying to do and what exactly blocked
or surprised you. Future you will read these reports.

**Don't:** pass an App id where a workflow id is expected; hit the HTTP API
directly; commit `.agent.json` or `.agent-manifest.json` (gitignored).

Full reference: https://www.npmjs.com/package/@agentuiai/cli

---
*Generated by AgentUI — https://agentui.ai*
