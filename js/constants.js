export const SKILL = {
  StripBall: 1,
  IncreaseStrength: 2,
  IncreaseAgility: 3,
  IncreaseMovement: 4,
  IncreaseArmour: 5,
  Catch: 6,
  Dodge: 7,
  Sprint: 8,
  PassBlock: 9,
  FoulAppearance: 10,
  Leap: 11,
  ExtraArms: 12,
  MightyBlow: 13,
  Leader: 14,
  Horns: 15,
  TwoHeads: 16,
  StandFirm: 17,
  AlwaysHungry: 18,
  Regeneration: 19,
  TakeRoot: 20,
  Accurate: 21,
  BreakTackle: 22,
  SneakyGit: 23,
  Chainsaw: 25,
  Dauntless: 26,
  DirtyPlayer: 27,
  DivingCatch: 28,
  DumpOff: 29,
  Block: 30,
  BoneHead: 31,
  VeryLongLegs: 32,
  DisturbingPresence: 33,
  DivingTackle: 34,
  Fend: 35,
  Frenzy: 36,
  Grab: 37,
  Guard: 38,
  HailMaryPass: 39,
  Juggernaut: 40,
  JumpUp: 41,
  Loner: 44,
  NervesOfSteel: 45,
  NoHands: 46,
  Pass: 47,
  PilingOn: 48,
  PrehensileTail: 49,
  Pro: 50,
  ReallyStupid: 51,
  RightStuff: 52,
  SafeThrow: 53,
  SecretWeapon: 54,
  Shadowing: 55,
  SideStep: 56,
  Tackle: 57,
  StrongArm: 58,
  Stunty: 59,
  SureFeet: 60,
  SureHands: 61, // Shows up on the second roll (the automatic reroll)
  ThickSkull: 63,
  ThrowTeamMate: 64,
  Unknown_65: 65, // ??
  WildAnimal: 67,
  Wrestle: 68,
  Tentacles: 69,
  MultipleBlock: 70,
  Kick: 71,
  KickOffReturn: 72,
  BigHand: 74,
  Claw: 75,
  BallChain: 76,
  Stab: 77,
  HypnoticGaze: 78,
  Stakes: 79,
  Bombardier: 80,
  Decay: 81,
  NurglesRot: 82,
  Titchy: 83,
  BloodLust: 84,
  FanFavourite: 85,
  Animosity: 86
};

export const SKILL_NAME = {
  [SKILL.StripBall]: 'Strip Ball',
  [SKILL.IncreaseStrength]: 'ST+',
  [SKILL.IncreaseAgility]: 'AG+',
  [SKILL.IncreaseMovement]: 'MA+',
  [SKILL.IncreaseArmour]: 'AV+',
  [SKILL.Catch]: 'Catch',
  [SKILL.Dodge]: 'Dodge',
  [SKILL.Sprint]: 'Sprint',
  [SKILL.PassBlock]: 'Pass Block',
  [SKILL.FoulAppearance]: 'Foul Appearance',
  [SKILL.Leap]: 'Leap',
  [SKILL.ExtraArms]: 'Extra Arms',
  [SKILL.MightyBlow]: 'Mighty Blow',
  [SKILL.Leader]: 'Leader',
  [SKILL.Horns]: 'Horns',
  [SKILL.TwoHeads]: 'Two-Heads',
  [SKILL.StandFirm]: 'Stand Firm',
  [SKILL.AlwaysHungry]: 'Always Hungry',
  [SKILL.Regeneration]: 'Regeneration',
  [SKILL.TakeRoot]: 'Take Root',
  [SKILL.Accurate]: 'Accurate',
  [SKILL.BreakTackle]: 'Break Tackle',
  [SKILL.SneakyGit]: 'Sneaky Git',
  [SKILL.Chainsaw]: 'Chainsaw',
  [SKILL.Dauntless]: 'Dauntless',
  [SKILL.DirtyPlayer]: 'Dirty Player',
  [SKILL.DivingCatch]: 'Diving Catch',
  [SKILL.DumpOff]: 'Dump-Off',
  [SKILL.Block]: 'Block',
  [SKILL.BoneHead]: 'Bone-Head',
  [SKILL.VeryLongLegs]: 'Very Long Legs',
  [SKILL.DisturbingPresence]: 'Disturbing Presence',
  [SKILL.DivingTackle]: 'Diving Tackle',
  [SKILL.Fend]: 'Fend',
  [SKILL.Frenzy]: 'Frenzy',
  [SKILL.Grab]: 'Grab',
  [SKILL.Guard]: 'Guard',
  [SKILL.HailMaryPass]: 'Hail-Mary Pass',
  [SKILL.Juggernaut]: 'Juggernaut',
  [SKILL.JumpUp]: 'Jump-Up',
  [SKILL.Loner]: 'Loner',
  [SKILL.NervesOfSteel]: 'Nerves Of Steel',
  [SKILL.NoHands]: 'No Hands',
  [SKILL.Pass]: 'Pass',
  [SKILL.PilingOn]: 'Piling On',
  [SKILL.PrehensileTail]: 'Prehensile Tail',
  [SKILL.Pro]: 'Pro',
  [SKILL.ReallyStupid]: 'Really Stupid',
  [SKILL.RightStuff]: 'Right Stuff',
  [SKILL.SafeThrow]: 'Safe Throw',
  [SKILL.SecretWeapon]: 'Secret Weapon',
  [SKILL.Shadowing]: 'Shadowing',
  [SKILL.SideStep]: 'Side Step',
  [SKILL.Tackle]: 'Tackle',
  [SKILL.StrongArm]: 'Strong Arm',
  [SKILL.Stunty]: 'Stunty',
  [SKILL.SureFeet]: 'Sure Feet',
  [SKILL.SureHands]: 'Sure Hands',
  [SKILL.ThickSkull]: 'Thick Skull',
  [SKILL.ThrowTeamMate]: 'Throw Team Mate',
  [SKILL.WildAnimal]: 'Wild Animal',
  [SKILL.Wrestle]: 'Wrestle',
  [SKILL.Tentacles]: 'Tentacles',
  [SKILL.MultipleBlock]: 'Multiple Block',
  [SKILL.Kick]: 'Kick',
  [SKILL.KickOffReturn]: 'Kick-Off Return',
  [SKILL.BigHand]: 'Big Hand',
  [SKILL.Claw]: 'Claw',
  [SKILL.BallChain]: 'Ball and Chain',
  [SKILL.Stab]: 'Stab',
  [SKILL.HypnoticGaze]: 'Hypnotic Gaze',
  [SKILL.Stakes]: 'Stakes',
  [SKILL.Bombardier]: 'Bombardier',
  [SKILL.Decay]: 'Decay',
  [SKILL.NurglesRot]: 'Nurgles Rot',
  [SKILL.Titchy]: 'Titchy',
  [SKILL.BloodLust]: 'Blood-Lust',
  [SKILL.FanFavourite]: 'Fan Favourite',
  [SKILL.Animosity]: 'Animosity'
};

export const SITUATION = {
  Active: undefined,
  Reserves: 1,
  SentOff: 5,
  KO: 2,
  Casualty: 4
};

export const BLOCK_OUTCOME = {
  AtDownDeInPlace: 0,
  AtDownDeDown: 1,
  WrestleDown: 2, //Before use wrestle choice!
  AtInPlaceDeInPlace: 3,
  AtMoveDePush: 4,
  AtInPlaceDeDown: 5, //block down De in Place -> Fend has no 2nd dice afterpush?
  AtMoveDePushDown: 6
};

export const REQUEST_TYPE = {
  Unknown_0: 0,
  ForCoach: 1 //Coach / Player
};

export const ROLL_STATUS = {
  NoStatus: 0,
  RerollTaken: 1,
  RerollNotTaken: 2,
  RerollWithSkill: 3,
  Reroll4: 4 //After Subresult 7 (Failed Dodge) - Maybe after use skill(dodge)
};

export const WEATHER = {
  Nice: 0,
  SwelteringHeat: 1,
  VerySunny: 2,
  PouringRain: 3,
  Blizzard: 4
};

export const ACTION_TYPE = {
  Move: 0, //Move
  Block: 1, //Block
  Blitz: 2, //Blitz
  Pass: 3, //Pass
  Handoff: 4, //Ball handoff
  FoulAR: 5, //Armor
  Armor: 6, //Armor
  Kickoff: 7, //Pick Kickoff Location
  Scatter: 8, //Pick Kickoff Scatter KickSkill
  Catch: 9, //Catch
  TouchDown: 10, //Touchdown?
  StunWake: 11, //End Turn Stun release?
  WakeUp: 12, //Wake up after KO
  EventPitchInv: 13,
  Pickup: 14, //Pickup Ball
  ActivationTest: 15, //Activation Test
  Landing: 16,
  EatTeamMate: 17,
  Shadowing: 18,
  Stab: 19,
  FrenzyStab: 20,
  Leap: 21,
  Chainsaw: 22,
  BallChain: 23,
  HailMaryPass: 24,
  PilingOn: 25,
  MultiBlock: 26,
  HypnoticGaze: 27,
  KickOffReturn: 28,
  PassBlock: 29,
  HalflingChef: 30,
  WizardFireBallCast: 31,
  WizardFireball: 32,
  WizardLightning: 33, //Wizard Lightning
  FoulRefCheck: 34, //Foul - Comes After Armor roll - maybe ref?
  ScatterPlayer: 35,
  QuickSnap: 36,
  FreeMove: 37, //Move after High Kick
  DumpOff: 38,
  DodgeAgDivingTackle: 39,
  ThrowTeamMate: 40,
  MultiStab: 41,
  ActivatePlayer: 42, //Select Active Player
  PassBlockMoveLeap: 43,
  PassBlockLeapMove: 44,
  PassBlockLeap: 45,
  FansNumber: 46, //After Kickoff Choice, has 2 BoardActionResults with RT 69
  InitialWeather: 47, //After Kickoff Choice, has 1 BoardActionResult with RT 70
  SwelteringHeat: 48,
  Feed: 49,
  BombKnockDown: 50,
  BombHalfDown: 51,
  BombThrow: 52,
  BombCatch: 53,
  BombScatter: 54, // (Bomb) Scatter after HailMary pass ?
  BombThrowDestination: 55, // Pick the throw destination after a Bomb Catch(Intercept?)
  HailMaryBomb: 56,
  Turnover: 58,
};

export const RESULT_TYPE = {
  Passed: 0, //Skilltest Passed
  FailNoTurnover: 1, //Failed with Skill Reroll -> Failed no Turnover (Wild Animal Fail ect)
  FailTeamRR: 2, //Failed with Possible Reroll
  FailFinal: 3 //Failed No Reroll -> Final!
};

export const SUB_RESULT_TYPE = {
  ArmorNoBreak: 1, //Not sure - after rlArmor (3) - Only after Block?
  InjuryStun: 2,
  InjuryKO: 3,
  InjuryCAS: 4,
  Unknown_7: 7, //Pick Dodge skill use?
  CASResult: 18, //Final CAS Result
  Fend: 35, //Blockdice against Fend, no 2nd Dice.
  DodgeNoReq: 57, //Dodge vs Tackle before RR Pick
  Unknown_68: 68 //Pick Wrestle skill use?
};

export const BLOCK = {
  AttackerDown: "AD",
  BothDown: "BD",
  Push: "P",
  DefenderStumbles: "DS",
  DefenderDown: "DD",
}

export const BLOCK_DIE = {
  0: BLOCK.AttackerDown,
  1: BLOCK.BothDown,
  2: BLOCK.Push,
  3: BLOCK.DefenderStumbles,
  4: BLOCK.DefenderDown,
}

export const RACE_ID = {
  Human: 1,
  Dwarf: 2,
  Skaven: 3,
  Orc: 4,
  Lizardman: 5,
  Goblin: 6,
  WoodElf: 7,
  Chaos: 8,
  DarkElf: 9,
  Undead: 10,
  Norse: 12,
  Amazon: 13,
  ProElf: 14,
  HighElf: 15,
  Khemri: 16,
  Necromantic: 17,
  Nurgle: 18,
  Vampire: 20,
  ChaosDwarf: 21,
  Underworld: 22,
  Bretonnian: 24,
  Kislev: 25,
  ChaosPact: 33,
}

export const RACE_NAMES = {
  [RACE_ID.Amazon]: "Amazon",
  [RACE_ID.Bretonnian]: "Bretonnian",
  [RACE_ID.Chaos]: "Chaos",
  [RACE_ID.ChaosDwarf]: "Chaos Dwarf",
  [RACE_ID.ChaosPact]: "Chaos Pact",
  [RACE_ID.DarkElf]: "Dark Elf",
  [RACE_ID.Dwarf]: "Dwarf",
  [RACE_ID.Goblin]: "Goblin",
  [RACE_ID.HighElf]: "High Elf",
  [RACE_ID.Human]: "Human",
  [RACE_ID.Khemri]: "Khemri",
  [RACE_ID.Kislev]: "Kislev",
  [RACE_ID.Lizardman]: "Lizardman",
  [RACE_ID.Necromantic]: "Necromantic",
  [RACE_ID.Norse]: "Norse",
  [RACE_ID.Nurgle]: "Nurgle",
  [RACE_ID.Orc]: "Orc",
  [RACE_ID.ProElf]: "Pro Elf",
  [RACE_ID.Skaven]: "Skaven",
  [RACE_ID.Undead]: "Undead",
  [RACE_ID.Underworld]: "Underworld",
  [RACE_ID.Vampire]: "Vampire",
  [RACE_ID.WoodElf]: "Wood Elf",
}

export const RACE_SLUG = {
  [RACE_ID.Amazon]: "amazon",
  [RACE_ID.Bretonnian]: "bretonnia",
  [RACE_ID.Chaos]: "chaos",
  [RACE_ID.ChaosDwarf]: "chaosdwarf",
  [RACE_ID.ChaosPact]: "chaospact",
  [RACE_ID.DarkElf]: "dark elf",
  [RACE_ID.Dwarf]: "dwarf",
  [RACE_ID.Goblin]: "goblin",
  [RACE_ID.HighElf]: "highelf",
  [RACE_ID.Human]: "human",
  [RACE_ID.Khemri]: "khemri",
  [RACE_ID.Kislev]: "kislev",
  [RACE_ID.Lizardman]: "lizardman",
  [RACE_ID.Necromantic]: "necromantic",
  [RACE_ID.Norse]: "norse",
  [RACE_ID.Nurgle]: "nurgle",
  [RACE_ID.Orc]: "orc",
  [RACE_ID.ProElf]: "proelf",
  [RACE_ID.Skaven]: "skaven",
  [RACE_ID.Undead]: "undead",
  [RACE_ID.Underworld]: "underworld",
  [RACE_ID.Vampire]: "vampire",
  [RACE_ID.WoodElf]: "wood elf",
}

export function getPlayerType(playerId, playerTypeId) {

  switch (playerTypeId) {
    case 71: case 414: case 459: return { race: 'amazon', model: `blitzer${playerId % 2 + 1}` };
    case 70: case 413: case 458: return { race: 'amazon', model: `catcher${playerId % 2 + 1}` };
    case 68: case 411: case 456: return { race: 'amazon', model: `lineman${playerId % 2 + 1}` };
    case 69: case 457: case 412: return { race: 'amazon', model: `thrower` };
    case 32: case 336: case 355: return { race: 'chaos', model: `beastman${playerId % 4 + 1}` };
    case 34: case 338: case 357: return { race: 'chaos', model: `minotaur${playerId % 3 + 1}` };
    case 33: case 337: case 356: return { race: 'chaos', model: `warrior${playerId % 6 + 1}` };
    case 330: case 363: case 109: return { race: 'chaosdwarf', model: `blocker${playerId % 4 + 1}` };
    case 331: case 364: case 110: return { race: 'chaosdwarf', model: `bullcentaur${playerId % 2 + 1}` };
    case 329: case 362: case 108: return { race: 'chaosdwarf', model: `hobgoblin${playerId % 4 + 1}` };
    case 332: case 365: case 111: return { race: 'chaosdwarf', model: `minotaur` };
    case 47: case 345: case 391: return { race: 'darkelf', model: `lineman` };
    case 48: case 347: case 392: return { race: 'darkelf', model: `runner` };
    case 49: case 346: case 394: return { race: 'darkelf', model: `assasin` };
    case 50: case 344: case 393: return { race: 'darkelf', model: `blitzer` };
    case 51: case 348: case 395: return { race: 'darkelf', model: `witchelf` };
    case 6: case 426: return { race: 'dwarf', model: `longbeard${playerId % 3 + 1}` };
    case 8: case 427: return { race: 'dwarf', model: `blitzer${playerId % 2 + 1}` };
    case 7: case 429: return { race: 'dwarf', model: `runner${playerId % 3 + 1}` };
    case 9: case 428: return { race: 'dwarf', model: `trollslayer${playerId % 2 + 1}` };
    case 10: case 430: return { race: 'dwarf', model: `deathroller` };
    case 30: case 372: case 466: case 479: return { race: 'goblin', model: `goblin${playerId % 7 + 1}` };
    case 31: case 373: case 467: case 481: return { race: 'goblin', model: `looney${playerId % 2 + 1}` };
    case 44: case 377: case 471: case 484: return { race: 'goblin', model: `troll${playerId % 3 + 1}` };
    case 45: case 374: case 468: case 482: return { race: 'goblin', model: `pogo${playerId % 2 + 1}` };
    case 46: case 376: case 470: case 483: return { race: 'goblin', model: `fanatic${playerId % 2 + 1}` };
    case 107: case 375: case 469: case 480: return { race: 'goblin', model: `bomber${playerId % 2 + 1}` };
    case 60: case 431: case 485: return { race: 'halfling', model: `halfling${playerId % 5 + 1}` };
    case 61: case 432: case 486: return { race: 'halfling', model: `treeman${playerId % 3 + 1}` };
    case 77: case 323: case 387: return { race: 'highelf', model: `lineman${playerId % 2 + 1}` };
    case 78: case 325: case 390: return { race: 'highelf', model: `thrower` };
    case 79: case 389: case 326: return { race: 'highelf', model: `catch${playerId % 2 + 1}` };
    case 80: case 324: case 388: return { race: 'highelf', model: `blitzer` };
    case 1: case 422: case 438: return { race: 'human', model: `lineman${playerId % 2 + 1}` };
    case 2: case 423: case 440: return { race: 'human', model: `catcher` };
    case 3: case 424: case 441: return { race: 'human', model: `thrower` };
    case 4: case 421: case 439: return { race: 'human', model: `blitzer` };
    case 5: case 425: case 442: return { race: 'human', model: `ogre` };
    case 81: case 499: return { race: 'khemri', model: `lineman${playerId % 4 + 1}` };
    case 82: case 500: return { race: 'khemri', model: `thrower${playerId % 2 + 1}` };
    case 83: case 501: return { race: 'khemri', model: `blitzer${playerId % 2 + 1}` };
    case 84: case 502: return { race: 'khemri', model: `mummy${playerId % 2 + 1}` };
    case 27: case 415: case 472: return { race: 'lizardman', model: `skink${playerId % 4 + 1}` };
    case 28: case 416: case 473: return { race: 'lizardman', model: `saurus${playerId % 4 + 1}` };
    case 29: case 417: case 474: return { race: 'lizardman', model: `kroxigor${playerId % 2 + 1}` };
    case 86: return { race: 'necromantic', model: `zombie${playerId % 4 + 1}` };
    case 87: return { race: 'necromantic', model: `ghoul${playerId % 2 + 1}` };
    case 88: return { race: 'necromantic', model: `wight${playerId % 2 + 1}` };
    case 89: case 498: return { race: 'necromantic', model: `golem${playerId % 2 + 1}` };
    case 90: case 497: return { race: 'necromantic', model: `werewolf${playerId % 2 + 1}` };
    case 62: case 405: case 450: return { race: 'norse', model: `lineman${playerId % 4 + 1}` };
    case 63: case 406: case 452: return { race: 'norse', model: `thrower` };
    case 64: case 407: case 451: return { race: 'norse', model: `runner` };
    case 65: case 408: case 453: return { race: 'norse', model: `berserker${playerId % 2 + 1}` };
    case 66: case 409: case 454: return { race: 'norse', model: `ulfwerener${playerId % 2 + 1}` };
    case 67: case 410: case 455: return { race: 'norse', model: `yhetee` };
    case 91: case 358: return { race: 'nurgle', model: `rotter${playerId % 6 + 1}` };
    case 92: case 359: return { race: 'nurgle', model: `pestigor${playerId % 4 + 1}` };
    case 93: case 360: return { race: 'nurgle', model: `warrior${playerId % 4 + 1}` };
    case 94: case 361: return { race: 'nurgle', model: `beast - of - nurgle` };
    case 95: case 476: case 478: case 737: return { race: 'ogre', model: `snotling${playerId % 7 + 1}` };
    case 96: case 475: case 477: case 738: return { race: 'ogre', model: `ogre${playerId % 6 + 1}` };
    case 21: case 366: case 460: return { race: 'orc', model: `lineman${playerId % 3 + 1}` };
    case 22: case 369: case 463: return { race: 'orc', model: `goblin${playerId % 2 + 1}` };
    case 23: case 368: case 462: return { race: 'orc', model: `thrower${playerId % 2 + 1}` };
    case 24: case 370: case 464: return { race: 'orc', model: `blocker${playerId % 4 + 1}` };
    case 25: case 367: case 461: return { race: 'orc', model: `blitzer${playerId % 3 + 1}` };
    case 26: case 371: case 465: return { race: 'orc', model: `troll` };
    case 72: case 739: return { race: 'proelf', model: `lineman${playerId % 2 + 1}` };
    case 73: case 741: return { race: 'proelf', model: `thrower` };
    case 74: case 749: return { race: 'proelf', model: `catcher${playerId % 2 + 1}` };
    case 75: case 740: return { race: 'proelf', model: `blitzer${playerId % 2 + 1}` };
    case 16: case 339: case 378: return { race: 'skaven', model: `lineman${playerId % 3 + 1}` };
    case 17: case 340: case 380: return { race: 'skaven', model: `thrower` };
    case 18: case 341: case 381: return { race: 'skaven', model: `runner${playerId % 2 + 1}` };
    case 19: case 342: case 379: return { race: 'skaven', model: `blitzer${playerId % 2 + 1}` };
    case 20: case 343: case 382: return { race: 'skaven', model: `ratogre` };
    case 54: case 492: return { race: 'undead', model: `skeleton${playerId % 3 + 1}` };
    case 55: case 493: return { race: 'undead', model: `zombie${playerId % 4 + 1}` };
    case 56: case 494: return { race: 'undead', model: `ghoul${playerId % 2 + 1}` };
    case 57: case 495: return { race: 'undead', model: `wight${playerId % 2 + 1}` };
    case 58: case 496: return { race: 'undead', model: `mummy${playerId % 2 + 1}` };
    case 123: case 732: return { race: 'underworld', model: `goblin${playerId % 5 + 1}` };
    case 124: case 733: return { race: 'underworld', model: `lineman${playerId % 4 + 1}` };
    case 125: case 734: return { race: 'underworld', model: `thrower${playerId % 2 + 1}` };
    case 126: case 735: return { race: 'underworld', model: `blitzer${playerId % 2 + 1}` };
    case 127: case 736: return { race: 'underworld', model: `troll` };
    case 97: case 327: case 327: case 503: return { race: 'vampire', model: `thrall${playerId % 3 + 1}` };
    case 98: case 328: case 328: case 504: return {
      race: 'vampire', model: `vampire${playerId % 3 + 1}`
    };
    case 11: case 396: case 433: return { race: 'woodelf', model: `lineman${playerId % 4 + 1}` };
    case 12: case 397: case 434: return { race: 'woodelf', model: `catcher${playerId % 4 + 1}` };
    case 13: case 398: case 435: return { race: 'woodelf', model: `thrower${playerId % 2 + 1}` };
    case 14: case 399: case 436: return { race: 'woodelf', model: `wardancer${playerId % 2 + 1}` };
    case 15: case 400: case 437: return { race: 'woodelf', model: `tree` };
    case 142: case 401: case 446: return { race: 'kislev', model: `lineman${playerId % 4 + 1}` };
    case 143: case 403: case 448: return { race: 'kislev', model: `catcher${playerId % 2 + 1}` };
    case 144: case 402: case 447: return { race: 'kislev', model: `blitzer${playerId % 2 + 1}` };
    case 145: case 404: case 449: return { race: 'kislev', model: `bear` };
    case 139: case 333: case 420: case 443: return {
      race: 'bretonnia', model: `peasant${playerId % 3 + 1}`
    };
    case 140: case 335: case 419: case 445: return {
      race: 'bretonnia', model: `blocker${playerId % 2 + 1}`
    };
    case 141: case 334: case 418: case 444: return {
      race: 'bretonnia', model: `knight${playerId % 2 + 1}`
    };
    case 146: case 239: case 617: case 618: return { model: 'barik-farblast', race: 'starplayer' };
    case 293: case 294: case 619: case 620: return { model: 'bertha-bigfist', race: 'starplayer' };
    case 133: case 233: case 621: case 622: return { model: 'bomber-dribblesnot', race: 'starplayer' };
    case 309: case 310: case 623: case 624: return { model: 'boomer-eziasson', race: 'starplayer' };
    case 164: case 256: case 625: case 626: return { model: 'brick-farth', race: 'starplayer' };
    case 224: case 59: case 627: case 628: return { model: 'count-luthorvon-drakenborg', race: 'starplayer' };
    case 301: case 302: case 629: case 630: return { model: 'crazy-igor', race: 'starplayer' };
    case 103: case 229: case 631: case 632: return { model: 'deeproot-strongbranch', race: 'starplayer' };
    case 147: case 240: case 633: case 634: return { model: 'dolfar-longstride', race: 'starplayer' };
    case 101: case 227: case 635: case 636: return { model: 'eldril-sidewinder', race: 'starplayer' };
    case 154: case 247: case 637: case 638: return { model: 'fezglitch', race: 'starplayer' };
    case 313: case 314: case 639: case 640: return { model: 'flint-churnblade', race: 'starplayer' };
    case 303: case 304: case 641: case 642: return { model: 'fungus-the-loon', race: 'starplayer' };
    case 149: case 242: case 643: case 644: return { model: 'glart-smashrip-jr', race: 'starplayer' };
    case 214: case 36: case 645: case 646: return { model: 'grashnak-blackhoof', race: 'starplayer' };
    case 215: case 37: case 647: case 648: return { model: 'griff-oberwald', race: 'starplayer' };
    case 216: case 38: case 649: case 650: return { model: 'grim-ironjaw', race: 'starplayer' };
    case 148: case 241: case 651: case 652: return { model: 'grotty', race: 'starplayer' };
    case 315: case 316: case 653: case 654: return { model: 'hack-enslash', race: 'starplayer' };
    case 138: case 238: case 655: case 656: return { model: 'hakflem-skuttlespike', race: 'starplayer' };
    case 217: case 39: case 657: case 658: return { model: 'headsplitter', race: 'starplayer' };
    case 317: case 318: case 659: case 660: return { model: 'helmut-wulf', race: 'starplayer' };
    case 275: case 276: case 661: case 662: return { model: 'hemlock', race: 'starplayer' };
    case 222: case 52: case 663: case 664: return { model: 'horkon-heartripper', race: 'starplayer' };
    case 299: case 300: case 665: case 666: return { model: 'hthark-the-unstoppable', race: 'starplayer' };
    case 137: case 237: case 667: case 668: return { model: 'hubris-rakarth', race: 'starplayer' };
    case 307: case 308: case 669: case 670: return { model: 'humerus-carpal', race: 'starplayer' };
    case 106: case 232: case 671: case 672: return { model: 'icepelt-hammerblow', race: 'starplayer' };
    case 157: case 250: case 673: case 674: return { model: 'ithaca-benoin', race: 'starplayer' };
    case 136: case 236: case 675: case 676: return { model: 'j-earlice', race: 'starplayer' };
    case 218: case 40: case 677: case 678: return { model: 'jordel-freshbreeze', race: 'starplayer' };
    case 158: case 251: case 679: case 680: return { model: 'lewdgrip-whiparm', race: 'starplayer' };
    case 102: case 228: case 683: case 684: return { model: 'lord-borak-the-despoiler', race: 'starplayer' };
    case 281: case 282: case 681: case 682: return { model: 'lottabottol', race: 'starplayer' };
    case 160: case 252: case 685: case 686: return { model: 'max-spleenripper', race: 'starplayer' };
    case 135: case 235: case 687: case 688: return { model: 'mighty-zug', race: 'starplayer' };
    case 223: case 53: case 689: case 690: return { model: 'morg-n-thorg', race: 'starplayer' };
    case 305: case 306: case 693: case 694: return { model: 'nobbla-blackwart', race: 'starplayer' };
    case 150: case 243: case 691: case 692: return { model: 'prince-moranion', race: 'starplayer' };
    case 161: case 253: case 695: case 696: return { model: 'puggy-baconbreath', race: 'starplayer' };
    case 283: case 284: case 697: case 698: return { model: 'quetzal-leap', race: 'starplayer' };
    case 231: case 699: case 700: case 105: return { model: 'ramtut-iii', race: 'starplayer' };
    case 295: case 296: case 701: case 702: return { model: 'rashnak-backstabber', race: 'starplayer' };
    case 219: case 41: case 703: case 704: return { model: 'ripper', race: 'starplayer' };
    case 151: case 244: case 705: case 706: return { model: 'roxanna-darknail', race: 'starplayer' };
    case 100: case 226: case 707: case 708: return { model: 'scrappa-sorehead', race: 'starplayer' };
    case 104: case 230: case 709: case 710: return { model: 'setekh', race: 'starplayer' };
    case 319: case 320: case 711: case 712: return { model: 'sinnedbad', race: 'starplayer' };
    case 162: case 254: case 713: case 714: return { model: 'skitter-stab-stab', race: 'starplayer' };
    case 220: case 42: case 715: case 716: return { model: 'slibli', race: 'starplayer' };
    case 152: case 245: case 717: case 718: return { model: 'soaren-hightower', race: 'starplayer' };
    case 163: case 255: case 719: case 720: return { model: 'ugroth-bolgrot', race: 'starplayer' };
    case 221: case 43: case 721: case 722: return { model: 'varag-ghoul-chewer', race: 'starplayer' };
    case 277: case 278: case 725: case 726: return { model: 'wilhelm-chaney', race: 'starplayer' };
    case 279: case 280: case 723: case 724: return { model: 'willow-rosebark', race: 'starplayer' };
    case 225: case 727: case 728: case 99: return { model: 'zara-the-slayer', race: 'starplayer' };
    case 134: case 234: case 729: case 730: return { model: 'zzharg-madeye', race: 'starplayer' };
  }
        }
