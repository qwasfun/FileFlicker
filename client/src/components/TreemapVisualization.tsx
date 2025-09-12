import { hierarchy, treemap, treemapBinary } from 'd3-hierarchy';
import { useEffect, useState, useRef } from 'react';

interface TreemapNode {
  name: string;
  value?: number;
  size?: number;
  type?: 'directory' | 'file';
  path?: string;
  id?: string;
  children?: TreemapNode[];
}

interface TreemapVisualizationProps {
  data: TreemapNode;
  onNodeClick?: (node: TreemapNode) => void;
  className?: string;
}


export default function TreemapVisualization({ data, onNodeClick, className = "" }: TreemapVisualizationProps) {
  const [currentData, setCurrentData] = useState<TreemapNode>(data);
  const [breadcrumbs, setBreadcrumbs] = useState<TreemapNode[]>([data]);

  useEffect(() => {
    setCurrentData(data);
    setBreadcrumbs([data]);
  }, [data]);

  const handleNodeClick = (node: any) => {
    // Check if this hierarchy node has children (is a directory)
    if (node.children && node.children.length > 0) {
      // Zoom into this directory
      setCurrentData(node.data);
      setBreadcrumbs(prev => [...prev, node.data]);
    }
    
    // Call the optional onNodeClick prop
    if (onNodeClick) {
      onNodeClick(node.data);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newCurrent = breadcrumbs[index];
    setCurrentData(newCurrent);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const canZoomOut = breadcrumbs.length > 1;

  const zoomOut = () => {
    if (canZoomOut) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      setCurrentData(newBreadcrumbs[newBreadcrumbs.length - 1]);
      setBreadcrumbs(newBreadcrumbs);
    }
  };


  // Format file sizes for display
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // SVG Treemap Component using d3-hierarchy
  function TreemapSVG({ data, width, height, onNodeClick }: {
    data: TreemapNode;
    width: number;
    height: number;
    onNodeClick: (node: any) => void;
  }) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
      if (!svgRef.current || !data.children?.length) return;

      // Clear previous content
      const svg = svgRef.current;
      svg.innerHTML = '';

      // Create hierarchy
      const root = hierarchy(data)
        .sum(d => d.value || d.size || 1)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      // Create treemap layout
      const treemapLayout = treemap()
        .size([width, height])
        .padding(2)
        .tile(treemapBinary);

      treemapLayout(root);

      // Color scheme based on file types
      const getNodeColor = (node: any) => {
        if (node.data.type === 'file') {
          const extension = node.data.name.split('.').pop()?.toLowerCase() || '';
          if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(extension)) {
            return '#e74c3c'; // Red for videos
          } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
            return '#f39c12'; // Orange for images
          } else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension)) {
            return '#9b59b6'; // Purple for audio
          } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
            return '#3498db'; // Blue for documents
          } else {
            return '#95a5a6'; // Gray for other files
          }
        } else {
          // Directories get green shades based on depth
          return '#27ae60';
        }
      };

      // Render rectangles only for immediate children at current zoom level
      (root.children ?? []).forEach((node: any) => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(node.x0));
        rect.setAttribute('y', String(node.y0));
        rect.setAttribute('width', String(node.x1 - node.x0));
        rect.setAttribute('height', String(node.y1 - node.y0));
        rect.setAttribute('fill', getNodeColor(node));
        rect.setAttribute('stroke', '#ffffff');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('cursor', 'pointer');
        rect.setAttribute('data-testid', `treemap-rect-${node.data.id || node.data.name}`);
        
        // Add hover effect
        rect.addEventListener('mouseenter', () => {
          rect.setAttribute('opacity', '0.8');
        });
        rect.addEventListener('mouseleave', () => {
          rect.setAttribute('opacity', '1');
        });

        // Add click handler
        rect.addEventListener('click', () => {
          onNodeClick(node);
        });

        svg.appendChild(rect);

        // Add text labels for larger rectangles
        const rectWidth = node.x1 - node.x0;
        const rectHeight = node.y1 - node.y0;
        if (rectWidth > 50 && rectHeight > 20) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', String(node.x0 + 4));
          text.setAttribute('y', String(node.y0 + 14));
          text.setAttribute('font-size', '12');
          text.setAttribute('font-family', 'Arial, sans-serif');
          text.setAttribute('fill', '#ffffff');
          text.setAttribute('pointer-events', 'none');
          text.textContent = node.data.name.length > 15 ? 
            node.data.name.substring(0, 15) + '...' : 
            node.data.name;
          svg.appendChild(text);

          // Add size label for files
          if (node.data.type === 'file' && rectHeight > 35) {
            const sizeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            sizeText.setAttribute('x', String(node.x0 + 4));
            sizeText.setAttribute('y', String(node.y0 + 28));
            sizeText.setAttribute('font-size', '10');
            sizeText.setAttribute('font-family', 'Arial, sans-serif');
            sizeText.setAttribute('fill', '#ffffff');
            sizeText.setAttribute('opacity', '0.8');
            sizeText.setAttribute('pointer-events', 'none');
            sizeText.textContent = formatBytes(node.data.value || node.data.size || 0);
            svg.appendChild(sizeText);
          }
        }
      });

    }, [data, width, height, onNodeClick]);

    return (
      <div className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="border border-border rounded-lg"
        />
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm p-2 rounded text-xs border border-border">
          <div className="font-medium mb-1">Legend</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Video</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Image</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Audio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Document</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Directory</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span>Other</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with breadcrumbs and controls */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold">Directory Treemap</h2>
          {canZoomOut && (
            <button
              data-testid="button-zoom-out"
              onClick={zoomOut}
              className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
            >
              ← Zoom Out
            </button>
          )}
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id || index} className="flex items-center space-x-1">
              {index > 0 && <span className="text-muted-foreground">/</span>}
              <button
                data-testid={`breadcrumb-${index}`}
                onClick={() => handleBreadcrumbClick(index)}
                className={`px-2 py-1 rounded hover:bg-muted transition-colors ${
                  index === breadcrumbs.length - 1 
                    ? 'font-medium text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Treemap visualization */}
      <div className="flex-1 p-4">
        <div className="h-full bg-background rounded-lg border border-border overflow-hidden">
          {currentData.children && currentData.children.length > 0 ? (
            <TreemapSVG
              data={currentData}
              width={800}
              height={600}
              onNodeClick={handleNodeClick}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-lg font-medium">Empty Directory</div>
                <div className="text-sm">This directory contains no files or subdirectories</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-card border-t border-border p-4">
        <div className="text-sm font-medium text-foreground mb-2">File Types:</div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#e74c3c' }}></div>
            <span>Video</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f39c12' }}></div>
            <span>Image</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#9b59b6' }}></div>
            <span>Audio</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3498db' }}></div>
            <span>Document</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#27ae60' }}></div>
            <span>Directory</span>
          </div>
        </div>
      </div>
    </div>
  );
}