import { DungeonGenerator } from '../docs/dungeon/dungeon.js';

describe('dungeon generator', () => {
  test('generates without container safely', () => {
    const gen = new DungeonGenerator(5,5);
    gen.generateDungeon();
    expect(gen.dungeon.length).toBe(5);
  });
  test('renders when container present', () => {
    document.body.innerHTML='<div id="dungeon-container"></div>';
    const gen = new DungeonGenerator(4,4);
    gen.generateDungeon();
    expect(document.querySelectorAll('#dungeon-container .dungeon-row').length).toBe(4);
  });
});
