import { ATLAS_COLUMNS, ATLAS_ROWS } from "../utils/constants.js";

export const BLOCK = Object.freeze({
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  PLANKS: 4,
  LOG: 5,
  LEAVES: 6,
  SAND: 7,
  BRICK: 8,
  BEDROCK: 9,
  WATER: 10,
  TORCH: 11,
  GLOW_BLOCK: 11,
  COBBLESTONE: 12,
  GLASS: 13,
  DARK_PLANKS: 14,
  STONE_BRICKS: 15,
  GRAVEL: 16,
  SNOW: 17,
  CLAY: 18,
  BOOKSHELF: 19,
  OBSIDIAN: 20,
  TORCH_WEST: 21,
  TORCH_EAST: 22,
  TORCH_NORTH: 23,
  TORCH_SOUTH: 24,
  FLOWER_RED: 25,
  FLOWER_YELLOW: 26,
  TALL_GRASS: 27,
  COAL_ORE: 28,
  IRON_ORE: 29,
  GOLD_ORE: 30,
  DIAMOND_ORE: 31,
  MOSS_BLOCK: 32,
  NETHERRACK: 33,
  QUARTZ_BLOCK: 34,
});

export const TORCH_VARIANTS = Object.freeze([
  BLOCK.TORCH_WEST,
  BLOCK.TORCH_EAST,
  BLOCK.TORCH_NORTH,
  BLOCK.TORCH_SOUTH,
]);

const LIGHT_SOURCE_BLOCKS = Object.freeze([BLOCK.GLOW_BLOCK]);
const PLANT_BLOCKS = Object.freeze([BLOCK.TALL_GRASS]);

const TILE_BY_NAME = Object.freeze({
  grass_top: { x: 0, y: 0 },
  grass_side: { x: 1, y: 0 },
  dirt: { x: 2, y: 0 },
  stone: { x: 3, y: 0 },
  planks: { x: 4, y: 0 },
  log_side: { x: 5, y: 0 },
  log_top: { x: 6, y: 0 },
  leaves: { x: 7, y: 0 },
  sand: { x: 0, y: 1 },
  brick: { x: 1, y: 1 },
  bedrock: { x: 2, y: 1 },
  water: { x: 3, y: 1 },
  torch: { x: 4, y: 1 },
  cobblestone: { x: 5, y: 1 },
  glass: { x: 6, y: 1 },
  dark_planks: { x: 7, y: 1 },
  stone_bricks: { x: 0, y: 2 },
  gravel: { x: 1, y: 2 },
  snow: { x: 2, y: 2 },
  clay: { x: 3, y: 2 },
  bookshelf_side: { x: 4, y: 2 },
  bookshelf_top: { x: 5, y: 2 },
  obsidian: { x: 6, y: 2 },
  torch_stick: { x: 7, y: 2 },
  torch_head: { x: 0, y: 3 },
  coal_ore: { x: 1, y: 3 },
  iron_ore: { x: 2, y: 3 },
  gold_ore: { x: 3, y: 3 },
  diamond_ore: { x: 4, y: 3 },
});

const BLOCK_DEFS = Object.freeze({
  [BLOCK.AIR]: {
    id: BLOCK.AIR,
    name: "air",
    displayName: "air",
    solid: false,
    transparent: true,
    render: false,
    breakable: false,
    replaceable: true,
    creative: false,
    shape: "cube",
    uiColor: "#000000",
    textures: { all: "dirt" },
  },
  [BLOCK.GRASS]: {
    id: BLOCK.GRASS,
    name: "grass",
    displayName: "grass",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#66b149",
    textures: { top: "grass_top", bottom: "grass_top", side: "grass_top" },
  },
  [BLOCK.DIRT]: {
    id: BLOCK.DIRT,
    name: "dirt",
    displayName: "dirt",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#7e4c25",
    textures: { all: "dirt" },
  },
  [BLOCK.STONE]: {
    id: BLOCK.STONE,
    name: "stone",
    displayName: "stone",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#868686",
    textures: { all: "stone" },
  },
  [BLOCK.PLANKS]: {
    id: BLOCK.PLANKS,
    name: "planks",
    displayName: "planks",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#bd9151",
    textures: { all: "planks" },
  },
  [BLOCK.LOG]: {
    id: BLOCK.LOG,
    name: "log",
    displayName: "log",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#8b653f",
    textures: { top: "log_top", bottom: "log_top", side: "log_side" },
  },
  [BLOCK.LEAVES]: {
    id: BLOCK.LEAVES,
    name: "leaves",
    displayName: "leaves",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#4f8b43",
    textures: { all: "leaves" },
  },
  [BLOCK.SAND]: {
    id: BLOCK.SAND,
    name: "sand",
    displayName: "sand",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#ddca84",
    textures: { all: "sand" },
  },
  [BLOCK.BRICK]: {
    id: BLOCK.BRICK,
    name: "brick",
    displayName: "brick",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#9e5342",
    textures: { all: "brick" },
  },
  [BLOCK.BEDROCK]: {
    id: BLOCK.BEDROCK,
    name: "bedrock",
    displayName: "bedrock",
    solid: true,
    transparent: false,
    render: true,
    breakable: false,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#545454",
    textures: { all: "bedrock" },
  },
  [BLOCK.WATER]: {
    id: BLOCK.WATER,
    name: "water",
    displayName: "water",
    solid: false,
    transparent: true,
    render: true,
    breakable: false,
    replaceable: true,
    creative: true,
    shape: "cube",
    uiColor: "#4f83d8",
    textures: { all: "water" },
  },
  [BLOCK.TORCH]: {
    id: BLOCK.TORCH,
    name: "glow_block",
    displayName: "glow block",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#ffd77a",
    textures: { all: "torch_head" },
  },
  [BLOCK.COBBLESTONE]: {
    id: BLOCK.COBBLESTONE,
    name: "cobblestone",
    displayName: "cobblestone",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#7f8288",
    textures: { all: "cobblestone" },
  },
  [BLOCK.GLASS]: {
    id: BLOCK.GLASS,
    name: "glass",
    displayName: "glass",
    solid: true,
    transparent: true,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#b8ddf2",
    textures: { all: "glass" },
  },
  [BLOCK.DARK_PLANKS]: {
    id: BLOCK.DARK_PLANKS,
    name: "dark_planks",
    displayName: "dark planks",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#8a6742",
    textures: { all: "dark_planks" },
  },
  [BLOCK.STONE_BRICKS]: {
    id: BLOCK.STONE_BRICKS,
    name: "stone_bricks",
    displayName: "stone bricks",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#8a9097",
    textures: { all: "stone_bricks" },
  },
  [BLOCK.GRAVEL]: {
    id: BLOCK.GRAVEL,
    name: "gravel",
    displayName: "gravel",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#8f8984",
    textures: { all: "gravel" },
  },
  [BLOCK.SNOW]: {
    id: BLOCK.SNOW,
    name: "snow",
    displayName: "snow block",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#eff7ff",
    textures: { all: "snow" },
  },
  [BLOCK.CLAY]: {
    id: BLOCK.CLAY,
    name: "clay",
    displayName: "clay",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#9ea8be",
    textures: { all: "clay" },
  },
  [BLOCK.BOOKSHELF]: {
    id: BLOCK.BOOKSHELF,
    name: "bookshelf",
    displayName: "bookshelf",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#a57a4d",
    textures: { top: "bookshelf_top", bottom: "bookshelf_top", side: "bookshelf_side" },
  },
  [BLOCK.OBSIDIAN]: {
    id: BLOCK.OBSIDIAN,
    name: "obsidian",
    displayName: "obsidian",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#322654",
    textures: { all: "obsidian" },
  },
  [BLOCK.FLOWER_RED]: {
    id: BLOCK.FLOWER_RED,
    name: "flower_red",
    displayName: "red flower",
    solid: false,
    transparent: true,
    render: false,
    breakable: true,
    replaceable: true,
    creative: false,
    shape: "cross",
    uiColor: "#cb4f45",
    textures: { all: "brick" },
  },
  [BLOCK.FLOWER_YELLOW]: {
    id: BLOCK.FLOWER_YELLOW,
    name: "flower_yellow",
    displayName: "yellow flower",
    solid: false,
    transparent: true,
    render: false,
    breakable: true,
    replaceable: true,
    creative: false,
    shape: "cross",
    uiColor: "#efc862",
    textures: { all: "torch_head" },
  },
  [BLOCK.TALL_GRASS]: {
    id: BLOCK.TALL_GRASS,
    name: "tall_grass",
    displayName: "tall grass",
    solid: false,
    transparent: true,
    render: true,
    breakable: true,
    replaceable: true,
    creative: false,
    shape: "cross",
    uiColor: "#5e9f44",
    textures: { all: "grass_side" },
  },
  [BLOCK.COAL_ORE]: {
    id: BLOCK.COAL_ORE,
    name: "coal_ore",
    displayName: "coal ore",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#585b60",
    textures: { all: "coal_ore" },
  },
  [BLOCK.IRON_ORE]: {
    id: BLOCK.IRON_ORE,
    name: "iron_ore",
    displayName: "iron ore",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#8e8b84",
    textures: { all: "iron_ore" },
  },
  [BLOCK.GOLD_ORE]: {
    id: BLOCK.GOLD_ORE,
    name: "gold_ore",
    displayName: "gold ore",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#c6ae63",
    textures: { all: "gold_ore" },
  },
  [BLOCK.DIAMOND_ORE]: {
    id: BLOCK.DIAMOND_ORE,
    name: "diamond_ore",
    displayName: "diamond ore",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#67c3d4",
    textures: { all: "diamond_ore" },
  },
  [BLOCK.MOSS_BLOCK]: {
    id: BLOCK.MOSS_BLOCK,
    name: "moss_block",
    displayName: "moss block",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#537f45",
    textures: { all: "leaves" },
  },
  [BLOCK.NETHERRACK]: {
    id: BLOCK.NETHERRACK,
    name: "netherrack",
    displayName: "netherrack",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#9c4c45",
    textures: { all: "brick" },
  },
  [BLOCK.QUARTZ_BLOCK]: {
    id: BLOCK.QUARTZ_BLOCK,
    name: "quartz_block",
    displayName: "quartz block",
    solid: true,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: false,
    creative: true,
    shape: "cube",
    uiColor: "#e9edf2",
    textures: { all: "snow" },
  },
  [BLOCK.TORCH_WEST]: {
    id: BLOCK.TORCH_WEST,
    name: "torch_west",
    displayName: "legacy torch",
    solid: false,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: true,
    creative: false,
    shape: "torch",
    uiColor: "#f0c96b",
    textures: { all: "torch" },
  },
  [BLOCK.TORCH_EAST]: {
    id: BLOCK.TORCH_EAST,
    name: "torch_east",
    displayName: "torch",
    solid: false,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: true,
    creative: false,
    shape: "torch",
    uiColor: "#f0c96b",
    textures: { all: "torch" },
  },
  [BLOCK.TORCH_NORTH]: {
    id: BLOCK.TORCH_NORTH,
    name: "torch_north",
    displayName: "torch",
    solid: false,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: true,
    creative: false,
    shape: "torch",
    uiColor: "#f0c96b",
    textures: { all: "torch" },
  },
  [BLOCK.TORCH_SOUTH]: {
    id: BLOCK.TORCH_SOUTH,
    name: "torch_south",
    displayName: "torch",
    solid: false,
    transparent: false,
    render: true,
    breakable: true,
    replaceable: true,
    creative: false,
    shape: "torch",
    uiColor: "#f0c96b",
    textures: { all: "torch" },
  },
});

const CREATIVE_BLOCK_IDS = Object.freeze(
  Object.values(BLOCK_DEFS)
    .filter((def) => def.creative)
    .map((def) => def.id)
);

export function getBlockType(id) {
  return BLOCK_DEFS[id] || BLOCK_DEFS[BLOCK.AIR];
}

export function getBlockDisplayName(id) {
  return getBlockType(id).displayName;
}

export function isBlockSolid(id) {
  return getBlockType(id).solid;
}

export function isBlockTransparent(id) {
  return getBlockType(id).transparent;
}

export function isBlockRenderable(id) {
  return getBlockType(id).render;
}

export function isBlockBreakable(id) {
  return getBlockType(id).breakable;
}

export function isBlockReplaceable(id) {
  return getBlockType(id).replaceable;
}

export function isTorchBlock(id) {
  return TORCH_VARIANTS.includes(id);
}

export function isBlockCube(id) {
  return getBlockType(id).shape === "cube";
}

export function isLightSourceBlock(id) {
  return LIGHT_SOURCE_BLOCKS.includes(id) || isTorchBlock(id);
}

export function isPlantBlock(id) {
  return PLANT_BLOCKS.includes(id);
}

export function getHotbarColor(id) {
  return getBlockType(id).uiColor;
}

export function getCreativeBlockIds() {
  return CREATIVE_BLOCK_IDS.slice();
}

export function getFaceTile(id, faceName) {
  const def = getBlockType(id);
  const textures = def.textures;
  if (typeof textures === "string") {
    return TILE_BY_NAME[textures] || TILE_BY_NAME.dirt;
  }
  const textureName = textures[faceName] || textures.side || textures.all || "dirt";
  return TILE_BY_NAME[textureName] || TILE_BY_NAME.dirt;
}

export function getTileByName(name) {
  return TILE_BY_NAME[name] || TILE_BY_NAME.dirt;
}

export function getAtlasUV(tile) {
  const uStep = 1 / ATLAS_COLUMNS;
  const vStep = 1 / ATLAS_ROWS;

  const insetU = uStep * 0.04;
  const insetV = vStep * 0.04;

  const u0 = tile.x * uStep + insetU;
  const v0 = 1 - (tile.y + 1) * vStep + insetV;
  const u1 = (tile.x + 1) * uStep - insetU;
  const v1 = 1 - tile.y * vStep - insetV;

  return { u0, v0, u1, v1 };
}
