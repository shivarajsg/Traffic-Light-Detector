import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Camera, Upload, Zap, Eye, Target, Brain } from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';
import { TrafficLightDetector } from '@/components/TrafficLightDetector';
import { DetectionResults } from '@/components/DetectionResults';
import { PoleHeightDetector } from '@/components/PoleHeightDetector';
import { pipeline } from '@huggingface/transformers';

interface Detection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setDetections([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
        toast.success('Camera started successfully!');
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Camera access denied. Please allow camera permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      context?.drawImage(videoRef.current, 0, 0);
      const dataURL = canvas.toDataURL('image/jpeg', 0.9);
      
      setSelectedImage(dataURL);
      setDetections([]);
      
      // Stop camera stream
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
      
      toast.success('Photo captured successfully!');
    } else {
      toast.error('Camera not ready. Please wait for camera to load.');
    }
  };

  const runDetection = async () => {
    if (!selectedImage) return;
    
    setIsDetecting(true);
    setDetectionProgress(0);
    
    try {
      // Progress tracking
      setDetectionProgress(10);
      
      // Load object detection model
      const detector = await pipeline(
        'object-detection',
        'Xenova/detr-resnet-50',
        { device: 'webgpu', dtype: 'fp32' }
      );
      
      setDetectionProgress(30);
      
      // Create image element for processing
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = selectedImage;
      });
      
      setDetectionProgress(50);
      
      // Run object detection
      const results = await detector(selectedImage);
      
      setDetectionProgress(70);
      
      // Filter and process traffic light detections - be more inclusive
      const trafficLightDetections: Detection[] = results
        .filter((item: any) => {
          // Cast a wider net for potential traffic signals
          const label = item.label.toLowerCase();
          return item.score > 0.1 && (
            label.includes('traffic') || 
            label.includes('light') || 
            label.includes('signal') ||
            label.includes('stop') ||
            label.includes('arrow') ||
            label.includes('directional') ||
            label.includes('red') || 
            label.includes('green') || 
            label.includes('yellow') ||
            label.includes('amber') ||
            label.includes('go') ||
            label.includes('turn') ||
            label.includes('sign') ||
            label.includes('lamp') ||
            label.includes('circle') ||
            label.includes('square')
          );
        })
        .map((item: any) => {
          // Analyze color from the detected region
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          // Extract region and analyze dominant color
          const x = Math.max(0, item.box.xmin);
          const y = Math.max(0, item.box.ymin);
          const width = Math.min(img.width - x, item.box.xmax - item.box.xmin);
          const height = Math.min(img.height - y, item.box.ymax - item.box.ymin);
          
          const imageData = ctx?.getImageData(x, y, width, height);
          const color = analyzeTrafficLightColor(imageData);
          
          return {
            label: color,
            confidence: item.score,
            bbox: [x, y, item.box.xmax, item.box.ymax] as [number, number, number, number]
          };
        })
        .filter((detection: Detection) => 
          ['Red', 'Yellow', 'Green'].includes(detection.label) && 
          detection.confidence > 0.1
        );
      
      setDetectionProgress(90);
      
      // Sort by confidence
      trafficLightDetections.sort((a, b) => b.confidence - a.confidence);
      
      setDetections(trafficLightDetections);
      setDetectionProgress(100);
      
      toast.success(`Detected ${trafficLightDetections.length} illuminated traffic lights!`);
    } catch (error) {
      console.error('Detection error:', error);
      toast.error('Detection failed. Please try again.');
    } finally {
      setIsDetecting(false);
    }
  };

  const analyzeTrafficLightColor = (imageData: ImageData | undefined): string => {
    if (!imageData) return 'Unknown';
    
    const data = imageData.data;
    let redSum = 0, greenSum = 0, blueSum = 0;
    let brightPixels = 0;
    let dimPixels = 0;
    let dimRedSum = 0, dimGreenSum = 0, dimBlueSum = 0;
    let veryDimPixels = 0;
    let veryDimRedSum = 0, veryDimGreenSum = 0, veryDimBlueSum = 0;
    
    // Analyze pixels for bright, dim, and very dim illuminated areas
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      
      // Bright pixels (well illuminated)
      if (brightness > 60) {
        redSum += r;
        greenSum += g;
        blueSum += b;
        brightPixels++;
      }
      // Dim but still illuminated pixels (for dull lights)
      else if (brightness > 25) {
        dimRedSum += r;
        dimGreenSum += g;
        dimBlueSum += b;
        dimPixels++;
      }
      // Very dim pixels (for very dull arrow lights)
      else if (brightness > 10) {
        veryDimRedSum += r;
        veryDimGreenSum += g;
        veryDimBlueSum += b;
        veryDimPixels++;
      }
    }
    
    // Analyze bright pixels first
    if (brightPixels > 0) {
      const avgRed = redSum / brightPixels;
      const avgGreen = greenSum / brightPixels;
      const avgBlue = blueSum / brightPixels;
      
      // More sensitive classification for green arrows and signals
      if (avgGreen > avgRed + 8 && avgGreen > avgBlue + 8) {
        return 'Green';
      } else if (avgRed > avgGreen + 20 && avgRed > avgBlue + 20) {
        return 'Red';
      } else if (avgRed > 130 && avgGreen > 100 && avgBlue < 100) {
        return 'Yellow';
      }
    }
    
    // Fallback to dim pixels for dull lights - more sensitive for arrows
    if (dimPixels > 0) {
      const dimAvgRed = dimRedSum / dimPixels;
      const dimAvgGreen = dimGreenSum / dimPixels;
      const dimAvgBlue = dimBlueSum / dimPixels;
      
      // Very sensitive detection for dim green arrows
      if (dimAvgGreen > dimAvgRed + 3 && dimAvgGreen > dimAvgBlue + 3) {
        return 'Green';
      } else if (dimAvgRed > dimAvgGreen + 8 && dimAvgRed > dimAvgBlue + 8) {
        return 'Red';
      } else if (dimAvgRed > 60 && dimAvgGreen > 45 && dimAvgBlue < 60) {
        return 'Yellow';
      }
    }
    
    // Check very dim pixels for extremely dull arrow lights
    if (veryDimPixels > 0) {
      const veryDimAvgRed = veryDimRedSum / veryDimPixels;
      const veryDimAvgGreen = veryDimGreenSum / veryDimPixels;
      const veryDimAvgBlue = veryDimBlueSum / veryDimPixels;
      
      // Ultra sensitive detection for very dim green arrows
      if (veryDimAvgGreen > veryDimAvgRed + 1 && veryDimAvgGreen > veryDimAvgBlue + 1 && veryDimAvgGreen > 15) {
        return 'Green';
      } else if (veryDimAvgRed > veryDimAvgGreen + 3 && veryDimAvgRed > veryDimAvgBlue + 3) {
        return 'Red';
      } else if (veryDimAvgRed > 30 && veryDimAvgGreen > 25 && veryDimAvgBlue < 40) {
        return 'Yellow';
      }
    }
    
    // Additional check for any greenish hue in the overall image
    const totalPixels = data.length / 4;
    let overallGreen = 0, overallRed = 0, overallBlue = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      overallRed += data[i];
      overallGreen += data[i + 1];
      overallBlue += data[i + 2];
    }
    
    const avgOverallRed = overallRed / totalPixels;
    const avgOverallGreen = overallGreen / totalPixels;
    const avgOverallBlue = overallBlue / totalPixels;
    
    // Last resort check for green signals - very sensitive
    if (avgOverallGreen > avgOverallRed + 1 && avgOverallGreen > avgOverallBlue + 1 && avgOverallGreen > 20) {
      return 'Green';
    }
    
    return 'Unknown';
  };

  const resetApp = () => {
    setSelectedImage(null);
    setDetections([]);
    setDetectionProgress(0);
    setIsDetecting(false);
    
    // Stop camera if active
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="relative">
                <Brain className="w-12 h-12 text-primary" />
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur animate-pulse" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                Traffic Light Detector
              </h1>
            </div>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Advanced AI-powered traffic light detection and classification system.
              Upload an image or capture with your camera to identify and analyze traffic signals.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
              <Badge variant="secondary" className="text-sm px-4 py-2">
                <Eye className="w-4 h-4 mr-2" />
                Computer Vision
              </Badge>
              <Badge variant="secondary" className="text-sm px-4 py-2">
                <Target className="w-4 h-4 mr-2" />
                Object Detection
              </Badge>
              <Badge variant="secondary" className="text-sm px-4 py-2">
                <Zap className="w-4 h-4 mr-2" />
                Real-time Analysis
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Input Section */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Upload className="w-6 h-6 text-primary" />
              Input Image
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* File Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Upload Image</h3>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Click to upload an image</p>
                  <p className="text-sm text-muted-foreground mt-2">JPEG, PNG supported</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Camera Capture */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Camera Capture</h3>
                <div className="border border-border rounded-lg p-4 bg-muted/20">
                  <video 
                    ref={videoRef}
                    className="w-full h-48 bg-black rounded object-cover"
                    style={{ display: isCameraActive ? 'block' : 'none' }}
                    playsInline
                    muted
                  />
                  {!isCameraActive && (
                    <div className="w-full h-48 bg-muted/50 rounded flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Camera preview will appear here</p>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 mt-4">
                    <Button 
                      variant="camera" 
                      onClick={startCamera} 
                      className="flex-1"
                      disabled={isCameraActive}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {isCameraActive ? 'Camera Active' : 'Start Camera'}
                    </Button>
                    <Button 
                      variant="ai" 
                      onClick={capturePhoto} 
                      disabled={!isCameraActive}
                    >
                      Capture
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Selected Image & Detection */}
          {selectedImage && (
            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-3">
                  <Target className="w-6 h-6 text-primary" />
                  Detection Analysis
                </h2>
                <Button variant="outline" onClick={resetApp}>
                  Reset
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Image Display */}
                <div className="space-y-4">
                  <TrafficLightDetector 
                    imageUrl={selectedImage}
                    detections={detections}
                  />
                  
                  {!isDetecting && detections.length === 0 && (
                    <Button 
                      variant="ai" 
                      onClick={runDetection}
                      className="w-full"
                      size="lg"
                    >
                      <Brain className="w-5 h-5 mr-2" />
                      Analyze Traffic Lights
                    </Button>
                  )}

                  {isDetecting && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Analyzing image...</span>
                        <span>{detectionProgress}%</span>
                      </div>
                      <Progress value={detectionProgress} className="h-2" />
                    </div>
                  )}
                </div>

                {/* Results */}
                <div className="space-y-6">
                  <DetectionResults detections={detections} />
                  
                  {detections.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Pole Height Analysis</h3>
                      <PoleHeightDetector 
                        imageUrl={selectedImage}
                        detections={detections}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Features Section */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur">
            <h2 className="text-2xl font-semibold mb-6 text-center">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-traffic-red/20 rounded-full flex items-center justify-center mx-auto">
                  <div className="w-6 h-6 bg-traffic-red rounded-full shadow-traffic-red" />
                </div>
                <h3 className="font-semibold">Red Light Detection</h3>
                <p className="text-sm text-muted-foreground">Accurately identifies red traffic signals</p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-traffic-yellow/20 rounded-full flex items-center justify-center mx-auto">
                  <div className="w-6 h-6 bg-traffic-yellow rounded-full shadow-traffic-yellow" />
                </div>
                <h3 className="font-semibold">Yellow Light Detection</h3>
                <p className="text-sm text-muted-foreground">Detects amber/caution signals</p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-traffic-green/20 rounded-full flex items-center justify-center mx-auto">
                  <div className="w-6 h-6 bg-traffic-green rounded-full shadow-traffic-green" />
                </div>
                <h3 className="font-semibold">Green Light Detection</h3>
                <p className="text-sm text-muted-foreground">Identifies go signals with confidence</p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold">Pole Height Analysis</h3>
                <p className="text-sm text-muted-foreground">Estimates traffic light pole heights using perspective analysis</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;