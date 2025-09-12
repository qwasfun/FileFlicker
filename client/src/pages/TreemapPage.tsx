import { useQuery } from "@tanstack/react-query";
import TreemapVisualization from "@/components/TreemapVisualization";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

interface TreemapNode {
  name: string;
  value?: number;
  size?: number;
  type?: 'directory' | 'file';
  path?: string;
  id?: string;
  children?: TreemapNode[];
}

export default function TreemapPage() {
  const [, setLocation] = useLocation();

  const { 
    data: treemapData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<TreemapNode>({
    queryKey: ["/api/treemap"],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const handleNodeClick = (node: TreemapNode) => {
    console.log("Node clicked:", node);
    // Could add additional functionality here like:
    // - Show detailed file info
    // - Navigate to file location in main app
    // - Open file preview modal
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleBack = () => {
    setLocation("/");
  };

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-lg font-medium">
            Failed to load treemap data
          </div>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "An unknown error occurred"}
          </p>
          <div className="space-x-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Files
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <div className="text-lg font-medium">Loading treemap data...</div>
          <p className="text-muted-foreground">
            Building directory visualization from file system data
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Files
          </Button>
        </div>
      </div>
    );
  }

  if (!treemapData) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-lg font-medium">No data available</div>
          <p className="text-muted-foreground">
            No files or directories found to visualize
          </p>
          <div className="space-x-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Files
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              data-testid="button-back-to-files"
              onClick={handleBack}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Files
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Directory Treemap</h1>
              <p className="text-muted-foreground">
                Interactive visualization of your file system structure and sizes
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              data-testid="button-refresh-treemap"
              onClick={handleRefresh}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Treemap Visualization */}
      <div className="h-[calc(100vh-88px)]">
        <TreemapVisualization
          data={treemapData}
          onNodeClick={handleNodeClick}
          className="h-full"
        />
      </div>
    </div>
  );
}