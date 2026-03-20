import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const {
  mockStorageFrom,
  mockFrom,
  mockToastSuccess,
  mockToastError,
  mockLogActivity,
  mockNotifyDocumentAcknowledgement,
} = vi.hoisted(() => ({
  mockStorageFrom: vi.fn(),
  mockFrom: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockLogActivity: vi.fn(),
  mockNotifyDocumentAcknowledgement: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

vi.mock("@/hooks/useActivityLog", () => ({
  useActivityLog: () => ({ logActivity: mockLogActivity }),
  activityDescriptions: { document_uploaded: (name: string) => `Uploaded ${name}` },
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({ notifyDocumentAcknowledgement: mockNotifyDocumentAcknowledgement }),
}));

import { useDocumentUpload } from "@/hooks/useDocumentUpload";

const makeChain = (result: unknown) => {
  const chain: Record<string, unknown> = {};
  ["select", "eq", "neq", "update"].forEach((method) => {
    chain[method] = vi.fn(() => chain);
  });
  chain["single"] = vi.fn(() => Promise.resolve(result));
  chain["then"] = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result));
  return chain;
};

const makeInsertChain = (singleResult: unknown) => ({
  insert: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve(singleResult)),
    })),
  })),
});

const BASE_PARAMS = {
  file: new File(["content"], "test.pdf", { type: "application/pdf" }),
  name: "Test Document",
  description: "A test document",
  category: "rams",
  projectId: "proj-1",
  organisationId: "org-1",
  userId: "user-1",
  parentDocument: null,
  classificationResult: null,
  requiresAcknowledgement: false,
  projects: [{ id: "proj-1", name: "Test Project" }],
};

describe("useDocumentUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifyDocumentAcknowledgement.mockResolvedValue(undefined);
  });

  it("initialises with uploading=false and uploadProgress=0", () => {
    const { result } = renderHook(() => useDocumentUpload());
    expect(result.current.uploading).toBe(false);
    expect(result.current.uploadProgress).toBe(0);
  });

  it("returns true and shows success toast on successful upload", async () => {
    mockStorageFrom.mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom
      .mockReturnValueOnce(makeInsertChain({ data: { id: "doc-1" }, error: null }))
      .mockReturnValue(makeChain({ data: { storage_used_bytes: 0 }, error: null }));

    const { result } = renderHook(() => useDocumentUpload());
    let success: boolean;

    await act(async () => {
      success = await result.current.upload(BASE_PARAMS);
    });

    expect(success!).toBe(true);
    expect(mockToastSuccess).toHaveBeenCalledWith("Document uploaded successfully!");
    expect(result.current.uploading).toBe(false);
  });

  it("returns false and shows error toast when storage upload fails", async () => {
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: "Storage quota exceeded" } }),
    });

    const { result } = renderHook(() => useDocumentUpload());
    let success: boolean;

    await act(async () => {
      success = await result.current.upload(BASE_PARAMS);
    });

    expect(success!).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith("Failed to upload document");
    expect(result.current.uploading).toBe(false);
  });

  it("shows versioned success toast when uploading a new version of an existing document", async () => {
    const parentDocument = {
      id: "doc-parent",
      name: "Original Doc",
      version: 2,
      category: "rams",
      project_id: "proj-1",
    };

    mockStorageFrom.mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom
      .mockReturnValueOnce(makeInsertChain({ data: { id: "doc-2" }, error: null }))
      .mockReturnValue(makeChain({ data: { storage_used_bytes: 5000 }, error: null }));

    const { result } = renderHook(() => useDocumentUpload());

    await act(async () => {
      await result.current.upload({ ...BASE_PARAMS, parentDocument });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith("Version 3 uploaded successfully!");
  });

  it("logs activity with correct type and entity name after successful upload", async () => {
    mockStorageFrom.mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom
      .mockReturnValueOnce(makeInsertChain({ data: { id: "doc-1" }, error: null }))
      .mockReturnValue(makeChain({ data: { storage_used_bytes: 0 }, error: null }));

    const { result } = renderHook(() => useDocumentUpload());

    await act(async () => {
      await result.current.upload(BASE_PARAMS);
    });

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: "document_uploaded",
        entityName: "Test Document",
      }),
    );
  });

  it("sends acknowledgement notifications to other org members when requiresAcknowledgement=true", async () => {
    mockStorageFrom.mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) });
    const membersChain = makeChain({ data: [{ profile_id: "user-2" }, { profile_id: "user-3" }], error: null });

    mockFrom
      .mockReturnValueOnce(makeInsertChain({ data: { id: "doc-1" }, error: null }))
      .mockReturnValueOnce(membersChain);

    const { result } = renderHook(() => useDocumentUpload());

    await act(async () => {
      await result.current.upload({ ...BASE_PARAMS, requiresAcknowledgement: true });
    });

    expect(mockNotifyDocumentAcknowledgement).toHaveBeenCalledWith(
      ["user-2", "user-3"],
      "doc-1",
      "Test Document",
      "Test Project",
      undefined,
    );
  });

  it("does not send notifications when requiresAcknowledgement=false", async () => {
    mockStorageFrom.mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom
      .mockReturnValueOnce(makeInsertChain({ data: { id: "doc-1" }, error: null }))
      .mockReturnValue(makeChain({ data: { storage_used_bytes: 0 }, error: null }));

    const { result } = renderHook(() => useDocumentUpload());

    await act(async () => {
      await result.current.upload(BASE_PARAMS);
    });

    expect(mockNotifyDocumentAcknowledgement).not.toHaveBeenCalled();
  });
});
