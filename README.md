# Fuzzy Cognitive Mapper

An interactive web-based dashboard for modeling complex systems using **Fuzzy Cognitive Mapping (FCM)** and causal simulations.

## What is FCM?

Fuzzy Cognitive Maps are soft computing models that represent causal relationships between concepts in complex systems. They are widely used in:
- Policy analysis and strategic planning
- Decision support systems
- Systems thinking and scenario modeling
- Knowledge representation and reasoning

## Features

### Core Functionality
- **Visual Graph Editor** - Create and edit FCM models with intuitive drag-and-drop
- **Real-time Simulation** - Run inference with multiple activation functions
- **Configurable Linguistic Scales** - 5, 7, 9, or 11-point scales
- **Membership Function Visualization** - Triangular, Trapezoidal, Gaussian

### Multiple Views
- **Canvas** - Interactive visual graph editing
- **Matrix** - Adjacency matrix for direct weight manipulation  
- **Data** - JSON import/export with live editing
- **Inference** - Semantic analysis of simulation results

### User Experience
- **Dual Themes** - Modern dark mode and academic light mode
- **Keyboard Shortcuts** - Undo/redo, copy/paste, delete
- **Auto-layout** - Automatic graph organization
- **Export** - Download your FCM as PNG image

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

### Development Scripts

```bash
npm run lint        # ESLint (typescript-eslint + react-hooks)
npm run typecheck   # TypeScript type checking
npm test            # Unit tests (Vitest)
npm run test:watch  # Unit tests in watch mode
```

CI runs lint, typecheck, tests, and the production build on every pull request.

## Usage

1. **Add Concepts** - Click "Add Concept" or use the + button
2. **Create Relationships** - Drag from handles on one node to another
3. **Set Weights** - Click edges to adjust causal weights (-1 to +1)
4. **Run Simulation** - Configure parameters and click "Run Engine"
5. **Analyze Results** - View convergence in the chart and inference tab

## Tech Stack

- React 19 + TypeScript
- Vite
- @xyflow/react (graph visualization)
- Recharts
- Tailwind CSS 4
- Motion (Framer Motion successor)
- Vitest (unit tests)

## FCM Theory

### Inference Formula

```
A_i(k+1) = f( Σ A_j(k) · w_ji + A_i(k) )
```

Where:
- `A_i(k)` is the activation of concept i at iteration k
- `w_ji` is the causal weight from concept j to concept i
- `f` is the activation function (sigmoid, tanh, etc.)

## License

MIT

## References

- Kosko, B. (1986). Fuzzy cognitive maps. *International Journal of Man-Machine Studies*
- Papageorgiou, E.I. (2014). *Fuzzy Cognitive Maps for Applied Sciences and Engineering*
