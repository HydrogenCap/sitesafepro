import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve(resolve({ data: [{ id: "proj-1", name: "Test Project" }], error: null })),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          questions: [
            { id: "q1", question: "What is the site address?", type: "text", required: true, placeholder: "Enter address" },
            { id: "q2", question: "How many workers on site?", type: "number", required: false, placeholder: "e.g. 10" },
          ],
        },
        error: null,
      }),
    },
  },
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ organisation: { name: "Acme Construction" } }),
}));

vi.mock("@/lib/document-generator", () => ({
  generateDocumentPDF: vi.fn(),
  generateDocumentDOCX: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DocumentGeneratorDialog } from "@/components/documents/DocumentGeneratorDialog";

describe("DocumentGeneratorDialog", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders template selection as first step", () => {
    render(<DocumentGeneratorDialog open={true} onOpenChange={onOpenChange} />);

    expect(screen.getByText("AI Document Generator")).toBeInTheDocument();
    expect(screen.getByText("Site Induction Register")).toBeInTheDocument();
    expect(screen.getByText("RAMS Register")).toBeInTheDocument();
    expect(screen.getByText("Permit to Work Forms")).toBeInTheDocument();
    expect(screen.getByText("F10 Notification")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(<DocumentGeneratorDialog open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByText("AI Document Generator")).not.toBeInTheDocument();
  });

  it("advances to project selection after choosing a template", async () => {
    const user = userEvent.setup();
    render(<DocumentGeneratorDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("Site Induction Register"));

    await waitFor(() => {
      expect(screen.getByText("Select Project (Optional)")).toBeInTheDocument();
    });
  });

  it("can navigate back from project step to template selection", async () => {
    const user = userEvent.setup();
    render(<DocumentGeneratorDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("RAMS Register"));
    await screen.findByText("Select Project (Optional)");

    await user.click(screen.getByRole("button", { name: /Back/i }));

    await waitFor(() => {
      expect(screen.getByText("Site Induction Register")).toBeInTheDocument();
    });
  });

  it("advances to questions step and shows first question after continuing", async () => {
    const user = userEvent.setup();
    render(<DocumentGeneratorDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("Permit to Work Forms"));
    await screen.findByText("Select Project (Optional)");

    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText("What is the site address?")).toBeInTheDocument();
    });
  });

  it("shows progress indicator with correct question count", async () => {
    const user = userEvent.setup();
    render(<DocumentGeneratorDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("F10 Notification"));
    await screen.findByText("Select Project (Optional)");
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    });
  });

  it("Next button is disabled when required question is unanswered", async () => {
    const user = userEvent.setup();
    render(<DocumentGeneratorDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("Site Induction Register"));
    await screen.findByText("Select Project (Optional)");
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => screen.getByText("What is the site address?"));

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    expect(nextBtn).toBeDisabled();
  });

  it("Next button enables after answering a required question", async () => {
    const user = userEvent.setup();
    render(<DocumentGeneratorDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("Site Induction Register"));
    await screen.findByText("Select Project (Optional)");
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => screen.getByText("What is the site address?"));

    const input = screen.getByPlaceholderText("Enter address");
    await user.type(input, "123 Construction Lane, London");

    expect(screen.getByRole("button", { name: /Next/i })).not.toBeDisabled();
  });

  it("shows Generate Document button on last question", async () => {
    const user = userEvent.setup();
    render(<DocumentGeneratorDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("Site Induction Register"));
    await screen.findByText("Select Project (Optional)");
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => screen.getByText("What is the site address?"));

    // Answer Q1 and advance
    await user.type(screen.getByPlaceholderText("Enter address"), "123 Lane");
    await user.click(screen.getByRole("button", { name: /Next/i }));

    // Now on Q2 (not required), Generate Document button should appear
    await waitFor(() => {
      expect(screen.getByText("How many workers on site?")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Generate Document/i })).toBeInTheDocument();
    });
  });

  it("resets to template selection when dialog is closed and reopened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DocumentGeneratorDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("RAMS Register"));
    await screen.findByText("Select Project (Optional)");

    rerender(<DocumentGeneratorDialog open={false} onOpenChange={onOpenChange} />);
    rerender(<DocumentGeneratorDialog open={true} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByText("Site Induction Register")).toBeInTheDocument();
    });
  });
});
