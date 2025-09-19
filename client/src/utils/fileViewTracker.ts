import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useFileViewTracker = () => {
  const queryClient = useQueryClient();
  
  const recordViewMutation = useMutation({
    mutationFn: async ({ fileId, viewType }: { fileId: string; viewType: string }) => {
      const response = await fetch(`/api/recent-views/${fileId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewType }),
      });
      if (!response.ok) throw new Error("Failed to record file view");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate recent views cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/recent-views"] });
    },
  });

  const trackFileView = (fileId: string, viewType: 'download' | 'stream' | 'modal_view' | 'info_view') => {
    recordViewMutation.mutate({ fileId, viewType });
  };

  return {
    trackFileView,
    isTracking: recordViewMutation.isPending,
  };
};

// Helper function for non-hook usage
export const trackFileView = async (fileId: string, viewType: 'download' | 'stream' | 'modal_view' | 'info_view') => {
  try {
    await fetch(`/api/recent-views/${fileId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewType }),
    });
  } catch (error) {
    console.error("Failed to track file view:", error);
  }
};