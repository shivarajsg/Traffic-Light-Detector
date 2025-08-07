# Traffic Light Vision Detection System 🚦

An advanced AI-powered traffic light detection and classification system that uses computer vision to identify and analyze traffic signals in real-time. This project combines modern web technologies with machine learning to provide accurate traffic light detection with pole height estimation capabilities.

## 🔍 Project Overview

The Traffic Light Vision Detection System is a sophisticated web application that can:
- **Detect Traffic Lights**: Identify red, yellow, and green traffic signals in images
- **Real-time Camera Capture**: Use device camera to capture and analyze traffic scenes
- **Color Classification**: Advanced algorithm to determine the active color of traffic lights
- **Pole Height Estimation**: Calculate approximate heights of traffic light poles using perspective analysis
- **Confidence Scoring**: Provide accuracy metrics for each detection

## 🎯 Key Features

### Core Detection Capabilities
- **Multi-color Detection**: Accurately identifies Red, Yellow/Amber, and Green traffic lights
- **Arrow Signal Support**: Detects directional arrow signals including dim green arrows
- **Sensitivity Adjustment**: Multiple brightness thresholds for various lighting conditions
- **Bounding Box Visualization**: Visual overlay showing detected traffic lights with confidence scores

### Advanced Analysis
- **Pole Height Estimation**: Uses perspective analysis to estimate traffic light pole heights
- **Confidence Metrics**: Detailed confidence scores for each detection
- **JSON Output**: Structured data output for integration with other systems
- **Real-time Processing**: Live camera feed analysis capabilities

## 🛠️ Technology Stack

### Frontend Technologies
- **React 18**: Modern React with hooks for component state management
- **TypeScript**: Type-safe development with enhanced IDE support
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **shadcn/ui**: Modern UI component library built on Radix UI

### AI/ML Components
- **Hugging Face Transformers**: Browser-based machine learning inference
- **DETR (Detection Transformer)**: Object detection model (Xenova/detr-resnet-50)
- **WebGPU**: Hardware-accelerated AI inference in the browser

### UI/UX Libraries
- **Lucide React**: Beautiful icon library
- **Sonner**: Toast notifications
- **React Query**: Data fetching and caching
- **React Router**: Client-side routing

## 🧠 How It Works

### 1. Image Input
The system accepts images through two methods:
- **File Upload**: Users can upload JPEG/PNG images
- **Camera Capture**: Real-time camera access with environment-facing preference

### 2. Object Detection Pipeline
```typescript
// Core detection flow
const detector = await pipeline(
  'object-detection',
  'Xenova/detr-resnet-50',
  { device: 'webgpu', dtype: 'fp32' }
);

const results = await detector(selectedImage);
```

### 3. Traffic Light Filtering
The system filters detected objects for traffic-related items:
```typescript
const trafficLightDetections = results.filter((item) => {
  const label = item.label.toLowerCase();
  return item.score > 0.1 && (
    label.includes('traffic') || 
    label.includes('light') || 
    label.includes('signal') ||
    // ... additional keywords
  );
});
```

### 4. Color Analysis Algorithm
The color classification uses multi-level brightness analysis:

#### Bright Pixel Analysis (Primary)
- Analyzes pixels with brightness > 60
- Determines dominant color using RGB averages
- Applies threshold-based classification

#### Dim Pixel Analysis (Secondary)
- Handles dull/dim traffic lights (brightness 25-60)
- More sensitive thresholds for arrow signals
- Fallback for challenging lighting conditions

#### Ultra-Dim Analysis (Tertiary)
- Detects extremely dim signals (brightness 10-25)
- Ultra-sensitive detection for barely visible arrows
- Last resort classification with minimal thresholds

```typescript
const analyzeTrafficLightColor = (imageData: ImageData): string => {
  // Multi-level brightness analysis
  if (brightPixels > 0) {
    // Primary analysis for well-lit signals
  } else if (dimPixels > 0) {
    // Secondary analysis for dim signals
  } else if (veryDimPixels > 0) {
    // Tertiary analysis for ultra-dim signals
  }
  
  return colorClassification;
};
```

### 5. Pole Height Estimation
Uses perspective geometry to estimate pole heights:
- Analyzes traffic light position in image
- Applies perspective correction algorithms
- Provides height estimates with confidence scores

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── TrafficLightDetector.tsx    # Main detection visualization
│   ├── DetectionResults.tsx        # Results display and analysis
│   ├── PoleHeightDetector.tsx      # Pole height estimation
│   └── ui/                         # Reusable UI components
├── pages/
│   ├── Index.tsx         # Main application page
│   └── NotFound.tsx      # 404 error page
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
└── assets/               # Static assets
```

### Key Components Explained

#### `TrafficLightDetector.tsx`
- Renders images with detection overlays
- Draws bounding boxes around detected traffic lights
- Color-coded visualization (red, yellow, green)
- Confidence score display

#### `DetectionResults.tsx`
- Displays detailed detection results
- Confidence metrics and statistics
- JSON output for technical users
- Traffic light status indicators

#### `PoleHeightDetector.tsx`
- Analyzes pole heights using perspective geometry
- Provides height estimates with confidence scores
- Reference-based calculations

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Modern web browser with WebGPU support (Chrome/Edge recommended)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/MohanR007/traffic-light-vision.git
cd traffic-light-vision
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Start development server**
```bash
npm run dev
# or
yarn dev
```

4. **Open in browser**
Navigate to `http://localhost:5173`

### Build for Production
```bash
npm run build
# or
yarn build
```

## 🔧 Configuration

### Environment Variables
The project uses default configurations, but you can customize:
- Detection confidence thresholds
- Model parameters
- UI themes

### Model Configuration
```typescript
const detector = await pipeline(
  'object-detection',
  'Xenova/detr-resnet-50',  # Pre-trained model
  { 
    device: 'webgpu',       # Hardware acceleration
    dtype: 'fp32'           # Precision
  }
);
```

## 📊 Detection Algorithm Details

### Color Classification Thresholds

#### Red Light Detection
- Bright: `avgRed > avgGreen + 20 && avgRed > avgBlue + 20`
- Dim: `dimAvgRed > dimAvgGreen + 8 && dimAvgRed > dimAvgBlue + 8`

#### Green Light Detection
- Bright: `avgGreen > avgRed + 8 && avgGreen > avgBlue + 8`
- Dim: `dimAvgGreen > dimAvgRed + 3 && dimAvgGreen > dimAvgBlue + 3`
- Ultra-sensitive: `veryDimAvgGreen > veryDimAvgRed + 1`

#### Yellow Light Detection
- Bright: `avgRed > 130 && avgGreen > 100 && avgBlue < 100`
- Dim: `dimAvgRed > 60 && dimAvgGreen > 45 && dimAvgBlue < 60`

## 🎨 UI/UX Features

### Modern Design Elements
- **Gradient Backgrounds**: Beautiful gradient overlays
- **Glass Morphism**: Backdrop blur effects for cards
- **Animated Icons**: Pulse animations for active states
- **Responsive Layout**: Mobile-first responsive design
- **Dark Theme**: Modern dark theme with accent colors

### Interactive Elements
- **Progress Indicators**: Real-time analysis progress
- **Toast Notifications**: User feedback system
- **Badge System**: Color-coded confidence indicators
- **Canvas Overlays**: Interactive detection visualization

## 🔍 Performance Optimizations

### AI Model Optimization
- **WebGPU Acceleration**: Hardware-accelerated inference
- **Model Caching**: Efficient model loading and reuse
- **Batch Processing**: Optimized for single-image analysis

### Frontend Optimizations
- **Code Splitting**: Lazy loading for better performance
- **Image Optimization**: Efficient canvas rendering
- **Memory Management**: Proper cleanup of camera streams

## 🐛 Troubleshooting

### Common Issues

#### Camera Access Issues
- Ensure HTTPS connection for camera permissions
- Check browser camera permissions
- Verify camera hardware availability

#### Detection Accuracy
- Use well-lit images for better accuracy
- Ensure traffic lights are clearly visible
- Try different angles for better detection

#### Performance Issues
- Enable WebGPU in browser settings
- Use modern browsers (Chrome/Edge recommended)
- Close other resource-intensive applications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- **Hugging Face**: For providing the transformers library and pre-trained models
- **DETR Team**: For the Detection Transformer architecture
- **shadcn/ui**: For the beautiful UI component library
- **Radix UI**: For accessible component primitives

## 📞 Support

For support, email [your-email@example.com] or create an issue on GitHub.

---

*Built with ❤️ using React, TypeScript, and AI*
