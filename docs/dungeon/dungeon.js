// This file contains the dungeon generation logic. It includes functions to create and visualize dungeons based on specified parameters.

export class DungeonGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.dungeon = this.createEmptyDungeon();
    }

    createEmptyDungeon() {
        const dungeon = [];
        for (let i = 0; i < this.height; i++) {
            dungeon[i] = Array(this.width).fill(0);
        }
        return dungeon;
    }

    generateDungeon() {
        // Simple random generation for demonstration purposes
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                this.dungeon[i][j] = Math.random() < 0.3 ? 1 : 0; // 30% chance of wall
            }
        }
        this.visualizeDungeon();
    }

    visualizeDungeon() {
        const dungeonContainer = document.getElementById('dungeon-container');
        if (!dungeonContainer) return; // graceful exit if container missing
        dungeonContainer.innerHTML = ''; // Clear previous visualization

        this.dungeon.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'dungeon-row';
            row.forEach(cell => {
                const cellDiv = document.createElement('div');
                cellDiv.className = cell === 1 ? 'wall' : 'floor';
                rowDiv.appendChild(cellDiv);
            });
            dungeonContainer.appendChild(rowDiv);
        });
    }
}

if (typeof window !== 'undefined' && !(typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID)) {
    window.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('dungeon-container');
        if (container) {
            const gen = new DungeonGenerator(10, 10);
            gen.generateDungeon();
            window.dungeonGenerator = gen;
        }
    });
}