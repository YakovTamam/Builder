import { describe, expect, it } from "vitest";
import {
  buildAccessibleProjectFilter,
  projectListFilter,
  resolveProjectAccess,
  resolveTaskPermission,
  WORKER_ROLE,
} from "./access";
import type { SessionPayload } from "./auth";

function session(role: string, overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    sub: "user-1",
    name: "Test",
    email: "t@example.com",
    role,
    companyId: "company-1",
    ...overrides,
  };
}

describe("projectListFilter", () => {
  it("always scopes to the session's company", () => {
    for (const role of ["super_admin", "company_admin", "project_manager", WORKER_ROLE, "consultant", "client"]) {
      expect(projectListFilter(session(role)).companyId).toBe("company-1");
    }
  });

  it("narrows project managers to their own projects", () => {
    expect(projectListFilter(session("project_manager"))).toEqual({
      companyId: "company-1",
      managerId: "user-1",
    });
  });

  it("does not add a managerId filter for other roles", () => {
    expect(projectListFilter(session("company_admin"))).toEqual({ companyId: "company-1" });
    expect(projectListFilter(session(WORKER_ROLE))).toEqual({ companyId: "company-1" });
  });
});

describe("buildAccessibleProjectFilter", () => {
  it("restricts field workers to the given project ids", () => {
    expect(buildAccessibleProjectFilter(session(WORKER_ROLE), ["p1", "p2"])).toEqual({
      companyId: "company-1",
      _id: { $in: ["p1", "p2"] },
    });
  });

  it("gives a worker with no assigned projects an empty set (sees nothing)", () => {
    expect(buildAccessibleProjectFilter(session(WORKER_ROLE), [])).toEqual({
      companyId: "company-1",
      _id: { $in: [] },
    });
  });

  it("ignores the worker id list for non-worker roles", () => {
    expect(buildAccessibleProjectFilter(session("company_admin"), ["p1"])).toEqual({
      companyId: "company-1",
    });
    expect(buildAccessibleProjectFilter(session("project_manager"), ["p1"])).toEqual({
      companyId: "company-1",
      managerId: "user-1",
    });
  });
});

describe("resolveProjectAccess", () => {
  it("grants admins and read-only roles", () => {
    for (const role of ["super_admin", "company_admin", "consultant", "client"]) {
      expect(resolveProjectAccess(session(role), { managerId: "someone-else" })).toBe("ok");
    }
  });

  it("grants a project manager only their own project", () => {
    expect(resolveProjectAccess(session("project_manager"), { managerId: "user-1" })).toBe("ok");
    expect(resolveProjectAccess(session("project_manager"), { managerId: "user-2" })).toBe("denied");
    expect(resolveProjectAccess(session("project_manager"), { managerId: undefined })).toBe("denied");
  });

  it("defers field workers to a task-assignment check", () => {
    expect(resolveProjectAccess(session(WORKER_ROLE), { managerId: "user-1" })).toBe("needs_task_check");
  });

  it("treats ObjectId-like managerId values via String()", () => {
    const managerId = { toString: () => "user-1" };
    expect(resolveProjectAccess(session("project_manager"), { managerId })).toBe("ok");
  });
});

describe("resolveTaskPermission", () => {
  const project = { managerId: "manager-1" };

  it("gives admins full edit access", () => {
    expect(resolveTaskPermission(session("super_admin"), {}, project, null)).toBe("edit");
    expect(resolveTaskPermission(session("company_admin"), {}, project, null)).toBe("edit");
  });

  it("gives the owning project manager edit, and denies others", () => {
    expect(
      resolveTaskPermission(session("project_manager", { sub: "manager-1" }), {}, project, null),
    ).toBe("edit");
    expect(
      resolveTaskPermission(session("project_manager", { sub: "manager-2" }), {}, project, null),
    ).toBeNull();
  });

  it("gives a field worker edit only on their assigned task", () => {
    expect(
      resolveTaskPermission(session(WORKER_ROLE), { assignedTo: "user-1" }, project, null),
    ).toBe("edit");
    expect(
      resolveTaskPermission(session(WORKER_ROLE), { assignedTo: "user-2" }, project, null),
    ).toBeNull();
    expect(resolveTaskPermission(session(WORKER_ROLE), {}, project, null)).toBeNull();
  });

  it("uses the collaborator permission for consultants/clients", () => {
    for (const role of ["consultant", "client"]) {
      expect(resolveTaskPermission(session(role), {}, project, { permission: "view" })).toBe("view");
      expect(resolveTaskPermission(session(role), {}, project, { permission: "comment" })).toBe("comment");
      expect(resolveTaskPermission(session(role), {}, project, { permission: "edit" })).toBe("edit");
      expect(resolveTaskPermission(session(role), {}, project, null)).toBeNull();
    }
  });

  it("does not let a field worker piggyback on a collaborator record", () => {
    // Even with a collaborator row, a worker still needs the task assigned.
    expect(
      resolveTaskPermission(session(WORKER_ROLE), { assignedTo: "user-2" }, project, {
        permission: "edit",
      }),
    ).toBeNull();
  });
});
