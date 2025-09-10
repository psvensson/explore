# My Dungeon Web
My Dungeon Web is a web-based application for exploring and interacting with procedurally generated dungeons in a 3D environment. The project uses vanilla HTML, CSS, ES6 JavaScript, and the three.js library for 3D rendering.

## Project Structure

The project is organized as follows:

```
my-dungeon-web/
├── docs/                # Static site files (index.html, assets, styles, scripts)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
├── src/                 # Source code for dungeon generation and rendering
│   ├── generator/
│   ├── renderer/
│   └── ui/
├── LICENSE
├── README.md
└── package.json         # (optional, if using npm for dependencies)
```

- **docs/**: Contains the static files for deployment (HTML, CSS, JS, assets).
- **src/**: Contains modular source code for the dungeon generator, 3D renderer, and UI logic.
- **LICENSE** and **README.md**: Project documentation and license information.

## Getting Started

Clone the repository and open `docs/index.html` in your web browser. The app is designed for GitHub Pages deployment.

## Installation

1. Clone the repository:
    ```sh
    git clone <repository-url>
    ```

2. Navigate to the project directory:
    ```sh
    cd my-dungeon-web
    ```

3. Open `docs/index.html` in your preferred browser.

## Usage

- Use UI controls to customize dungeon generation.
- Explore the dungeon in 3D using zoom and pan.
- Adjust parameters and view updates in real time.

## Contributing

Fork the repository and submit a pull request to contribute.

## License

MIT License. See LICENSE for details.