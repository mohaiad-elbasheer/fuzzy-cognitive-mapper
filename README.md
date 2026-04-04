# Fuzzy Cognitive Mapper

An interactive dashboard for modeling complex systems using **Fuzzy Cognitive Mapping (FCM)** and causal simulations.

![FCM Screenshot](https://via.placeholder.com/800x400?text=Fuzzy+Cognitive+Mapper)

## What is FCM?

Fuzzy Cognitive Maps are soft computing models used to represent causal relationships between concepts in complex systems. They are widely used in:
- Policy analysis and strategic planning
- Decision support systems
- Systems thinking and scenario modeling
- Knowledge representation

## Features

### Core Functionality
- **Visual Graph Editor** - Create and edit FCM models with drag-and-drop
- **Real-time Simulation** - Run inference with sigmoid/tanh activation functions
- **Multiple Activation Functions** - Sigmoid, Tanh, Bivalent, Trivalent, Linear
- **Configurable Linguistic Scales** - 5, 7, 9, or 11-point scales
- **Membership Function Visualization** - Triangular, Trapezoidal, Gaussian

### Views
- **Canvas** - Interactive visual graph editing
- **Matrix** - Adjacency matrix for direct weight manipulation
- **Data** - JSON export of your model
- **Inference** - Semantic analysis of simulation results

### User Experience
- **Dual Themes** - Modern dark mode and academic light mode
- **Keyboard Shortcuts** - Undo/redo (Ctrl+Z/Y), copy/paste, delete
- **Auto-layout** - Automatic graph organization using dagre algorithm
- **Export** - Download your FCM as a PNG image

## Quick Start

### Prerequisites
- Node.js 18+ (recommended: 20+)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/fuzzy-cognitive-mapper.git
cd fuzzy-cognitive-mapper

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview
```

## Usage Guide

### Creating a Model

1. **Add Concepts** - Click "Add Concept" button or use the + button in sidebar
2. **Connect Concepts** - Drag from a handle on one node to another node
3. **Set Weights** - Click edges to adjust causal weights (-1 to +1)
4. **Set Initial States** - Adjust each concept's starting activation (0-1)

### Running Simulations

1. Configure activation function (Sigmoid or Tanh) in the sidebar
2. Adjust Lambda parameter for sensitivity
3. Click "Run Engine" to execute simulation
4. View results in the chart and inference tab

### Advanced Features

Expand the "Advanced" section in the sidebar to access:
- **Linguistic Scale** - Choose from 5, 7, 9, or 11-point scales
- **Membership Functions** - Select Triangular, Trapezoidal, or Gaussian
- **Visualization** - Toggle to see membership function curves

## Deployment

### GitHub Pages (Recommended)

This project includes automatic deployment to GitHub Pages:

1. Push your code to the `main` branch
2. GitHub Actions will automatically build and deploy
3. Access your app at `https://YOUR_USERNAME.github.io/fuzzy-cognitive-mapper/`

### Manual Deployment

```bash
npm run build
# Upload the 'dist' folder to any static hosting service
```

### Other Platforms

- **Vercel**: Connect your GitHub repo - auto-detected as Vite project
- **Netlify**: Connect your GitHub repo - auto-detected as Vite project
- **Docker**: See Dockerfile example in documentation

## Project Structure

```
fuzzy-cognitive-mapper/
├── src/
│   ├── components/      # React components
│   │   ├── Canvas.tsx       # Graph visualization
│   │   ├── FCMNode.tsx      # Node component
│   │   ├── FCMEdge.tsx      # Edge component
│   │   ├── Sidebar.tsx      # Configuration panel
│   │   ├── MatrixEditor.tsx # Matrix view
│   │   ├── InferenceTab.tsx # Analysis view
│   │   └── ...
│   ├── logic/
│   │   └── fcmEngine.ts     # Simulation engine
│   ├── types.ts             # TypeScript definitions
│   ├── App.tsx              # Main application
│   └── main.tsx             # Entry point
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions deployment
├── package.json
├── vite.config.ts
└── README.md
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| @xyflow/react | Graph Visualization |
| Recharts | Charts |
| Tailwind CSS 4 | Styling |
| Framer Motion | Animations |
| dagre | Graph Layout |

## FCM Theory

### Inference Formula

The standard FCM inference rule:

```
A_i(k+1) = f( Σ A_j(k) · w_ji + A_i(k) )
```

Where:
- `A_i(k)` is the activation of concept i at iteration k
- `w_ji` is the weight from concept j to concept i
- `f` is the activation function (sigmoid, tanh, etc.)

### Linguistic Terms

Causal relationships are expressed using fuzzy linguistic terms:

| Term | Value |
|------|-------|
| Very Strong − | -1.0 |
| Strong − | -0.75 |
| Medium − | -0.5 |
| Weak − | -0.25 |
| Zero | 0 |
| Weak + | +0.25 |
| Medium + | +0.5 |
| Strong + | +0.75 |
| Very Strong + | +1.0 |

## Roadmap

- [ ] Extended FCM (E-FCM) with interval weights
- [ ] Temporal FCM with time delays
- [ ] Rule-based FCM integration
- [ ] AI-powered inference explanations (Gemini API)
- [ ] Import/Export to standard FCM formats
- [ ] Collaborative editing

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - feel free to use this project for academic or commercial purposes.

## References

- Kosko, B. (1986). Fuzzy cognitive maps. International Journal of Man-Machine Studies
- Papageorgiou, E.I. (2014). Fuzzy Cognitive Maps for Applied Sciences and Engineering

---

Built with care for the FCM research community.
