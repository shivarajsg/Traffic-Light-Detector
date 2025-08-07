import { useRef, useEffect } from 'react';

interface Detection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface TrafficLightDetectorProps {
  imageUrl: string;
  detections: Detection[];
}

export const TrafficLightDetector = ({ imageUrl, detections }: TrafficLightDetectorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (detections.length > 0 && canvasRef.current && imageRef.current) {
      drawDetections();
    }
  }, [detections]);

  const drawDetections = () => {
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

    // Draw detection boxes
    detections.forEach((detection) => {
      const [x, y, width, height] = detection.bbox;
      
      // Set color based on traffic light type
      let color;
      let shadowColor;
      switch (detection.label.toLowerCase()) {
        case 'red':
          color = '#ef4444';
          shadowColor = '#dc2626';
          break;
        case 'yellow':
        case 'amber':
          color = '#f59e0b';
          shadowColor = '#d97706';
          break;
        case 'green':
          color = '#10b981';
          shadowColor = '#059669';
          break;
        default:
          color = '#3b82f6';
          shadowColor = '#2563eb';
      }

      // Draw bounding box with glow effect
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = shadowColor;
      ctx.strokeRect(x, y, width - x, height - y);

      // Draw label background
      const label = `${detection.label} ${(detection.confidence * 100).toFixed(0)}%`;
      ctx.font = 'bold 16px Arial';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 20;

      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - textHeight - 5, textWidth + 10, textHeight + 5);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.fillText(label, x + 5, y - 8);
    });
  };

  const handleImageLoad = () => {
    if (detections.length > 0) {
      drawDetections();
    }
  };

  return (
    <div className="relative">
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Traffic scene"
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
  );
};