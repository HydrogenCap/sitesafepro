import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom, mockStorageFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockStorageFrom: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
  },
}));

import { generateGoLiveDocuments } from "@/hooks/useGoLiveDocuments";

// Chainable query builder that resolves with the given result
const makeQuery = (result: unknown) => {
  const q: Record<string, unknown> = {};
  ["select", "eq", "order"].forEach((m) => { q[m] = vi.fn(() => q); });
  q["then"] = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result));
  return q;
};

const makeInsertChain = (result: unknown) => ({
  insert: vi.fn(() => Promise.resolve(result)),
});

const PROJECT_ID = "proj-1";
const ORG_ID = "org-1";
const USER_ID = "user-1";

describe("generateGoLiveDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with 0 documents when no templates configured", async () => {
    mockFrom.mockReturnValue(makeQuery({ data: [], error: null }));

    const result = await generateGoLiveDocuments(PROJECT_ID, ORG_ID, USER_ID);

    expect(result.success).toBe(true);
    expect(result.documentsGenerated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("returns failure when template fetch throws a DB error", async () => {
    mockFrom.mockReturnValue(makeQuery({ data: null, error: { message: "DB error" } }));

    const result = await generateGoLiveDocuments(PROJECT_ID, ORG_ID, USER_ID);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Failed to fetch templates");
  });

  it("generates one document per template and returns correct count", async () => {
    const templates = [
      { id: "t1", name: "Induction Register", file_path: "induction.pdf", mime_type: "application/pdf", file_size: 1024, description: "", category: "induction", requires_acknowledgement: true },
      { id: "t2", name: "Safety Plan", file_path: "safety.pdf", mime_type: "application/pdf", file_size: 2048, description: "", category: "safety", requires_acknowledgement: false },
    ];

    mockFrom
      .mockReturnValueOnce(makeQuery({ data: templates, error: null }))
      .mockReturnValue(makeInsertChain({ error: null }));

    mockStorageFrom.mockReturnValue({
      download: vi.fn().mockResolvedValue({ data: new Blob(["pdf"]), error: null }),
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn(),
    });

    const result = await generateGoLiveDocuments(PROJECT_ID, ORG_ID, USER_ID);

    expect(result.success).toBe(true);
    expect(result.documentsGenerated).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it("collects per-template errors but continues processing remaining templates", async () => {
    const templates = [
      { id: "t1", name: "Fail Doc", file_path: "fail.pdf", mime_type: "application/pdf", file_size: 100, description: "", category: "other", requires_acknowledgement: false },
      { id: "t2", name: "Good Doc", file_path: "good.pdf", mime_type: "application/pdf", file_size: 100, description: "", category: "induction", requires_acknowledgement: false },
    ];

    mockFrom
      .mockReturnValueOnce(makeQuery({ data: templates, error: null }))
      .mockReturnValue(makeInsertChain({ error: null }));

    mockStorageFrom.mockReturnValue({
      download: vi.fn()
        .mockResolvedValueOnce({ data: null, error: { message: "Not found" } })
        .mockResolvedValueOnce({ data: new Blob(["pdf"]), error: null }),
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn(),
    });

    const result = await generateGoLiveDocuments(PROJECT_ID, ORG_ID, USER_ID);

    expect(result.success).toBe(false);
    expect(result.documentsGenerated).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Fail Doc");
  });

  it("removes the uploaded file when DB insert fails", async () => {
    const templates = [
      { id: "t1", name: "Bad Insert", file_path: "doc.pdf", mime_type: "application/pdf", file_size: 100, description: "", category: "other", requires_acknowledgement: false },
    ];

    const removeMock = vi.fn().mockResolvedValue({ error: null });

    mockFrom
      .mockReturnValueOnce(makeQuery({ data: templates, error: null }))
      .mockReturnValue(makeInsertChain({ error: { message: "insert failed" } }));

    mockStorageFrom.mockReturnValue({
      download: vi.fn().mockResolvedValue({ data: new Blob(["pdf"]), error: null }),
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: removeMock,
    });

    const result = await generateGoLiveDocuments(PROJECT_ID, ORG_ID, USER_ID);

    expect(result.documentsGenerated).toBe(0);
    expect(result.errors[0]).toContain("Bad Insert");
    expect(removeMock).toHaveBeenCalledOnce();
  });

  it("returns partial success when some templates succeed and some fail", async () => {
    const templates = [
      { id: "t1", name: "OK", file_path: "ok.pdf", mime_type: "application/pdf", file_size: 100, description: "", category: "induction", requires_acknowledgement: false },
      { id: "t2", name: "Upload Fail", file_path: "fail.pdf", mime_type: "application/pdf", file_size: 100, description: "", category: "other", requires_acknowledgement: false },
    ];

    mockFrom
      .mockReturnValueOnce(makeQuery({ data: templates, error: null }))
      .mockReturnValue(makeInsertChain({ error: null }));

    mockStorageFrom.mockReturnValue({
      download: vi.fn().mockResolvedValue({ data: new Blob(["pdf"]), error: null }),
      upload: vi.fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: "quota exceeded" } }),
      remove: vi.fn(),
    });

    const result = await generateGoLiveDocuments(PROJECT_ID, ORG_ID, USER_ID);

    expect(result.documentsGenerated).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Upload Fail");
  });
});
