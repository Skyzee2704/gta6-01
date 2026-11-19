// Content and tuning tables; rates use seconds and dimensions use world units.

export const DISTRICTS = [
  {
    "id": "marina",
    "name": "Solmar Marina",
    "tagline": "Docks, yachts, and deals under the table",
    "color": "#23b6aa",
    "accent": "#23b6aa",
    "palette": [
      "#f3dfbb",
      "#91cdc5",
      "#e4b98b"
    ],
    "minFloors": 3,
    "maxFloors": 5,
    "roofBias": {
      "flat": 0.65,
      "gabled": 0.35
    },
    "facade": "wood"
  },
  {
    "id": "old-solmar",
    "name": "Old Solmar",
    "tagline": "Narrow streets, terracotta roofs, and history",
    "color": "#cc7145",
    "accent": "#cc7145",
    "palette": [
      "#b75539",
      "#e8bf91",
      "#efe0bb"
    ],
    "minFloors": 3,
    "maxFloors": 7,
    "roofBias": {
      "gabled": 0.45,
      "hipped": 0.35,
      "mansard": 0.2
    },
    "facade": "brick"
  },
  {
    "id": "neon-mile",
    "name": "Neon Mile",
    "tagline": "The night never sleeps here",
    "color": "#fa52ad",
    "accent": "#fa52ad",
    "palette": [
      "#30263f",
      "#704d85",
      "#eb75b8"
    ],
    "minFloors": 4,
    "maxFloors": 12,
    "roofBias": {
      "flat": 0.85,
      "skillion": 0.15
    },
    "facade": "painted-brick"
  },
  {
    "id": "harbor-docks",
    "name": "Harbor Docks",
    "tagline": "Containers, cranes, and nameless cargo",
    "color": "#e9be39",
    "accent": "#e9be39",
    "palette": [
      "#7c8587",
      "#bdb5a0",
      "#ceaa46"
    ],
    "minFloors": 3,
    "maxFloors": 6,
    "roofBias": {
      "flat": 0.6,
      "skillion": 0.4
    },
    "facade": "metal"
  },
  {
    "id": "palm-heights",
    "name": "Palm Heights",
    "tagline": "Hillside villas, views over the sea",
    "color": "#55995d",
    "accent": "#55995d",
    "palette": [
      "#e5dbc4",
      "#adc397",
      "#f0e5ce"
    ],
    "minFloors": 3,
    "maxFloors": 5,
    "roofBias": {
      "hipped": 0.5,
      "pyramidal": 0.3,
      "gabled": 0.2
    },
    "facade": "concrete"
  },
  {
    "id": "downtown",
    "name": "Downtown",
    "tagline": "Three glass towers in the heart of the city",
    "color": "#66b8de",
    "accent": "#66b8de",
    "palette": [
      "#50768c",
      "#86b5c7",
      "#b5c8d1"
    ],
    "minFloors": 12,
    "maxFloors": 40,
    "roofBias": {
      "flat": 1
    },
    "facade": "glass"
  }
];

export const VEHICLE_TYPES = [
  {
    "id": "sedan",
    "name": "Solmar Sedan",
    "kind": "car",
    "length": 4.5,
    "width": 1.8,
    "height": 1.5,
    "topSpeed": 30,
    "accel": 14,
    "stealable": true,
    "colors": [
      "#b7c5cb",
      "#803e40",
      "#253b53",
      "#dfd6ba"
    ],
    "desc": "A steady four-door for everyday escapes."
  },
  {
    "id": "coupe",
    "name": "Solmar Coupe",
    "kind": "car",
    "length": 4.2,
    "width": 1.8,
    "height": 1.35,
    "topSpeed": 34,
    "accel": 16,
    "stealable": true,
    "colors": [
      "#b7c5cb",
      "#803e40",
      "#253b53",
      "#dfd6ba"
    ],
    "desc": "A light coupe with quick steering."
  },
  {
    "id": "suv",
    "name": "Solmar SUV",
    "kind": "car",
    "length": 4.8,
    "width": 2,
    "height": 1.9,
    "topSpeed": 28,
    "accel": 12,
    "stealable": true,
    "colors": [
      "#b7c5cb",
      "#803e40",
      "#253b53",
      "#dfd6ba"
    ],
    "desc": "Tall, heavy, and ready for rough streets."
  },
  {
    "id": "pickup",
    "name": "Solmar Pickup",
    "kind": "car",
    "length": 5.1,
    "width": 2,
    "height": 1.8,
    "topSpeed": 27,
    "accel": 12,
    "stealable": true,
    "colors": [
      "#b7c5cb",
      "#803e40",
      "#253b53",
      "#dfd6ba"
    ],
    "desc": "A work truck with an open cargo bed."
  },
  {
    "id": "sports",
    "name": "Sports Solmar",
    "kind": "car",
    "length": 4.4,
    "width": 1.95,
    "height": 1.15,
    "topSpeed": 46,
    "accel": 22,
    "stealable": true,
    "colors": [
      "#b7c5cb",
      "#803e40",
      "#253b53",
      "#dfd6ba"
    ],
    "desc": "Low bodywork and fierce acceleration."
  },
  {
    "id": "taxi",
    "name": "Solmar Cab",
    "kind": "car",
    "length": 4.6,
    "width": 1.85,
    "height": 1.5,
    "topSpeed": 30,
    "accel": 14,
    "stealable": true,
    "colors": [
      "#f3c63c"
    ],
    "desc": "A yellow cab ready for paying passengers."
  },
  {
    "id": "van",
    "name": "Solmar Van",
    "kind": "car",
    "length": 5.2,
    "width": 2,
    "height": 2.2,
    "topSpeed": 25,
    "accel": 10,
    "stealable": true,
    "colors": [
      "#b7c5cb",
      "#803e40",
      "#253b53",
      "#dfd6ba"
    ],
    "desc": "A roomy delivery van with a heavy rear axle."
  },
  {
    "id": "cruiser",
    "name": "SPD Cruiser",
    "kind": "car",
    "length": 4.9,
    "width": 1.95,
    "height": 1.55,
    "topSpeed": 36,
    "accel": 18,
    "stealable": true,
    "colors": [
      "#edf2f4",
      "#244b83"
    ],
    "desc": "A patrol car; cannot be stolen while police occupy it.",
    "stealableWhenPoliceOccupied": false
  },
  {
    "id": "scooter",
    "name": "Solmar Scooter",
    "kind": "bike",
    "length": 1.9,
    "width": 0.7,
    "height": 1.2,
    "topSpeed": 20,
    "accel": 9,
    "stealable": true,
    "colors": [
      "#b7c5cb",
      "#803e40",
      "#253b53",
      "#dfd6ba"
    ],
    "desc": "Small wheels for narrow streets."
  },
  {
    "id": "sportbike",
    "name": "Solmar Sport Bike",
    "kind": "bike",
    "length": 2.1,
    "width": 0.75,
    "height": 1.15,
    "topSpeed": 42,
    "accel": 24,
    "stealable": true,
    "colors": [
      "#b7c5cb",
      "#803e40",
      "#253b53",
      "#dfd6ba"
    ],
    "desc": "A fast motorcycle that rewards careful handling."
  },
  {
    "id": "bus",
    "name": "Solmar Bus",
    "kind": "bus",
    "length": 11,
    "width": 2.5,
    "height": 3.1,
    "topSpeed": 22,
    "accel": 7,
    "stealable": false,
    "colors": [
      "#b7c5cb",
      "#803e40",
      "#253b53",
      "#dfd6ba"
    ],
    "desc": "A locked city bus carrying local passengers."
  }
];

export const WEAPONS = [
  {
    "id": "pistol",
    "name": "Pistol",
    "damage": 34,
    "fireRate": 3,
    "magSize": 12,
    "reserveMax": 120,
    "range": 55,
    "price": 0,
    "respectLevel": 1,
    "desc": "A reliable sidearm."
  },
  {
    "id": "smg",
    "name": "Street SMG",
    "damage": 18,
    "fireRate": 10,
    "magSize": 30,
    "reserveMax": 240,
    "range": 45,
    "price": 500,
    "respectLevel": 2,
    "desc": "Fast bursts for close street fights."
  },
  {
    "id": "shotgun",
    "name": "Pump Shotgun",
    "damage": 12,
    "fireRate": 1,
    "magSize": 8,
    "reserveMax": 64,
    "range": 25,
    "price": 750,
    "respectLevel": 2,
    "desc": "Eight pellets per shell.",
    "pellets": 8
  },
  {
    "id": "rifle",
    "name": "VK-47 Longshoreman",
    "damage": 45,
    "fireRate": 6,
    "magSize": 30,
    "reserveMax": 180,
    "range": 110,
    "price": 1200,
    "respectLevel": 3,
    "desc": "A hard-hitting automatic rifle."
  },
  {
    "id": "sniper",
    "name": "Longeye 308",
    "damage": 150,
    "fireRate": 0.7,
    "magSize": 5,
    "reserveMax": 30,
    "range": 240,
    "price": 2000,
    "respectLevel": 5,
    "desc": "A long-range precision rifle."
  },
  {
    "id": "molotov",
    "name": "Solmar Cocktail",
    "damage": 25,
    "fireRate": 0.8,
    "magSize": 1,
    "reserveMax": 12,
    "range": 25,
    "price": 150,
    "respectLevel": 2,
    "desc": "Burning fuel deals 25 damage per second.",
    "damagePerSecond": 25,
    "damageMode": "per-second"
  },
  {
    "id": "melee",
    "name": "Dock Hook",
    "damage": 25,
    "fireRate": 1.5,
    "magSize": 1,
    "reserveMax": 0,
    "range": 2,
    "price": 0,
    "respectLevel": 1,
    "desc": "A close-range hook from the waterfront."
  }
];

export const RADIO_STATIONS = [
  {
    "id": "golden-wave",
    "name": "SOLMAR 88.5 Golden Wave",
    "freq": 88.5,
    "genre": "Soul and soft rock",
    "bpm": 96,
    "rootNotes": [
      48,
      53,
      55,
      60
    ]
  },
  {
    "id": "street",
    "name": "SOLMAR STREET 95.7 Fuego Latino",
    "freq": 95.7,
    "genre": "Latin dance",
    "bpm": 108,
    "rootNotes": [
      45,
      50,
      52,
      57
    ]
  },
  {
    "id": "tide",
    "name": "SHORELINE 101.3 Tide FM",
    "freq": 101.3,
    "genre": "Coastal chill",
    "bpm": 82,
    "rootNotes": [
      48,
      52,
      55,
      59
    ]
  },
  {
    "id": "pulse",
    "name": "PULSE SOLMAR 104.9 Neon Club",
    "freq": 104.9,
    "genre": "Electronic dance",
    "bpm": 128,
    "rootNotes": [
      45,
      48,
      52,
      55
    ]
  }
];

export const MISSIONS = [
  {
    "id": 1,
    "title": "First Wheels",
    "blurb": "Pick up Rosa's car at the pier and bring it to the garage. Don't make a scene.",
    "payout": 200,
    "giver": "rosa",
    "giverLine": "Milo. My car's at the pier. Grab it, bring it here. Don't make a scene.",
    "stages": [
      {
        "kind": "pickup-car",
        "target": "pier",
        "detail": {
          "vehicle": "sedan"
        },
        "text": "Get into Rosa's car at the pier."
      },
      {
        "kind": "deliver-garage",
        "target": "garage",
        "detail": {
          "vehicle": "mission-car"
        },
        "text": "Bring the car to the garage."
      }
    ]
  },
  {
    "id": 2,
    "title": "Getaway Driver",
    "blurb": "Drive Rosa's friend out of the police cordon, then lose the cops.",
    "payout": 350,
    "giver": "rosa",
    "giverLine": "Get Juno out of the cordon. Cops everywhere \u2014 don't panic.",
    "dialogue": [
      {
        "speaker": "juno",
        "text": "Go, Milo. I've got the map."
      }
    ],
    "stages": [
      {
        "kind": "pickup-juno",
        "target": "juno",
        "detail": {
          "passengers": 1
        },
        "text": "Pick up Juno."
      },
      {
        "kind": "exit-cordon",
        "target": "cordon-exit",
        "detail": {
          "wantedLevel": 2
        },
        "text": "Drive beyond the police cordon."
      },
      {
        "kind": "lose-wanted",
        "target": "city",
        "detail": {
          "wantedLevel": 0
        },
        "text": "Lose the cops."
      }
    ]
  },
  {
    "id": 3,
    "title": "The Collector",
    "blurb": "Grab 3 packages in Marina, Neon Mile, and Harbor Docks before the 240 seconds run out.",
    "payout": 500,
    "giver": "mags",
    "giverLine": "Three pickups. Keep moving and bring every package back.",
    "timeLimit": 240,
    "stages": [
      {
        "kind": "collect",
        "target": "marina",
        "detail": {
          "package": 1
        },
        "text": "Collect the package in Solmar Marina."
      },
      {
        "kind": "collect",
        "target": "neon-mile",
        "detail": {
          "package": 2
        },
        "text": "Collect the package in Neon Mile."
      },
      {
        "kind": "collect",
        "target": "harbor-docks",
        "detail": {
          "package": 3
        },
        "text": "Collect the package in Harbor Docks."
      }
    ]
  },
  {
    "id": 4,
    "title": "Vulture Trouble",
    "blurb": "The Vultures hit the garage. Hold 2 waves, then chase their car.",
    "payout": 750,
    "giver": "rosa",
    "giverLine": "They're at the garage! Hold them off, Milo!",
    "dialogue": [
      {
        "speaker": "kane",
        "text": "Cruz. You should never have come back to Solmar."
      }
    ],
    "stages": [
      {
        "kind": "defend",
        "target": "garage",
        "detail": {
          "wave": 1,
          "enemies": 4
        },
        "text": "Defend the garage: wave 1."
      },
      {
        "kind": "defend",
        "target": "garage",
        "detail": {
          "wave": 2,
          "enemies": 6
        },
        "text": "Defend the garage: wave 2."
      },
      {
        "kind": "chase",
        "target": "vulture-car",
        "detail": {
          "disableVehicle": true
        },
        "text": "Stop the fleeing Vulture car."
      }
    ]
  },
  {
    "id": 5,
    "title": "The Big Score",
    "blurb": "Steal the sports car from the guarded lot, deliver it to the buyer in Palm Heights.",
    "payout": 1000,
    "giver": "juno",
    "giverLine": "That sports car is in the Harbor lot. Take it quiet, deliver it to Palm Heights.",
    "timeLimit": 180,
    "stages": [
      {
        "kind": "steal-sports",
        "target": "harbor-lot",
        "detail": {
          "vehicle": "sports"
        },
        "text": "Steal the guarded sports car."
      },
      {
        "kind": "deliver",
        "target": "palm-heights-buyer",
        "detail": {
          "vehicle": "mission-car"
        },
        "text": "Deliver the sports car to the buyer."
      }
    ]
  },
  {
    "id": 6,
    "title": "King of Solmar",
    "blurb": "Pick up the crew, rob the vault truck in Harbor Docks, escape a 4-star wanted level to the safehouse.",
    "payout": 1500,
    "giver": "rosa",
    "giverLine": "Here it is, Milo. The vault truck in Harbor Docks. Hold the cops off for 12 seconds.",
    "dialogue": [
      {
        "speaker": "kane",
        "text": "You won't leave this city alive."
      }
    ],
    "timeLimit": 300,
    "stages": [
      {
        "kind": "pickup-crew",
        "target": "garage",
        "detail": {
          "crew": [
            "rosa",
            "juno"
          ]
        },
        "text": "Pick up the crew."
      },
      {
        "kind": "crack-vault",
        "target": "harbor-vault-truck",
        "detail": {
          "holdSeconds": 12,
          "wantedLevel": 4
        },
        "text": "Hold off the cops for 12 seconds."
      },
      {
        "kind": "escape-wanted-4",
        "target": "safehouse",
        "detail": {
          "initialWantedLevel": 4,
          "requiredWantedLevel": 0
        },
        "text": "Escape the four-star pursuit and reach the safehouse."
      }
    ]
  }
];

export const CAST = [
  {
    "id": "milo",
    "name": "Milo Cruz",
    "role": "Getaway driver",
    "skin": "#bc825c",
    "hair": "short",
    "hairColor": "#35271f",
    "feature": "Yellow jacket",
    "jacketColor": "#edc640"
  },
  {
    "id": "rosa",
    "name": "Rosa Delgado",
    "role": "Garage + diner owner",
    "skin": "#bf875f",
    "hair": "tied-back",
    "hairColor": "#39251f",
    "feature": "Red bandana",
    "jacketColor": "#865c42"
  },
  {
    "id": "kane",
    "name": "Kane",
    "role": "Boss of The Vultures",
    "skin": "#a87554",
    "hair": "slicked-back",
    "hairColor": "#191817",
    "feature": "Leather jacket and chain",
    "jacketColor": "#222329"
  },
  {
    "id": "juno",
    "name": "Juno",
    "role": "Wheelwoman",
    "skin": "#d6a17d",
    "hair": "bob",
    "hairColor": "#f477b6",
    "feature": "Pink hair and aviator glasses",
    "jacketColor": "#3b6470"
  },
  {
    "id": "mags",
    "name": "Mags",
    "role": "Fixer",
    "skin": "#aa7655",
    "hair": "short",
    "hairColor": "#4b352a",
    "feature": "Hat and mustache",
    "jacketColor": "#6e7153"
  },
  {
    "id": "benning",
    "name": "Sergeant Benning",
    "role": "SPD, corrupt cop",
    "skin": "#d0a07c",
    "hair": "cropped",
    "hairColor": "#6b5140",
    "feature": "Police uniform and cap",
    "jacketColor": "#263f65"
  }
];

export const STREET_NAMES = [
  "Marina Boulevard",
  "Palm Row",
  "Neon Strip",
  "Harbor Road",
  "Dockside Avenue",
  "Sunset Lane",
  "Coral Street",
  "Anchor Way",
  "Vista Drive",
  "Market Street",
  "Pier Road",
  "Tower Plaza"
];

export const BRAND_NAMES = [
  "Anchor Supply",
  "Coral Coffee",
  "Goldfinch Records",
  "Nightglass Tattoo",
  "Seabreeze Market",
  "Copper Kettle Diner",
  "Driftline Garage",
  "Bright Tide Clothing",
  "Blue Gull Fish",
  "Crane Yard Tools",
  "Velvet Current Club",
  "Palm Crown Bar"
];

export const HOTEL_NAMES = [
  "The Lantern Hotel",
  "Silver Shore Hotel",
  "Crown Reef Hotel",
  "The Lookout Inn",
  "Harbor Light Hotel",
  "Golden Gull Lodge",
  "The Glass Harbor",
  "Palm Crest Hotel",
  "The Boardwalk Inn",
  "Moonlit Bay Hotel"
];

export const TAPE_TITLES = [
  "First Light at the Pier",
  "The Last Ferry",
  "Neon After Midnight",
  "Letters from the Harbor",
  "A Driver Comes Home",
  "Rain on Market Street",
  "The Empty Penthouse",
  "Footsteps on the Boardwalk",
  "Under the Crane",
  "The Garage Radio",
  "Two Tickets North",
  "Salt on the Wind",
  "A Window Above Town",
  "The Long Way Back",
  "Headlights in the Fog",
  "The Diner at Dawn",
  "A Promise by the Sea",
  "The Quiet Cordon",
  "Gold Beneath the Glass",
  "One More Sunset"
];

export const PROPERTIES = [
  {
    "id": "safehouse",
    "name": "Safehouse",
    "price": 0,
    "garageSlots": 1
  },
  {
    "id": "penthouse",
    "name": "Palm Heights Penthouse",
    "price": 15000,
    "garageSlots": 2,
    "income": 500
  }
];

export const RESPECT_LEVELS = [
  {
    "level": 1,
    "at": 0,
    "unlocks": [
      "Pistol",
      "Dock Hook"
    ]
  },
  {
    "level": 2,
    "at": 100,
    "unlocks": [
      "Street SMG",
      "Pump Shotgun",
      "Solmar Cocktail"
    ]
  },
  {
    "level": 3,
    "at": 300,
    "unlocks": [
      "VK-47 Longshoreman"
    ]
  },
  {
    "level": 4,
    "at": 600,
    "unlocks": [
      "Palm Heights Penthouse"
    ]
  },
  {
    "level": 5,
    "at": 1000,
    "unlocks": [
      "Longeye 308"
    ]
  }
];

export const ROOF_TYPES = [
  {
    "id": "flat",
    "heightFactor": 0.08,
    "overhang": 0.15
  },
  {
    "id": "gabled",
    "heightFactor": 0.5,
    "overhang": 0.45,
    "pitch": 0.5
  },
  {
    "id": "hipped",
    "heightFactor": 0.45,
    "overhang": 0.4,
    "pitch": 0.45
  },
  {
    "id": "mansard",
    "heightFactor": 0.6,
    "overhang": 0.3,
    "pitch": 0.6
  },
  {
    "id": "pyramidal",
    "heightFactor": 0.55,
    "overhang": 0.35,
    "pitch": 0.55
  },
  {
    "id": "skillion",
    "heightFactor": 0.35,
    "overhang": 0.3,
    "pitch": 0.35
  }
];

export const FACADE_MATERIALS = [
  {
    "district": "marina",
    "material": "wood",
    "color": "#f3dfbb",
    "roughness": 0.8
  },
  {
    "district": "old-solmar",
    "material": "brick",
    "color": "#b75539",
    "roughness": 0.9
  },
  {
    "district": "neon-mile",
    "material": "painted-brick",
    "color": "#30263f",
    "roughness": 0.75
  },
  {
    "district": "harbor-docks",
    "material": "metal",
    "color": "#7c8587",
    "roughness": 0.65
  },
  {
    "district": "palm-heights",
    "material": "concrete",
    "color": "#e5dbc4",
    "roughness": 0.85
  },
  {
    "district": "downtown",
    "material": "glass",
    "color": "#50768c",
    "roughness": 0.18
  }
];

export const STREET_FURNITURE = [
  {
    "kind": "hydrant",
    "districts": [
      "marina",
      "old-solmar",
      "neon-mile",
      "harbor-docks",
      "palm-heights",
      "downtown"
    ],
    "density": 0.15
  },
  {
    "kind": "bench",
    "districts": [
      "marina",
      "old-solmar",
      "palm-heights",
      "downtown"
    ],
    "density": 0.3
  },
  {
    "kind": "trash-bin",
    "districts": [
      "marina",
      "old-solmar",
      "neon-mile",
      "harbor-docks",
      "palm-heights",
      "downtown"
    ],
    "density": 0.35
  },
  {
    "kind": "awning",
    "districts": [
      "old-solmar",
      "neon-mile",
      "marina"
    ],
    "density": 0.5
  },
  {
    "kind": "utility-box",
    "districts": [
      "downtown",
      "harbor-docks",
      "neon-mile"
    ],
    "density": 0.2
  },
  {
    "kind": "bus-stop",
    "districts": [
      "downtown",
      "old-solmar",
      "neon-mile",
      "harbor-docks"
    ],
    "density": 0.12
  },
  {
    "kind": "planter",
    "districts": [
      "palm-heights",
      "downtown",
      "marina"
    ],
    "density": 0.4
  }
];

export const SIGN_TEXTS = {
  "marina": [
    "Anchor Supply",
    "Blue Gull Fish",
    "The Boardwalk Inn",
    "PIER",
    "FISH"
  ],
  "old-solmar": [
    "Coral Coffee",
    "Seabreeze Market",
    "Copper Kettle Diner",
    "Driftline Garage",
    "DINER",
    "GARAGE",
    "MARKET"
  ],
  "neon-mile": [
    "Goldfinch Records",
    "Nightglass Tattoo",
    "Velvet Current Club",
    "The Lookout Inn",
    "TATTOO",
    "CLUB",
    "NEON"
  ],
  "harbor-docks": [
    "Anchor Supply",
    "Crane Yard Tools",
    "Harbor Light Hotel",
    "CARGO",
    "WAREHOUSE"
  ],
  "palm-heights": [
    "Bright Tide Clothing",
    "Palm Crown Bar",
    "Palm Crest Hotel",
    "Moonlit Bay Hotel",
    "HOTEL",
    "BAR"
  ],
  "downtown": [
    "The Lantern Hotel",
    "Silver Shore Hotel",
    "Crown Reef Hotel",
    "Golden Gull Lodge",
    "The Glass Harbor",
    "MARKET",
    "HOTEL"
  ]
};

export const TREE_TYPES = [
  {
    "id": "palm",
    "height": [
      5,
      8
    ],
    "leafColor": "#388959",
    "districts": [
      "marina",
      "neon-mile",
      "palm-heights"
    ]
  },
  {
    "id": "oak",
    "height": [
      4,
      7
    ],
    "leafColor": "#527e42",
    "districts": [
      "old-solmar",
      "downtown"
    ]
  },
  {
    "id": "pine",
    "height": [
      5,
      9
    ],
    "leafColor": "#315e48",
    "districts": [
      "palm-heights",
      "harbor-docks"
    ]
  }
];

export const LAMP_TYPES = [
  {
    "id": "modern",
    "districts": [
      "downtown"
    ],
    "height": 6,
    "glow": "warm"
  },
  {
    "id": "classic",
    "districts": [
      "old-solmar"
    ],
    "height": 5.5,
    "glow": "warm"
  },
  {
    "id": "harbor",
    "districts": [
      "harbor-docks",
      "marina"
    ],
    "height": 7,
    "glow": "warm"
  }
];

export const RACE_ROUTES = [
  {
    "id": "marina-sprint",
    "name": "Marina Sprint",
    "checkpoints": 8,
    "reward": 300
  },
  {
    "id": "neon-loop",
    "name": "Neon Loop",
    "checkpoints": 6,
    "reward": 500
  },
  {
    "id": "harbor-run",
    "name": "Harbor Run",
    "checkpoints": 10,
    "reward": 800
  }
];

export const WEATHER_TYPES = [
  "clear",
  "cloudy",
  "rain"
];

export const WEATHER_DURATIONS = {
  "clear": {
    "minSeconds": 60,
    "maxSeconds": 120,
    "transitionSeconds": 10
  },
  "cloudy": {
    "minSeconds": 60,
    "maxSeconds": 120,
    "transitionSeconds": 10
  },
  "rain": {
    "minSeconds": 60,
    "maxSeconds": 120,
    "transitionSeconds": 10
  }
};

export const CRIME_HEAT = [
  {
    "crime": "theft",
    "heat": 1
  },
  {
    "crime": "assault",
    "heat": 2
  },
  {
    "crime": "shooting",
    "heat": 3
  },
  {
    "crime": "cop-killed",
    "heat": 4
  }
];
