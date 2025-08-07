import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ruler, Info } from 'lucide-react';

interface Detection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface PoleHeightDetectorProps {
  imageUrl: string;
  detections: Detection[];
}

interface PoleHeight {
  estimatedHeight: number;
  confidence: number;
  referenceUsed: string;
}

export const PoleHeightDetector = ({ imageUrl, detections }: PoleHeightDetectorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [poleHeights, setPoleHeights] = useState<PoleHeight[]>([]);

  useEffect(() => {
    if (detections.length > 0 && canvasRef.current && imageRef.current) {
      detectPoleHeights();
    }
  }, [detections]);

  const detectPoleHeights = async () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    // Draw the image
    ctx.drawImage(image, 0, 0);

    const heights: PoleHeight[] = [];

    detections.forEach((detection, index) => {
      const [x1, y1, x2, y2] = detection.bbox;
      
      // Estimate pole height using perspective and common references
      const poleHeight = estimatePoleHeight(x1, y1, x2, y2, image.naturalWidth, image.naturalHeight);
      heights.push(poleHeight);

      // Draw pole detection visualization
      drawPoleVisualization(ctx, x1, y1, x2, y2, poleHeight, index);
    });

    setPoleHeights(heights);
  };

  const estimatePoleHeight = (x1: number, y1: number, x2: number, y2: number, imageWidth: number, imageHeight: number): PoleHeight => {
    // Calculate the vertical span of the traffic light in the image
    const lightHeight = Math.abs(y2 - y1);
    const lightPosition = (y1 + y2) / 2; // Center Y position
    
    // Estimate pole height based on common traffic light standards and perspective
    let estimatedHeight: number;
    let confidence: number;
    let referenceUsed: string;

    // Standard traffic light heights range from 12-20 feet (3.7-6.1m)
    // Use perspective analysis - lights closer to bottom of image are likely closer/lower
    const positionRatio = lightPosition / imageHeight;
    
    if (positionRatio > 0.7) {
      // Lower in image - likely closer, standard height
      estimatedHeight = 4.5; // 15 feet average
      confidence = 0.8;
      referenceUsed = "Standard urban intersection";
    } else if (positionRatio > 0.4) {
      // Middle of image - medium distance
      estimatedHeight = 5.2; // 17 feet
      confidence = 0.7;
      referenceUsed = "Highway or major road";
    } else {
      // Upper in image - distant or very tall
      estimatedHeight = 6.1; // 20 feet
      confidence = 0.6;
      referenceUsed = "Highway overpass";
    }

    // Adjust based on apparent size of traffic light
    const sizeRatio = lightHeight / imageHeight;
    if (sizeRatio > 0.1) {
      // Very large in image - likely close and standard height
      estimatedHeight *= 0.9;
      confidence = Math.min(confidence + 0.1, 0.9);
    } else if (sizeRatio < 0.02) {
      // Very small in image - likely distant and possibly taller
      estimatedHeight *= 1.2;
      confidence = Math.max(confidence - 0.1, 0.5);
    }

    return {
      estimatedHeight: Math.round(estimatedHeight * 10) / 10, // Round to 1 decimal
      confidence,
      referenceUsed
    };
  };

  const drawPoleVisualization = (
    ctx: CanvasRenderingContext2D, 
    x1: number, 
    y1: number, 
    x2: number, 
    y2: number, 
    poleHeight: PoleHeight,
    index: number
  ) => {
    const centerX = (x1 + x2) / 2;
    
    // Estimate pole base position (assuming pole extends down from traffic light)
    const estimatedPoleBottom = y2 + (poleHeight.estimatedHeight * 20); // Scale factor for visualization
    
    // Draw pole line
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX, y2);
    ctx.lineTo(centerX, Math.min(estimatedPoleBottom, ctx.canvas.height - 20));
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw height label
    const heightText = `${poleHeight.estimatedHeight}m`;
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#8b5cf6';
    ctx.shadowBlur = 3;
    ctx.shadowColor = '#000';
    
    const textMetrics = ctx.measureText(heightText);
    const labelX = centerX - textMetrics.width / 2;
    const labelY = Math.min(estimatedPoleBottom - 10, ctx.canvas.height - 10);
    
    // Background for text
    ctx.fillStyle = 'rgba(139, 92, 246, 0.8)';
    ctx.fillRect(labelX - 5, labelY - 20, textMetrics.width + 10, 25);
    
    // Text
    ctx.fillStyle = 'white';
    ctx.shadowBlur = 0;
    ctx.fillText(heightText, labelX, labelY - 5);

    // Draw measurement indicator
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Top marker
    ctx.moveTo(centerX - 10, y2);
    ctx.lineTo(centerX + 10, y2);
    // Bottom marker
    const bottomY = Math.min(estimatedPoleBottom, ctx.canvas.height - 20);
    ctx.moveTo(centerX - 10, bottomY);
    ctx.lineTo(centerX + 10, bottomY);
    ctx.stroke();
  };

  const handleImageLoad = () => {
    if (detections.length > 0) {
      detectPoleHeights();
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Traffic scene for pole height analysis"
          className="w-full h-auto rounded-lg border border-border"
          onLoad={handleImageLoad}
          style={{ display: detections.length === 0 ? 'block' : 'none' }}
        />
        
        {detections.length > 0 && (
          <canvas
            ref={canvasRef}
            className="w-full h-auto rounded-lg border border-border"
          />
        )}
      </div>

      {poleHeights.length > 0 && (
        <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Ruler className="w-5 h-5 text-primary" />
            Pole Height Analysis
          </h3>
          
          <div className="space-y-3">
            {poleHeights.map((height, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">Light {index + 1}</Badge>
                  <div className="text-sm">
                    <div className="font-medium">
                      Estimated Height: <span className="text-primary">{height.estimatedHeight}m</span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Reference: {height.referenceUsed}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={height.confidence > 0.7 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {Math.round(height.confidence * 100)}% confidence
                  </Badge>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-muted/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Height Estimation Method:</p>
                <p>Based on standard traffic light heights (3.7-6.1m), perspective analysis, and relative positioning in the image. Accuracy varies with distance and angle.</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};