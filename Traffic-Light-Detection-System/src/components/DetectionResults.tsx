import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Detection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface DetectionResultsProps {
  detections: Detection[];
}

export const DetectionResults = ({ detections }: DetectionResultsProps) => {
  if (detections.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Detection Results</h3>
        <Card className="p-6 text-center border-dashed">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No detections yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Upload an image and run analysis to see results
          </p>
        </Card>
      </div>
    );
  }

  const getTrafficLightIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'red':
        return <XCircle className="w-5 h-5 text-traffic-red" />;
      case 'yellow':
      case 'amber':
        return <AlertTriangle className="w-5 h-5 text-traffic-yellow" />;
      case 'green':
        return <CheckCircle className="w-5 h-5 text-traffic-green" />;
      default:
        return <CheckCircle className="w-5 h-5 text-primary" />;
    }
  };

  const getTrafficLightColor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'red':
        return 'bg-traffic-red/20 text-traffic-red border-traffic-red/30';
      case 'yellow':
      case 'amber':
        return 'bg-traffic-yellow/20 text-traffic-yellow border-traffic-yellow/30';
      case 'green':
        return 'bg-traffic-green/20 text-traffic-green border-traffic-green/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const averageConfidence = detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Detection Results</h3>
        
        {/* Summary Stats */}
        <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Detection Summary</span>
            <Badge variant="secondary">{detections.length} detected</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Average Confidence</span>
              <span className="font-medium">{(averageConfidence * 100).toFixed(1)}%</span>
            </div>
            <Progress value={averageConfidence * 100} className="h-2" />
          </div>
        </Card>

        {/* Individual Detections */}
        <div className="space-y-3">
          {detections.map((detection, index) => (
            <Card key={index} className="p-4 border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getTrafficLightIcon(detection.label)}
                  <span className="font-medium capitalize">{detection.label} Light</span>
                </div>
                <Badge 
                  className={`${getTrafficLightColor(detection.label)} border`}
                  variant="outline"
                >
                  {(detection.confidence * 100).toFixed(1)}%
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Confidence Level</span>
                  <span>{detection.confidence >= 0.8 ? 'High' : detection.confidence >= 0.6 ? 'Medium' : 'Low'}</span>
                </div>
                <Progress 
                  value={detection.confidence * 100} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  Location: [{detection.bbox.join(', ')}]
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* JSON Output */}
        <Card className="p-4 bg-muted/20">
          <h4 className="text-sm font-medium mb-3">JSON Output</h4>
          <pre className="text-xs bg-background/50 p-3 rounded border overflow-x-auto">
            {JSON.stringify(detections, null, 2)}
          </pre>
        </Card>
      </div>
    </div>
  );
};