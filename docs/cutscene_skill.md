---
name: cutscene
description: Reference for the dialogue, cutscene, and quest systems. Use when creating or modifying NPC dialogue trees, cutscene scripts, quest definitions, or narrative flag logic.
allowed-tools: Read, Grep, Edit, Write
---

# Dialogue, Cutscene & Quest System Reference

This skill provides comprehensive context for creating and modifying narrative content in Veilbreak.

---

## 1. Dialogue System

### Data File: `Data/dialogues.json`

Top-level structure is an array of dialogue trees:

```json
[
  {
    "tree_id": "tormund_dialogue",
    "root": "greeting",
    "nodes": {
      "greeting": { ... },
      "quest_intro": { ... },
      "exit": { ... }
    }
  }
]
```

### DialogueNode Properties

| Property | Type | Description |
|----------|------|-------------|
| `text` | string | NPC's spoken text (supports multi-page via typewriter) |
| `choices` | DialogueChoice[] | Player response options |
| `effects` | DialogueEffect[] | Effects applied when node is entered |
| `action` | string | `"close_dialogue"` or `"open_merchant_ui"` |
| `conditions` | DialogueCondition[] | Conditions to display this node (ALL must pass) |
| `fallback` | string | Alternative node ID if conditions fail |

### DialogueChoice Properties

| Property | Type | Description |
|----------|------|-------------|
| `text` | string | Player choice text shown in UI |
| `next` | string | Node ID to navigate to |
| `reputation_change` | float | One-time rep change with current NPC (tracked, never reapplied) |
| `conditions` | DialogueCondition[] | Conditions to show this choice (ALL must pass) |

### DialogueEffect Types

**reputation** — modify NPC reputation:
```json
{ "type": "reputation", "npc": "tormund", "value": 10 }
```

**quest** — trigger quest action:
```json
{ "type": "quest", "npc": "start_side:side_tormunds_hammer", "value": 0 }
```
The `npc` field format: `"start_side:<quest_id>"` to start a side quest.

**set_flag** — set a narrative flag:
```json
{ "type": "set_flag", "key": "met_blacksmith", "value": 1 }
```

### DialogueCondition Types & Operators

| Type | Key | Valid Ops | Value | Example |
|------|-----|-----------|-------|---------|
| `flag` | flag name | `set`, `not_set`, `eq`, `neq` | flag value | `{"type":"flag","key":"met_elder","op":"set"}` |
| `quest_stage` | _(unused)_ | `eq`,`neq`,`gt`,`lt`,`gte`,`lte` | stage number | `{"type":"quest_stage","op":"gte","value":"2"}` |
| `quest_status` | quest ID | `eq`, `neq` | `not_started`, `active`, `completed` | `{"type":"quest_status","key":"side_elara_herbs","op":"eq","value":"active"}` |
| `reputation` | NPC rep ID | `eq`,`neq`,`gt`,`lt`,`gte`,`lte` | number | `{"type":"reputation","key":"tormund","op":"gt","value":"50"}` |
| `has_item` | item base ID | `set`, `not_set` | _(unused)_ | `{"type":"has_item","key":"tormunds_hammer","op":"set"}` |
| `level` | _(unused)_ | `eq`,`neq`,`gt`,`lt`,`gte`,`lte` | level number | `{"type":"level","op":"gte","value":"5"}` |

### Dialogue UI Details

- **Portrait**: 6 lines tall, 17 chars wide ASCII art (defined in `npcs.json` → `dialogue_portrait`)
- **Typewriter**: 40 chars/sec, Space/Enter skips to end of page
- **Multi-page**: Text wraps at ~50 chars width, 6 lines per page, shows [Page/Total]
- **Choice selection**: Number keys 1-9, Up/Down arrows, mouse click
- **Colorization**: Text inside double quotes renders as speech (White), text outside quotes renders as narration (muted gray `rgb(160, 170, 180)`). Quote state tracks across pages so multi-page speech stays colored correctly.
- **ESC blocked during cutscenes**: Players cannot close dialogue with ESC while a cutscene is active — they must complete the dialogue tree.

### Node Flow

1. `StartDialogue(tree_id)` → evaluate root node conditions
2. If root conditions fail → use `fallback` node (or close)
3. On node entry → apply all `effects`
4. Show `text` with typewriter → show filtered `choices`
5. Player selects choice → apply `reputation_change` (once) → navigate to `next` node
6. If next node has `action` → execute and close/open merchant

---

## 2. Cutscene System

### Data File: `Data/cutscenes.json`

```json
{
  "cutscenes": [
    {
      "id": "intro_scene",
      "trigger": { ... },
      "steps": [ ... ]
    }
  ]
}
```

### Trigger Types

| Type | Fires When | Required Fields |
|------|-----------|-----------------|
| `zone_entry` | Player enters zone | `zone_id` |
| `npc_interact` | Player talks to NPC | `npc_id` |
| `quest_stage` | Main quest reaches stage | `quest_stage` (int) |
| `trigger_zone` | Player enters spatial trigger (from .entities TRIGGER) | _(matched by cutscene_id)_ |
| `battle_start` | Combat starts with mob | `mob_id` |
| `battle_end_death` | Mob is killed | `mob_id` |
| `battle_end_plot_armor` | Mob reaches HP threshold | `mob_id`, `hp_threshold_pct` (0.0-1.0) |

### Trigger Conditions

| Field | Description |
|-------|-------------|
| `flag` | Cutscene only fires if this narrative flag IS set |
| `flag_absent` | Cutscene only fires if this narrative flag is NOT set |

Example trigger:
```json
{
  "type": "zone_entry",
  "zone_id": "thornhollow",
  "flag_absent": "intro_seen"
}
```

### Step Actions

#### `move` — Move entity to position
```json
{ "action": "move", "entity_type": "npc", "entity_id": "ranger_npc", "x": 10.0, "y": 15.0, "speed": 4.0 }
```
Uses A* pathfinding (max 800 nodes). Default speed: 4.0. Aspect ratio corrected (2:1).

#### `dialogue` — Play a dialogue tree
```json
{ "action": "dialogue", "dialogue_tree": "ranger_greeting", "npc_id": "ranger_npc" }
```
Pauses cutscene until dialogue closes. `npc_id` provides portrait/name context.

#### `wait` — Pause for duration
```json
{ "action": "wait", "duration": 2.0 }
```

#### `sprite_state` — Change entity animation state
```json
{ "action": "sprite_state", "entity_type": "npc", "entity_id": "ranger_npc", "state": "talking" }
```
Common states: `"idle"`, `"moving"`, `"talking"`

#### `banner` — Show large ASCII art text overlay
```json
{ "action": "banner", "text": "Chapter 1", "color": "Yellow", "duration": 3.0 }
```
Uses Figgle Slant font. Full opacity 2s, then fades over 1s. Default duration: 3.0. Color is a SadConsole color name (White, Yellow, Red, Cyan, etc.).

#### `camera_pan` — Pan camera to world position
```json
{ "action": "camera_pan", "x": 50.0, "y": 30.0, "speed": 10.0 }
```
Detaches camera from player. Default speed: 10.0.

#### `camera_lock` — Lock camera to follow entity
```json
{ "action": "camera_lock", "entity_type": "npc", "entity_id": "ranger_npc", "speed": 10.0 }
```

#### `camera_release` — Return camera to player
```json
{ "action": "camera_release" }
```

#### `set_flag` — Set narrative flag
```json
{ "action": "set_flag", "flag": "intro_seen", "value": "true" }
```
Default value: `"true"`.

#### `zone_transition` — Transfer player to another zone
```json
{ "action": "zone_transition", "zone_id": "thornhollow", "target_x": 50.0, "target_y": 25.0 }
```

#### `spawn` — Spawn a mob
```json
{ "action": "spawn", "mob_def_id": "goblin", "x": 20.0, "y": 15.0 }
```

#### `despawn` — Remove entity from world
```json
{ "action": "despawn", "entity_type": "npc", "entity_id": "ranger_npc" }
```

#### `play_sfx` — Play a sound effect
```json
{ "action": "play_sfx", "text": "DoorOpen" }
```
The `text` field must match an `SfxId` enum value (case-insensitive). Available IDs include: `Hit`, `Miss`, `PlayerHit`, `Heal`, `LevelUp`, `Death`, `Loot`, `Equip`, `Buy`, `Sell`, `QuestComplete`, `DoorOpen`, `DoorClose`. See `src/Audio/SfxId.cs` for the full list.

#### `spawn_npc` — Spawn an NPC at a position
```json
{ "action": "spawn_npc", "entity_id": "elder_thorne", "x": 5.0, "y": 17.0 }
```
Spawns an NPC by definition ID (from `npcs.json`) at the given coordinates. Useful for cutscenes where an NPC should not be pre-placed in the `.entities` file (e.g., an NPC who "enters" the scene).

#### `heal` — Restore entity HP
```json
{ "action": "heal", "entity_type": "player", "entity_id": "player", "amount": null }
```
`amount: null` = full heal.

### Parallel Execution

Set `"parallel": true` on a step to run it simultaneously with the next step. Non-parallel steps block advancement until complete.

```json
[
  { "action": "camera_pan", "x": 50, "y": 30, "speed": 5, "parallel": true },
  { "action": "move", "entity_type": "npc", "entity_id": "ranger", "x": 50, "y": 30, "speed": 3, "parallel": false },
  { "action": "dialogue", "dialogue_tree": "ranger_arrival", "npc_id": "ranger" }
]
```
Camera pan and NPC move happen at the same time. Dialogue waits for both to finish.

### Entity Resolution

| `entity_type` | `entity_id` | Resolves To |
|---------------|-------------|-------------|
| `"player"` | _(any/ignored)_ | The Player entity |
| `"npc"` | NPC definition ID | Npc found by Definition.Id |
| `"mob"` | Mob definition ID | Mob found by Definition.Id |

---

## 3. NPC Definition Format

### Data File: `Data/npcs.json`

```json
{
  "id": "blacksmith_thornhollow",
  "name": "Tormund the Blacksmith",
  "title": "Thornhollow Smithy",
  "ascii_art": {
    "idle": ["(o_o)", "/(+)\\", " │ │  "],
    "talking": ["(o▄o)", "/(+)\\", " │ │  "]
  },
  "fg_color": "Black",
  "bg_color": "PeachPuff",
  "dialogue_tree": "tormund_dialogue",
  "is_merchant": true,
  "reputation_id": "tormund",
  "initial_reputation": 0,
  "merchant_data": {
    "expertise_tags": ["Sword", "Dagger", "Shield", "HeavyArmor"],
    "stock_table_id": "blacksmith_stock",
    "markup": 1.0,
    "restock_interval": 300
  },
  "dialogue_portrait": [
    "     _,,,_     ",
    "    ( o o )    ",
    "    /  ^  \\    ",
    "   | \\___/ |   ",
    "    \\_____/    ",
    "     |   |     "
  ],
  "cutscene_on_interact": null
}
```

Key fields:
- `dialogue_tree`: Links to a tree_id in dialogues.json
- `reputation_id`: Used for reputation tracking (conditions & effects)
- `dialogue_portrait`: 6-line, 17-char-wide ASCII art for dialogue UI
- `cutscene_on_interact`: If set, triggers this cutscene INSTEAD of dialogue when player presses E
- `is_merchant` + `merchant_data`: Enables shop UI via `"open_merchant_ui"` dialogue action

---

## 4. Entity File Format (`.entities`)

Located in `maps/<zone_id>.entities`. One command per line. Lines starting with `#` are comments.

### DOOR — Zone transition
```
DOOR <x>,<y> <w>,<h> <target_zone_id> <target_x>,<target_y>
```
Example: `DOOR 119,10 1,7 whispering_woods 2,28`

### SPAWN — Mob spawner
```
SPAWN <mob_def_id> <x>,<y> [respawn:<seconds>] [patrol:<x1>,<y1>,<x2>,<y2>]
```
Example: `SPAWN goblin 21,25 respawn:45 patrol:18,25,24,25`

### NPC — Place an NPC
```
NPC <npc_def_id> <x>,<y>
```
Example: `NPC blacksmith_thornhollow 18,20`

### CHEST — Loot container
```
CHEST <x>,<y> <loot_table_id> <item_level>
```
Example: `CHEST 46,15 chest_common 1`

### SIGN — Readable sign
```
SIGN <x>,<y> <text...>
```
Example: `SIGN 106,12 The Whispering Woods lie east. Stay on the path.`

### TRIGGER — Spatial cutscene trigger
```
TRIGGER <x>,<y> <w>,<h> <cutscene_id> [flag:<required_flag>] [absent:<absent_flag>]
```
Example: `TRIGGER 50,30 5,5 intro_cutscene absent:intro_seen`

---

## 5. Quest System

### Data File: `Data/quests.json`

**Main Quest Stages:**
```json
{
  "main_quest": [
    {
      "stage": 1,
      "title": "Awakening",
      "zone": "thornhollow",
      "objective": "Talk to Mayor Aldric",
      "conditions": [{ "type": "talk_to_npc", "target": "mayor_thornhollow" }],
      "turn_in": { "npc_id": "mayor_thornhollow", "npc_name": "Mayor Aldric" },
      "rewards": { "xp": 50, "gold": 0 },
      "on_complete_text": "Mayor Aldric has asked you to clear the forest path."
    }
  ]
}
```

**Side Quests:**
```json
{
  "side_quests": [
    {
      "id": "side_tormunds_hammer",
      "name": "Tormund's Lost Hammer",
      "start_condition": { "main_quest_stage_gte": 2 },
      "steps": [
        {
          "objective": "Find Tormund's hammer in the Whispering Woods",
          "conditions": [{ "type": "have_item", "target": "tormunds_hammer" }]
        },
        {
          "objective": "Return the hammer to Tormund",
          "conditions": [{ "type": "talk_to_npc", "target": "blacksmith_thornhollow" }]
        }
      ],
      "rewards": { "xp": 150, "gold": 75 }
    }
  ]
}
```

### Quest Condition Types

| Type | Target | Description |
|------|--------|-------------|
| `talk_to_npc` | NPC definition ID | Player must interact with NPC |
| `arrive_at_zone` | Zone ID | Player must enter zone |
| `kill_mob` | Mob definition ID | Kill mob (+ optional `count`) |
| `have_item` | Item base ID | Player has item in inventory (+ optional `count`) |

### Starting Quests from Dialogue

Use a dialogue effect with type `"quest"`:
```json
{ "type": "quest", "npc": "start_side:side_tormunds_hammer", "value": 0 }
```
Format: `"start_side:<quest_id>"` in the `npc` field.

---

## 6. Narrative Flags

Simple key-value string pairs for tracking world state.

**Set from dialogue:**
```json
{ "type": "set_flag", "key": "met_blacksmith", "value": 1 }
```

**Set from cutscene:**
```json
{ "action": "set_flag", "flag": "intro_seen", "value": "true" }
```

**Check in dialogue conditions:**
```json
{ "type": "flag", "key": "met_blacksmith", "op": "set" }
{ "type": "flag", "key": "intro_seen", "op": "not_set" }
{ "type": "flag", "key": "quest_path", "op": "eq", "value": "warrior" }
```

**Check in cutscene triggers:**
```json
{ "flag": "tutorial_done", "flag_absent": "intro_seen" }
```

Flags persist across saves. Values default to `"true"` when set as boolean.

---

## 7. Mob Cutscene Hooks

Defined in `Data/mobs.json` on mob definitions:

| Property | Type | Description |
|----------|------|-------------|
| `cutscene_on_aggro` | string? | Cutscene ID triggered when combat starts |
| `cutscene_on_death` | string? | Cutscene ID triggered when mob is killed |
| `plot_armor_hp_pct` | float? | HP% threshold (0.0-1.0) that triggers `battle_end_plot_armor` cutscene |

Plot armor prevents the mob from dying below the threshold — instead triggers a cutscene (e.g., boss retreats, transforms, or surrenders).

---

## 8. Game State Transitions

```
Playing → Dialogue       (NPC interaction or cutscene dialogue step)
Playing → Cutscene       (Trigger fires)
Dialogue → Playing       (Dialogue closes)
Dialogue → Merchant      (open_merchant_ui action)
Cutscene → Dialogue      (Dialogue step in cutscene)
Cutscene → Playing       (Cutscene complete)
```

Only `Playing` state advances the game clock.

**HUD during cutscenes**: All HUD elements (action bar, sidebar, quest tracker, combat log) are automatically hidden while a cutscene is active, providing a clean cinematic view. They restore when the cutscene ends.

**Banner rendering**: Banners render on a dedicated screen-sized overlay above the map layer, so they display correctly regardless of map dimensions.

---

## 9. File Paths Reference

### Data Files
| File | Contents |
|------|----------|
| `Data/dialogues.json` | All dialogue trees |
| `Data/cutscenes.json` | All cutscene scripts |
| `Data/npcs.json` | NPC definitions (portraits, merchant data, dialogue links) |
| `Data/quests.json` | Main quest stages + side quest definitions |
| `Data/mobs.json` | Mob definitions (includes cutscene hooks) |
| `maps/<zone>.entities` | Per-zone entity placement (NPCs, doors, spawns, triggers) |

### Source Files
| File | Role |
|------|------|
| `src/Dialogue/DialogueManager.cs` | Dialogue flow controller |
| `src/Dialogue/DialogueNode.cs` | Data classes: DialogueNode, DialogueChoice, DialogueEffect, DialogueCondition |
| `src/Dialogue/DialogueTree.cs` | JSON loader for dialogue trees |
| `src/Dialogue/ConditionEvaluator.cs` | Evaluates all condition types |
| `src/Dialogue/NarrativeFlags.cs` | Flag storage (Get/Set/Has/Remove) |
| `src/Dialogue/ReputationTracker.cs` | NPC reputation (-100 to +100) |
| `src/Cutscene/CutsceneManager.cs` | Cutscene execution engine |
| `src/Cutscene/CutsceneData.cs` | Data classes: CutsceneScript, CutsceneTrigger, CutsceneStep |
| `src/Cutscene/CutsceneMover.cs` | A* pathfinding movement for cutscene entities |
| `src/UI/DialoguePopup.cs` | Dialogue rendering (typewriter, portraits, choices) |
| `src/UI/BannerOverlay.cs` | Figgle ASCII art banner display |
| `src/Quest/QuestManager.cs` | Quest tracking and completion |
| `src/Quest/QuestData.cs` | Quest data classes |
| `src/World/MapLoader.cs` | Parses .entities files |
| `src/Core/RootScreen.cs` | Integration hub (NPC interaction, cutscene triggers, state transitions) |

---

## 10. Complete Examples

### Full Dialogue Tree

```json
{
  "tree_id": "elder_dialogue",
  "root": "greeting",
  "nodes": {
    "greeting": {
      "text": "The Elder looks up from her scrolls, eyes sharp despite her years. \"Another traveler. Tell me — what brings you to Thornhollow?\"",
      "conditions": [
        { "type": "flag", "key": "elder_angry", "op": "not_set" }
      ],
      "fallback": "angry_greeting",
      "choices": [
        {
          "text": "I heard there's trouble in the woods.",
          "next": "quest_hook",
          "reputation_change": 5,
          "conditions": [
            { "type": "quest_stage", "op": "lt", "value": "3" }
          ]
        },
        {
          "text": "Just passing through.",
          "next": "dismiss",
          "reputation_change": -5
        },
        {
          "text": "[Reputation 30+] I came because you sent for me.",
          "next": "trusted_path",
          "conditions": [
            { "type": "reputation", "key": "elder", "op": "gte", "value": "30" }
          ]
        }
      ],
      "effects": [
        { "type": "set_flag", "key": "met_elder", "value": 1 }
      ]
    },
    "angry_greeting": {
      "text": "The Elder glares. \"You again. I have nothing more to say.\"",
      "action": "close_dialogue"
    },
    "quest_hook": {
      "text": "\"The Whispering Woods grow darker by the day. Something festers at its heart. Will you investigate?\"",
      "choices": [
        {
          "text": "I'll look into it.",
          "next": "accept_quest"
        },
        {
          "text": "Sounds dangerous. Not interested.",
          "next": "dismiss"
        }
      ]
    },
    "accept_quest": {
      "text": "\"Brave soul. Speak to Tormund — he can outfit you for the journey.\"",
      "effects": [
        { "type": "quest", "npc": "start_side:side_woods_investigation", "value": 0 },
        { "type": "reputation", "npc": "elder", "value": 10 }
      ],
      "action": "close_dialogue"
    },
    "trusted_path": {
      "text": "\"I knew you'd come. There is a matter of great urgency...\"",
      "choices": [
        { "text": "Tell me everything.", "next": "secret_quest" }
      ]
    },
    "secret_quest": {
      "text": "\"Deep beneath the mines, an ancient seal is weakening. You must reinforce it before the equinox.\"",
      "effects": [
        { "type": "set_flag", "key": "knows_seal_secret", "value": 1 }
      ],
      "action": "close_dialogue"
    },
    "dismiss": {
      "text": "The Elder waves you away dismissively.",
      "action": "close_dialogue"
    }
  }
}
```

### Full Cutscene Script

```json
{
  "id": "forest_ambush",
  "trigger": {
    "type": "zone_entry",
    "zone_id": "whispering_woods",
    "flag": "accepted_woods_quest",
    "flag_absent": "forest_ambush_seen"
  },
  "steps": [
    { "action": "banner", "text": "Whispering Woods", "color": "DarkGreen", "duration": 3.0 },
    { "action": "wait", "duration": 1.0 },
    { "action": "camera_pan", "x": 80.0, "y": 50.0, "speed": 8.0 },
    { "action": "wait", "duration": 1.5 },
    { "action": "spawn", "mob_def_id": "goblin_scout", "x": 82.0, "y": 48.0 },
    { "action": "spawn", "mob_def_id": "goblin_scout", "x": 78.0, "y": 52.0 },
    { "action": "wait", "duration": 1.0 },
    { "action": "camera_release" },
    { "action": "move", "entity_type": "npc", "entity_id": "ranger_npc", "x": 40.0, "y": 30.0, "speed": 6.0, "parallel": true },
    { "action": "dialogue", "dialogue_tree": "ranger_warning", "npc_id": "ranger_npc" },
    { "action": "set_flag", "flag": "forest_ambush_seen", "value": "true" }
  ]
}
```

### TRIGGER in .entities File

```
# Spatial trigger: fires "forest_ambush" cutscene when player walks into 5x5 area
# Only fires if "accepted_woods_quest" is set and "forest_ambush_seen" is not
TRIGGER 38,28 5,5 forest_ambush flag:accepted_woods_quest absent:forest_ambush_seen
```

---

## 11. Important Notes

- **JSON naming**: All JSON uses `snake_case_lower` (deserialized with `JsonNamingPolicy.SnakeCaseLower`)
- **Reputation range**: -100 to +100, clamped
- **Reputation changes from choices**: One-time only (tracked by dialogue key, never reapplied)
- **Cutscenes don't save mid-execution**: If player quits during cutscene, it replays on reload (use `flag_absent` to prevent re-trigger)
- **NPC interaction priority**: `cutscene_on_interact` takes priority over `dialogue_tree`
- **Interaction range**: Player must be within 4.0 tiles horizontal, 2.0 tiles vertical of NPC
- **Tile aspect ratio**: 2:1 height:width — movement and coordinates account for this
