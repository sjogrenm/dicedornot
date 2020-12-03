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
  Pickup: 14, //Pickup Ball
  ActivationTest: 15, //Activation Test
  Landing: 16,
  Shadowing: 18,
  Stab: 19,
  Leap: 21,
  BallChain: 23,
  MultiBlock: 26,
  HypnoticGaze: 27,
  WizardFireBallCast: 31,
  WizardFireball: 32,
  WizardLightning: 33, //Wizard Lightning
  FoulRefCheck: 34, //Foul - Comes After Armor roll - maybe ref?
  FreeMove: 37, //Move after High Kick
  DodgeAgDivingTackle: 39,
  MultiStab: 41,
  ActivatePlayer: 42, //Select Active Player
  Unknown_46: 46, //After Kickoff Choice, has 2 BoardActionResults with RT 69
  Unknown_47: 47, //After Kickoff Choice, has 1 BoardActionResult with RT 70
  SwelteringHeat: 48,
  BombKnockDown: 50,
  BombHalfDown: 51,
  BombThrow: 52,
  BombCatch: 53,
  BombScatter: 54, // (Bomb) Scatter after HailMary pass ?
  BombThrowDestination: 55 // Pick the throw destination after a Bomb Catch(Intercept?)
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
