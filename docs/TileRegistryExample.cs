using SadRogue.Primitives;

namespace AsciiAscendant.World;

public static class TileRegistry
{
    private static readonly Dictionary<string, Tile> _tiles = new();

    static TileRegistry()
    {
        // code,   name,            glyph,   Color fg,          Color bg,                walkable, transparent, lightPass, speedMod, lightRadius
        
        // ── Natural Terrain ──
        Reg("..", "Grass",         '\u00B7', Color.Green,       Color.DarkGreen,                true,  true,  true);
        Reg(".t", "Tall Grass",    '"',      Color.LimeGreen,   Color.DarkGreen,                true,  true,  true,  speedMod: 0.8f);
        Reg("dd", "Dirt Path",     '.',      Color.Tan,         Color.SaddleBrown,              true,  true,  true);
        Reg("dr", "Dirt Road",     '=',      Color.BurlyWood,   Color.SaddleBrown,              true,  true,  true);
        Reg("~~", "Water (Deep)",  '\u2248', Color.DodgerBlue,  Color.DarkBlue,                 false, true,  true);
        Reg("~.", "Water (Shallow)", '~',    Color.LightBlue,   Color.MediumBlue,               true,  true,  true,  speedMod: 0.6f);
        Reg("mm", "Mud",           ',',      Color.DarkKhaki,   new Color(58, 42, 26),          true,  true,  true,  speedMod: 0.6f);
        Reg("rr", "Rock/Rubble",   '\u2592', Color.Gray,        Color.DimGray,                  false, true,  true);
        Reg("ss", "Sand",          '\u00B7', Color.Khaki,       Color.DarkKhaki,                true,  true,  true);
        Reg("sn", "Snow",          '\u00B7', Color.White,       Color.LightGray,                true,  true,  true);

        // ── Structural ──
        Reg("##", "Stone Wall",    '\u2588', Color.Gray,        Color.DarkGray,                 false, false, false);
        Reg("#b", "Brick Wall",    '\u2588', Color.IndianRed,   new Color(74, 42, 42),          false, false, false);
        Reg("#w", "Wood Wall",     '\u2588', Color.BurlyWood,   new Color(58, 42, 26),          false, false, false);
        Reg("#c", "Cave Wall",     '\u2593', Color.DarkSlateGray, new Color(26, 26, 30),        false, false, false);
        Reg("#d", "Dungeon Wall",  '\u2588', Color.SlateGray,   new Color(42, 42, 48),          false, false, false);
        Reg("#h", "Half Wall",     '\u2584', Color.Gray,        Color.DarkGray,                 false, true,  true);
        Reg("ww", "Window",        '\u2591', Color.LightCyan,   Color.DarkGray,                 false, true,  true);
        Reg("fn", "Fence",         '\u256B', Color.BurlyWood,   Color.Black,                    false, true,  true);
        Reg("fp", "Fence Post",    '\u256C', Color.BurlyWood,   Color.Black,                    false, true,  true);

        // ── Interior Floors ──
        Reg("__", "Wood Floor",    '_',      Color.Tan,         new Color(42, 30, 20),          true,  true,  true);
        Reg("sf", "Stone Floor",   '.',      Color.LightGray,   new Color(42, 42, 46),          true,  true,  true);
        Reg("tf", "Tile Floor",    '\u00B7', Color.LightBlue,   new Color(30, 30, 42),          true,  true,  true);
        Reg("cf", "Carpet",        '\u2591', Color.Crimson,     new Color(42, 20, 20),          true,  true,  true);
        Reg("dn", "Dungeon Floor", '.',      Color.DimGray,     new Color(26, 26, 30),          true,  true,  true);

        // ── Doors & Transitions ──
        Reg(">>", "Stairs Down",   '>',      Color.White,       Color.DarkGray,                 true,  true,  true);
        Reg("<<", "Stairs Up",     '<',      Color.White,       Color.DarkGray,                 true,  true,  true);
        Reg("[]", "Door (Closed)", '\u256C', Color.SaddleBrown, new Color(42, 30, 20),          false, false, false);
        Reg("[o", "Door (Open)",   '\u2568', Color.SaddleBrown, new Color(42, 30, 20),          true,  true,  true);
        Reg("[l", "Door (Locked)", '\u256C', Color.DarkRed,     new Color(42, 30, 20),          false, false, false);
        Reg("gd", "Gate",          '\u256B', Color.Gray,        Color.Black,                    false, true,  true);
        Reg("pt", "Portal",        '\u25CA', Color.MediumPurple, new Color(26, 10, 42),         true,  true,  true,  lightRadius: 4);
        Reg("cb", "Cave Entrance", '\u2593', Color.DarkGray,    new Color(10, 10, 10),          true,  true,  true);

        // ── Light Sources ──
        Reg("#t", "Wall Torch",    '\u263C', Color.Orange,      Color.DarkGray,                 false, false, false, lightRadius: 4);
        Reg("lt", "Lamp Post",     '\u2565', Color.Gold,        Color.Black,                    false, true,  true,  lightRadius: 5);
        Reg("fi", "Campfire",      '\u2668', Color.OrangeRed,   new Color(42, 26, 10),          false, true,  true,  lightRadius: 6);
        Reg("br", "Brazier",       '\u25B2', Color.Orange,      new Color(42, 26, 10),          false, true,  true,  lightRadius: 5);
        Reg("cn", "Candle",        '\u2564', Color.Khaki,       Color.Black,                    false, true,  true,  lightRadius: 2);
        Reg("la", "Lantern",       '\u25D8', Color.Gold,        Color.Black,                    false, true,  true,  lightRadius: 3);

        // ── Interactive Objects (tile-layer for now, may migrate to entities) ──
        Reg("cr", "Crate",         '\u25A0', Color.BurlyWood,   new Color(42, 30, 20),          false, true,  true);
        Reg("bl", "Barrel",        '\u25CB', Color.SaddleBrown, new Color(42, 30, 20),          false, true,  true);
        Reg("sp", "Signpost",      '\u2564', Color.BurlyWood,   Color.Black,                    false, true,  true);
        Reg("bn", "Bench",         '\u2550', Color.BurlyWood,   Color.Black,                    false, true,  true);
        Reg("an", "Anvil",         '\u2534', Color.DarkGray,    Color.Black,                    false, true,  true);
        Reg("al", "Altar",         '\u2566', Color.WhiteSmoke,  new Color(42, 42, 48),          false, true,  true);
        Reg("gr", "Grave",         '\u252C', Color.Gray,        Color.DarkGreen,                false, true,  true);
        Reg("st", "Statue",        '\u2666', Color.LightGray,   Color.Black,                    false, true,  false);
        Reg("bg", "Bookshelf",     '\u2590', Color.SaddleBrown, new Color(42, 26, 10),          false, false, false);
        Reg("bd", "Bed",           '\u25AC', Color.IndianRed,   new Color(42, 26, 20),          false, true,  true);
        Reg("tb", "Table",         '\u2564', Color.BurlyWood,   Color.Black,                    false, true,  true);

        // ── Vegetation & Decoration ──
        Reg("tr", "Tree Trunk",    '\u2660', Color.SaddleBrown, Color.DarkGreen,                false, false, false);
        Reg("tc", "Tree Canopy",   '\u2663', Color.ForestGreen, Color.DarkGreen,                false, true,  true); // partial light
        Reg("bu", "Bush",          '\u273F', Color.Green,       Color.DarkGreen,                false, true,  true);
        Reg("fl", "Flowers",       '\u273E', Color.Magenta,     Color.DarkGreen,                true,  true,  true);
        Reg("vn", "Vines",         '\u2561', Color.DarkGreen,   Color.DimGray,                  true,  true,  true);
        Reg("ms", "Mushroom",      '\u2660', Color.Crimson,     Color.DarkGreen,                true,  true,  true);
        Reg("lg", "Log",           '\u2550', Color.SaddleBrown, Color.DarkGreen,                false, true,  true);
        Reg("cw", "Cobweb",        '\u2573', Color.LightGray,   Color.Black,                    true,  true,  true);

        // -- Expanded Vegetation (Modular Trees) --
        Reg("T<", "Tree Canopy (L)",  '\u25D8', Color.ForestGreen, Color.DarkGreen, false, true,  true); 
        Reg("T>", "Tree Canopy (R)",  '\u25D9', Color.ForestGreen, Color.DarkGreen, false, true,  true);
        Reg("T^", "Tree Canopy (Top)",'\u25B2', Color.ForestGreen, Color.DarkGreen, false, true,  true);
        Reg("TR", "Tree Root",       '\u2514', Color.SaddleBrown, Color.DarkGreen, true,  true,  true);
        Reg("TT", "Tree Trunk",      '\u2502', Color.SaddleBrown, Color.DarkGreen, false, false, false);
        Reg("Ww", "Woe-Willow",      '\u256B', Color.DarkSlateGray, Color.Black,   false, false, false); // Creepy tree

        // -- Environmental Lighting & Fog --
        Reg("gl", "Glow-Lichen",     '\u002C', Color.Cyan,        Color.Black,       true,  true,  true, lightRadius: 2);
        Reg("bf", "Bonfire",         '\u203C', Color.OrangeRed,   Color.DarkRed,     false, true,  true, lightRadius: 8);
        Reg("ls", "Light Stone",     '\u25D9', Color.PaleGoldenrod, Color.Black,     true,  true,  true, lightRadius: 3);

        // -- Additional Structures --
        Reg("st", "Stone Steps",     '\u253C', Color.Gray,        Color.Black,       true,  true,  true);
        Reg("rc", "Rock Column",     '\u03A9', Color.SlateGray,   Color.DimGray,     false, false, false);    

        // -- Modular Tree Parts (Shape over Substance) --
        Reg("T^", "Tree Top",      '\u25AC', Color.ForestGreen, Color.Black, false, true,  true); // ▬
        Reg("T(", "Tree Left",     '\u2590', Color.ForestGreen, Color.Black, false, true,  true); // ▐
        Reg("T)", "Tree Right",    '\u258C', Color.ForestGreen, Color.Black, false, true,  true); // ▌
        Reg("T#", "Tree Leafy",    '\u2593', Color.ForestGreen, Color.Black, false, true,  true); // ▓
        Reg("TT", "Tree Trunk",    '\u2551', Color.SaddleBrown, Color.Black, false, false, false); // ║
        
        Reg("Pl", "Plaza Tile",  '\u00B7', Color.Gray,        new Color(20, 20, 25), true,  true, true);
        Reg("H#", "Thatch Roof", '\u2592', Color.Goldenrod,   Color.SaddleBrown,     false, false, false);
        Reg("st", "Stone Path",  '\u2502', Color.DarkGray,    Color.Black,           true,  true, true);
    }

    public static Tile Get(string code)
    {
        if (_tiles.TryGetValue(code, out var tile))
            return tile;
        throw new KeyNotFoundException($"Unknown tile code: '{code}'");
    }

    public static bool TryGet(string code, out Tile? tile) => _tiles.TryGetValue(code, out tile);

    private static void Reg(
        string code, string name, char glyph,
        Color fg, Color bg,
        bool walkable, bool transparent, bool lightPass,
        float speedMod = 1.0f, int lightRadius = 0)
    {
        _tiles[code] = new Tile(code, name, glyph, fg, bg, walkable, transparent, lightPass, speedMod, lightRadius);
    }
}
