export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Y = 48;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_VOLUME = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z;

export const WORLD_SEED = 1337;
export const WORLD_RENDER_RADIUS = 4;
export const WORLD_UNLOAD_RADIUS = WORLD_RENDER_RADIUS + 2;
export const CHUNK_LOADS_PER_FRAME = 1;
export const CHUNK_REBUILDS_PER_FRAME = 1;
export const WATER_LEVEL = 10;

export const ATLAS_COLUMNS = 8;
export const ATLAS_ROWS = 8;
export const HOTBAR_BLOCK_IDS = [2, 3, 4, 14, 7, 8, 12, 13, 11];
export const ACTION_REPEAT_INTERVAL = 0.25;

export const PLAYER_STAND_HEIGHT = 1.8;
export const PLAYER_CROUCH_HEIGHT = 1.5;
export const PLAYER_STAND_EYE_HEIGHT = 1.62;
export const PLAYER_CROUCH_EYE_HEIGHT = 1.32;
export const PLAYER_RADIUS = 0.35;
export const PLAYER_MOVE_SPEED = 4.8;
export const PLAYER_CROUCH_SPEED = 2.35;
export const PLAYER_SPRINT_SPEED = 7.8;
export const PLAYER_JUMP_SPEED = 7.4;
export const PLAYER_GRAVITY = 24.0;
export const PLAYER_MAX_FALL_SPEED = 32.0;
export const PLAYER_SWIM_SPEED = 2.8;
export const PLAYER_SWIM_UP_SPEED = 3.8;
export const PLAYER_SWIM_DOWN_SPEED = 2.4;
export const PLAYER_WATER_GRAVITY = 4.8;
export const PLAYER_WATER_DRAG = 3.2;
export const SPRINT_DOUBLE_TAP_WINDOW = 0.3;
export const FLIGHT_DOUBLE_TAP_WINDOW = 0.32;
export const PLAYER_FLY_SPEED = 9.2;
export const PLAYER_FLY_VERTICAL_SPEED = 6.8;
export const MOUSE_SENSITIVITY = 0.0022;

export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 320;
export const SPRINT_FOV_BOOST = 8;
export const SPRINT_FOV_SMOOTH = 8;
export const RENDER_PIXEL_RATIO_MAX = 1.25;
export const HELD_ITEM_PIXEL_RATIO_MAX = 1.25;

export const SKY_COLOR = 0x8cc9ff;
export const FOG_NEAR = 35;
export const FOG_FAR = 180;
export const DAY_DURATION_SECONDS = 300;
export const NIGHT_DURATION_SECONDS = 300;
export const STAR_COUNT = 220;
export const CLOUD_COUNT = 36;
export const CLOUD_HEIGHT = 54;

export const MAX_RAY_DISTANCE = 6;
export const MAX_DELTA_TIME = 0.05;

export const ANIMAL_MAX_COUNT = 10;
export const ANIMAL_SPAWN_INTERVAL = 6.0;
export const ANIMAL_SPAWN_RADIUS = 72;
export const ANIMAL_ATTACK_RANGE = 4.6;
export const ANIMAL_HP = 5;
export const ZOMBIE_MAX_COUNT = 8;
export const ZOMBIE_SPAWN_INTERVAL = 10.0;
export const ZOMBIE_SPAWN_RADIUS_MIN = 12;
export const ZOMBIE_SPAWN_RADIUS_MAX = 52;
export const ZOMBIE_DESPAWN_RADIUS = 96;
export const ZOMBIE_CHASE_RADIUS = 36;
export const ZOMBIE_SPEED = 2.2;
export const ZOMBIE_HP = 12;
export const ZOMBIE_ATTACK_RANGE = 1.35;
export const ZOMBIE_ATTACK_DAMAGE = 1;
export const ZOMBIE_ATTACK_COOLDOWN = 1.1;
export const ZOMBIE_HIT_RANGE = 4.6;
export const ZOMBIE_SUN_BURN_INTERVAL = 1.0;
export const ZOMBIE_SUN_BURN_DAMAGE = 1;
export const INVENTORY_STORAGE_SLOTS = 27;
export const INVENTORY_COLUMNS = 9;
export const INVENTORY_CREATIVE_COLUMNS = 9;
export const INVENTORY_CREATIVE_ROWS = 6;
export const TORCH_LIGHT_RADIUS = 22;
export const TORCH_LIGHT_INTENSITY = 4.6;
export const TORCH_MAX_ACTIVE_LIGHTS = 16;
export const SUN_SHADOW_MAP_SIZE = 1024;
export const SUN_SHADOW_RANGE = 46;

export const MUSIC_VOLUME = 0.25;
export const MUSIC_TRACKS = [
  "./assets/audio/track1.mp3",
  "./assets/audio/track2.mp3",
  "./assets/audio/track3.mp3",
  "./assets/audio/track4.mp3",
  "./assets/audio/track5.mp3",
  "./assets/audio/track6.mp3",
];
export const SFX_MASTER_VOLUME = 0.5;
export const SFX_BREAK_VOLUME = 0.5;
export const SFX_FOOTSTEP_VOLUME = 0.4;
