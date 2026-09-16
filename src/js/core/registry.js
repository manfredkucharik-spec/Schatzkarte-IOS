/* Schatz-Karte Core — canonical category registry. */
window.SCHATZKARTE_CATEGORY_REGISTRY = {
  "history_archaeology": {
    "master": [
      "castles",
      "palaces",
      "castle_ruins",
      "cities",
      "medieval_sites",
      "cityhistory",
      "military",
      "ancient_military",
      "roman_sites",
      "outlaws",
      "battles"
    ],
    "children": {
      "estates_cityhistory": [
        "castles",
        "palaces",
        "castle_ruins",
        "cityhistory"
      ],
      "cities_trade": [
        "cities",
        "medieval_sites"
      ]
    }
  },
  "ww2": {
    "master": [
      "ww2_battlefields",
      "ww2_bunkers",
      "ww2_positions",
      "ww2_trenches",
      "ww2_military",
      "ww2_industry",
      "ww2_airforce",
      "ww2_navy",
      "ww2_camps"
    ],
    "children": {
      "ww2_defences": [
        "ww2_positions",
        "ww2_trenches"
      ],
      "ww2_military_sites": [
        "ww2_military",
        "ww2_industry"
      ],
      "ww2_air": [
        "ww2_airforce"
      ],
      "ww2_naval": [
        "ww2_navy"
      ]
    }
  },
  "ww1": {
    "master": [
      "ww1_battlefields",
      "ww1_positions",
      "ww1_trenches",
      "ww1_military"
    ]
  },
  "vikings": {
    "master": [
      "vikings_battles",
      "vikings_settlements",
      "vikings_findspots",
      "vikings_ports",
      "vikings_routes",
      "vikings_graves",
      "vikings_treasures",
      "vikings_military"
    ]
  },
  "napoleonic": {
    "master": [
      "napoleonic_battles",
      "napoleonic_camps",
      "napoleonic_military"
    ]
  },
  "cold_war": {
    "master": [
      "cold_war_battles"
    ]
  },
  "lost_places": {
    "master": [
      "lostplaces",
      "forgotten"
    ]
  },
  "magnet": {
    "master": [
      "magnet"
    ]
  },
  "protected": {
    "master": [
      "protected",
      "userfinds"
    ]
  }
};
window.SCHATZKARTE_CATEGORY_UI_BINDINGS = {
  "chk_road_hotspots_top": "recommended_search",
  "chk_estates_cityhistory": "historical_places_buildings",
  "chk_cities_trade": "cities_trade_centers",
  "chk_military": "ancient_historical_military",
  "chk_ancient_military": "ancient_military",
  "chk_roman_sites": "roman_sites",
  "chk_outlaws": "outlaws",
  "chk_battles": "battles",
  "chk_ww1_battlefields": "ww1_battlefields",
  "chk_ww1_positions": "ww1_positions",
  "chk_ww1_trenches": "ww1_trenches",
  "chk_ww1_military": "ww1_military",
  "chk_ww2_all": "ww2_all",
  "chk_ww2_battlefields": "ww2_battlefields",
  "chk_ww2_bunkers": "ww2_bunkers",
  "chk_ww2_defences": "ww2_defences",
  "chk_ww2_military_sites": "ww2_military_sites",
  "chk_ww2_air": "ww2_air",
  "chk_ww2_naval": "ww2_naval",
  "chk_cold_war_battles": "cold_war_battles",
  "chk_vikings_battles": "vikings_battles",
  "chk_vikings_settlements": "vikings_settlements",
  "chk_vikings_findspots": "vikings_findspots",
  "chk_vikings_ports": "vikings_ports",
  "chk_vikings_routes": "vikings_routes",
  "chk_vikings_graves": "vikings_graves",
  "chk_vikings_treasures": "vikings_treasures",
  "chk_vikings_military": "vikings_military",
  "chk_napoleonic_battles": "napoleonic_battles",
  "chk_napoleonic_camps": "napoleonic_camps",
  "chk_napoleonic_military": "napoleonic_military",
  "chk_ww2_military": "ww2_military",
  "chk_ww2_camps": "ww2_camps",
  "chk_ww2_industry": "ww2_industry",
  "chk_ww2_airforce": "ww2_airfields",
  "chk_ww2_navy": "ww2_naval"
};
window.SCHATZKARTE_CATEGORY_REGISTRY.resolveLayers = function(key){ const c=this[key]; return c ? [...new Set(c.master||[])] : []; };
window.SCHATZKARTE_CATEGORY_REGISTRY.resolveChildLayers = function(group,key){ const c=this[group]; return c?.children?.[key] ? [...c.children[key]] : []; };
