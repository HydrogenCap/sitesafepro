import { useState } from "react";
import { format } from "date-fns";
import { Send, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Comment {
  id: string;
  content: string;
  is_status_change: boolean;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface ActionActivityFeedProps {
  comments: Comment[];
  onAddComment: (content: string) => Promise<void>;
  loading?: boolean;
}

export const ActionActivityFeed = ({
  comments,
  onAddComment,
  loading = false,
}: ActionActivityFeedProps) => {
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment("");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return "";
    const labels: Record<string, string> = {
      open: "Open",
      in_progress: "In Progress",
      awaiting_verification: "Awaiting Verification",
      closed: "Closed",
    };
    return labels[status] || status;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Activity</h3>

      {/* Comment list */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity yet
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {comment.author ? getInitials(comment.author.full_name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {comment.is_status_change ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {comment.author?.full_name || "Unknown"}
                    </span>{" "}
                    <RefreshCw className="inline h-3 w-3 mx-1" />
                    moved this from{" "}
                    <span className="font-medium">
                      {getStatusLabel(comment.old_status)}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {getStatusLabel(comment.new_status)}
                    </span>
                  </p>
                ) : (
                  <>
                    <p className="text-sm">
                      <span className="font-medium text-foreground">
                        {comment.author?.full_name || "Unknown"}
                      </span>
                    </p>
                    <p className="text-sm text-foreground mt-1">{comment.content}</p>
                  </>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(comment.created_at), "dd MMM yyyy 'at' HH:mm")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add comment */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) {
              handleSubmit();
            }
          }}
        />
      </div>
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!newComment.trim() || submitting}
        className="w-full"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Post Comment
      </Button>
    </div>
  );
};
