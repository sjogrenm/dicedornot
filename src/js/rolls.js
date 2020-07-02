import {
  ATTACKER_DOWN,
  PUSH,
  BOTH_DOWN,
  DEFENDER_STUMBLES,
  DEFENDER_DOWN,
  TWO_DIE_BLOCK,
  BLOCK,
} from "./dice";
import { skillNames, skills } from "./constants";

// TODO: Switch over to using dice.js for better clarity

function ensureList(objOrList) {
  if (objOrList && objOrList.length) {
    return objOrList;
  } else {
    return [objOrList];
  }
}

function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}

class Player {
  #teamData;
  teamId;
  #playerData;
  playerId;

  constructor({ teamData, teamId, playerData, playerId }) {
    this.teamData = teamData;
    this.teamId = teamId;
    this.playerData = playerData;
    this.playerId = playerId;
  }

  get name() {
    return this.playerData.data.name;
  }

  get teamName() {
    return this.teamData.data.name;
  }
  get skills() {
    return Roll.translateStringNumberList(this.playerData.data.listskills);
  }
}

export class Roll {
  constructor(attrs) {
    Object.assign(this, attrs);
  }
  static argsFromXML(
    stepIndex,
    replaystep,
    actionIndex,
    action,
    resultIndex,
    boardactionresult
  ) {
    var playerData = this.currentPlayerData(replaystep, action);
    return {
      replaystep,
      action,
      boardactionresult,
      stepIndex,
      actionIndex,
      resultIndex,
      team: this.activeTeamName(replaystep),
      teamId: this.activeTeamId(replaystep),
      turn: this.currentTurn(replaystep),
      playerName: playerData.player.data.name,
      playerTeam: playerData.team.data.name,
      playerTeamId: playerData.teamId,
      playerSkills: this.translateStringNumberList(
        playerData.player.data.listskills
      ),
      rollType: this.rollType(boardactionresult),
      dice: this.dice(boardactionresult),
    };
  }
  value(dice) {
    throw "value must be defined by subclass";
  }
  get expectedValue() {
    throw "expectedValue must be defined by subclass";
  }
  simulateDice() {
    throw "simulateDice must be defined by subclass";
  }
  static valueTable() {
    throw "valueTable must be defined by subclass";
  }

  static ignore() {
    return false;
  }
  static dice(boardactionresult) {
    return this.translateStringNumberList(
      boardactionresult.coachchoices.listdices
    );
  }
  get actual() {
    return Object.assign(this.dataPoint(0, this.dice, "actual"), {
      turn: this.turn,
      player: this.playerName,
      playerSkills: this.playerSkills.map(skill => skillNames[skill]),
      rollName: this.constructor.rollName || this.rollName || this.rollType,
      dice: this.dice
    });
  }
  simulated(iteration) {
    return this.dataPoint(iteration, this.simulateDice(), "simulated");
  }

  dataPoint(iteration, dice, type) {
    return {
      iteration: iteration,
      index:
        this.stepIndex.toString().padStart(3, "0") +
        "." +
        this.actionIndex +
        "." +
        this.resultIndex,
      team: this.playerTeam
        ? this.playerTeamId + ". " + this.playerTeam
        : this.activeTeamId + ". " + this.activeTeam,
      outcomeValue: this.value(dice),
      type: type,
      expectedValue: this.expectedValue
    };
  }

  static teamName(replaystep, teamId) {
    return replaystep.boardstate.listteams.teamstate[teamId].data.name;
  }
  static activeTeamName(replaystep) {
    return this.teamName(replaystep, this.activeTeamId(replaystep));
  }
  static activeTeamId(replaystep) {
    return replaystep.boardstate.activeteam || 0;
  }
  static currentTurn(replaystep) {
    return (
      replaystep.boardstate.listteams.teamstate[this.activeTeamId(replaystep)]
        .gameturn || 0
    );
  }

  static currentPlayerData(replaystep, action) {
    var currentId = this.currentPlayer(action);
    var teams = replaystep.boardstate.listteams.teamstate;
    for (var teamId = 0; teamId < teams.length; teamId++) {
      var team = teams[teamId];
      for (var player of team.listpitchplayers.playerstate) {
        if (player.id === currentId) {
          return { team, teamId, player, playerId: player.id };
        }
      }
    }
    console.log("No player found", { replaystep, action });
  }

  static currentPlayer(action) {
    return action.playerid;
  }
  static rollType(boardactionresult) {
    return boardactionresult.rolltype;
  }

  static translateStringNumberList(str) {
    if (!str) return [];

    var stripped = str.substring(1, str.length - 1);
    var textList = stripped.split(",");

    var numberList = [];
    for (var i = 0; i < textList.length; i++) {
      numberList.push(parseInt(textList[i]));
    }
    return numberList;
  }

  static fromReplayStep(stepIndex, replaystep) {
    var actions = replaystep.ruleseventboardaction;
    if (actions && actions.length) {
      var rolls = [];
      for (var actionIndex = 0; actionIndex < actions.length; actionIndex++) {
        var action = actions[actionIndex];
        rolls = rolls.concat(
          Roll.fromAction(stepIndex, replaystep, actionIndex, action)
        );
      }
      return rolls;
    } else if (actions) {
      return Roll.fromAction(stepIndex, replaystep, 0, actions);
    } else {
      return [];
    }
  }

  static fromAction(stepIndex, replaystep, actionIndex, action) {
    var results = action.results.boardactionresult;
    if (results && results.length) {
      var rolls = [];
      for (var resultIndex = 0; resultIndex < results.length; resultIndex++) {
        var result = results[resultIndex];
        var roll = this.fromBoardActionResult(
          stepIndex,
          replaystep,
          actionIndex,
          action,
          resultIndex,
          result
        );
        if (roll) {
          rolls.push(roll);
        }
      }
      return rolls;
    } else if (results) {
      var roll = this.fromBoardActionResult(
        stepIndex,
        replaystep,
        actionIndex,
        action,
        0,
        results
      );
      if (roll) {
        return [roll];
      } else {
        return [];
      }
    } else {
      console.warn("Unexpectedly missing boardactionresult", {
        stepIndex,
        replaystep,
        action,
      });
      return [];
    }
  }
  static fromBoardActionResult(
    stepIndex,
    replaystep,
    actionIndex,
    action,
    resultIndex,
    boardactionresult
  ) {
    if (boardactionresult.rolltype === undefined) {
      return null;
    }
    if (boardactionresult.coachchoices.listdices === undefined) {
      return null;
    }
    var rollClass = ROLL_TYPES[boardactionresult.rolltype];
    if (rollClass === null) {
      return null;
    }

    if (rollClass) {
      if (rollClass.ignore(replaystep, action, boardactionresult)) {
        return null;
      } else {
        return new rollClass(
          rollClass.argsFromXML(
            stepIndex,
            replaystep,
            actionIndex,
            action,
            resultIndex,
            boardactionresult
          )
        );
      }
    } else {
      console.warn("Unknown roll " + boardactionresult.rolltype, {
        stepIndex,
        replaystep,
        actionIndex,
        action,
        resultIndex,
        boardactionresult,
      });
      return null;
    }
  }
}

class BlockRoll extends Roll {
  static rollName = "Block";

  static dice(boardactionresult) {
    var dice = super.dice(boardactionresult);
    // Block dice are doubled up, only use the first half of the dice list.
    return dice.slice(0, dice.length / 2).map(BlockRoll.asBlockDie);
  }

  static ignore(replaystep, action, boardactionresult) {
    // Block dice have dice repeated for the coaches selection, resulttype is missing for the second one
    if (boardactionresult.resulttype != 2) {
      return true;
    }
    if (boardactionresult.subresulttype == 35) {
      // Opponent picking whether to activate fend
      return true;
    }
    return false;
  }

  static asBlockDie(dieRoll) {
    switch (dieRoll) {
      case 0:
        return ATTACKER_DOWN;
      case 1:
        return BOTH_DOWN;
      case 2:
        return PUSH;
      case 3:
        return DEFENDER_STUMBLES;
      case 4:
        return DEFENDER_DOWN;
    }
  }

  static dieValue(result, attackerSkills, defenderSkills) {
    var attackerSkills = attackerSkills || [];
    var defenderSkills = defenderSkills || [];

    switch (result) {
      case ATTACKER_DOWN:
        return -1;
      case BOTH_DOWN:
        if (attackerSkills.includes(skills.Block)) {
          if (defenderSkills.includes(skills.Block)) {
            return 0;
          } else {
            return 0.75;
          }
        } else if (attackerSkills.includes(skills.Wrestle)) {
          return 0.5;
        } else {
          return -1;
        }
      case PUSH:
        return 0.25;
      case DEFENDER_STUMBLES:
        if (defenderSkills.includes(skills.Dodge)) {
          return 0;
        } else {
          return 1;
        }
      case DEFENDER_DOWN:
        return 1;
    }
  }
  value(dice) {
    // TODO: Handle values based on skills
    // TODO: Red Dice?
    var aSkills = this.playerSkills;
    return Math.max(...dice.map(die => BlockRoll.dieValue(die, aSkills)));
  }
  get expectedValue() {
    var values;
    if (this.dice.length == 1) {
      values = BLOCK.values.map((dice) => this.value([dice]));
    } else {
      values = TWO_DIE_BLOCK.values.map((dice) => this.value(dice));
    }
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  simulateDice() {
    return this.dice.map(() =>
      sample([
        ATTACKER_DOWN,
        BOTH_DOWN,
        PUSH,
        PUSH,
        DEFENDER_STUMBLES,
        DEFENDER_DOWN,
      ])
    );
  }
  static valueTable() {
    return {
      [`${this.rollName} - Attacker Down`]: this.dieValue(ATTACKER_DOWN),
      [`${this.rollName} - Both Down`]: this.dieValue(BOTH_DOWN),
      [`${this.rollName} - Both Down (Block vs None)`]: this.dieValue(
        BOTH_DOWN,
        [skills.Block]
      ),
      [`${this.rollName} - Both Down (Wrestle vs Anything)`]: this.dieValue(
        BOTH_DOWN,
        [skills.Wrestle]
      ),
      [`${this.rollName} - Both Down (Block vs Block)`]: this.dieValue(
        BOTH_DOWN,
        [skills.Block],
        [skills.Block]
      ),
      [`${this.rollName} - Both Down (None vs Block)`]: this.dieValue(
        BOTH_DOWN,
        [],
        [skills.Block]
      ),
      [`${this.rollName} - Push`]: this.dieValue(PUSH),
      [`${this.rollName} - Defender Stumbles`]: this.dieValue(
        DEFENDER_STUMBLES
      ),
      [`${this.rollName} - Defender Down`]: this.dieValue(DEFENDER_DOWN)
    };
  }
}

class FansRoll extends Roll {
  // TODO: Need to capture both teams rolls, because result is about comparison.
}

class ModifiedD6SumRoll extends Roll {
  constructor({ target, modifier, ...rest }) {
    super(rest);
    this.target = target;
    this.modifier = modifier;
  }
  static argsFromXML(
    stepIndex,
    replaystep,
    actionIndex,
    action,
    resultIndex,
    boardactionresult
  ) {
    var args = super.argsFromXML(
      stepIndex,
      replaystep,
      actionIndex,
      action,
      resultIndex,
      boardactionresult
    );
    args.modifier =
      ensureList(boardactionresult.listmodifiers.dicemodifier || [])
        .map((modifier) => modifier.value)
        .reduce((a, b) => a + b, 0) || 0;
    args.target = boardactionresult.requirement;
    return args;
  }

  get actual() {
    return Object.assign(super.actual, {
      target: this.modifiedTarget,
    });
  }
  get modifiedTarget() {
    if (this.dice.length == 1) {
      return Math.min(6, Math.max(2, this.target - this.modifier));
    } else {
      return this.target - this.modifier;
    }
  }
  value(dice) {
    if (dice.reduce((a, b) => a + b, 0) >= this.modifiedTarget) {
      return this.constructor.passValue;
    } else {
      return this.constructor.failValue;
    }
  }
  get expectedValue() {
    var diceSums = [0];
    for (var die = 0; die < this.dice.length; die++) {
      var newSums = [];
      for (var face = 1; face <= 6; face++) {
        for (const sum of diceSums) {
          newSums.push(sum + face);
        }
      }
      diceSums = newSums;
    }

    var numPossible = diceSums.length;
    var expected = 0;
    for (const sum of diceSums) {
      if (sum >= this.modifiedTarget) {
        expected += this.constructor.passValue / numPossible;
      } else {
        expected += this.constructor.failValue / numPossible;
      }
    }
    return expected;
  }
  simulateDice() {
    return this.dice.map(() => sample([1, 2, 3, 4, 5, 6]));
  }
  static valueTable() {
    var table = {};
    table[`${this.rollName} - Pass`] = this.passValue;
    table[`${this.rollName} - Fail`] = this.failValue;
    return table;
  }
}

class PickupRoll extends ModifiedD6SumRoll {
  static rollName = "Pickup";
  static passValue = 1;
  static failValue = -1;
}
class ArmorRoll extends ModifiedD6SumRoll {
  static rollName = "Armor";
  static passValue = -1;
  static failValue = 0;
  static valueTable() {
    var table = {};
    table[`${this.rollName} - Break`] = this.passValue;
    table[`${this.rollName} - Save`] = this.failValue;
    return table;
  }
}

class WildAnimalRoll extends ModifiedD6SumRoll {
  static rollName = "Wild Animal";
  static passValue = 0;
  static failValue = -1;
}

class DauntlessRoll extends ModifiedD6SumRoll {
  static rollName = "Dauntless";
  static passValue = 1;
  static failValue = 0;
}

class DodgeRoll extends ModifiedD6SumRoll {
  static rollName = "Dodge";
  static passValue = 1;
  static failValue = -1;
}

class JumpUpRoll extends ModifiedD6SumRoll {
  static rollName = "Jump Up";
  static passValue = 1;
  static failValue = 0;
}

class PassRoll extends ModifiedD6SumRoll {
  static rollName = "Pass";
  static passValue = 1;
  static failValue = -1;
}

class InterceptionRoll extends ModifiedD6SumRoll {
  // TODO: Player/team seems incorrect. Double-check w/ in-game replay viewer
  static rollName = "Interception";
  static passValue = 1;
  static failValue = 0;
}

class WakeUpRoll extends ModifiedD6SumRoll {
  static rollName = "Wake Up";
  static passValue = 1;
  static failValue = -1;
}

class GFIRoll extends ModifiedD6SumRoll {
  static rollName = "GFI";
  static passValue = 0;
  static failValue = -1;
}

class CatchRoll extends ModifiedD6SumRoll {
  static rollName = "Catch";
  static passValue = 1;
  static failValue = -1;
}

class InjuryRoll extends Roll {
  static rollName = "Injury";
  // TODO: Handle skills
  static injuryValue(total) {
    if (total <= 7) {
      return 0; // Only stunned, best outcome
    } else if (total <= 9) {
      return -0.5; // KO
    } else {
      return -1; // CAS
    }
  }
  value(dice) {
    var total = dice[0] + dice[1];
    return this.constructor.injuryValue(total);
  }
  get expectedValue() {
    var expected = 0;
    for (var first = 1; first <= 6; first++) {
      for (var second = 1; second <= 6; second++) {
        expected += this.value([first, second]);
      }
    }
    return expected / 36;
  }
  simulateDice() {
    return this.dice.map(() => sample([1, 2, 3, 4, 5, 6]));
  }
  static valueTable() {
    var table = {};
    table[`${this.rollName} - Stun`] = this.injuryValue(7);
    table[`${this.rollName} - KO`] = this.injuryValue(9);
    table[`${this.rollName} - Casualty`] = this.injuryValue(12);
    return table;
  }
}

class CasualtyRoll extends Roll {
  static rollName = "Casualty";
  // TODO: Handle skills
  // TODO: Selecting the Apo result seems to read as a separate roll

  static dice(boardactionresult) {
    // Casualty dice are also doubled up, and also both rolls appear when an apoc is used (so the last one is the valid one)
    var dice = super.dice(boardactionresult);
    dice = dice.slice(0, dice.length / 2);
    return [dice[dice.length - 1]];
  }
  static casValue(dice) {
    if (dice < 4) {
      return 0; // Badly Hurt
    } else if (dice < 50) {
      return -0.5; // MNG
    } else if (dice < 60) {
      return -0.75; // Stat Damage
    } else {
      return -1; // Dead
    }
  }
  value(dice) {
    return this.constructor.casValue(dice);
  }
  get expectedValue() {
    var expected = 0;
    for (var type = 1; type <= 6; type++) {
      for (var subtype = 1; subtype <= 8; subtype++) {
        expected += this.value(type * 10 + subtype);
      }
    }
    return expected / 48;
  }
  simulateDice() {
    return sample([1, 2, 3, 4, 5, 6]) * 10 + sample([1, 2, 3, 4, 5, 6, 7, 8]);
  }
  static valueTable() {
    var table = {};
    table[`${this.rollName} - Badly Hurt`] = this.casValue(35);
    table[`${this.rollName} - Miss Next game`] = this.casValue(45);
    table[`${this.rollName} - Stat Damage`] = this.casValue(55);
    table[`${this.rollName} - Dead`] = this.casValue(65);
    return table;
  }
}

export const ROLL_TYPES = {
  1: GFIRoll,
  2: DodgeRoll,
  3: ArmorRoll,
  4: InjuryRoll,
  5: BlockRoll,
  //6: StandUpRoll,
  7: PickupRoll,
  8: CasualtyRoll,
  9: CatchRoll,
  10: null, // Kickoff Scatter
  11: null, // Throw-in Roll
  12: PassRoll,
  13: null, // Push
  14: null, // Follow up
  16: InterceptionRoll,
  17: WakeUpRoll,
  //20: BoneHeadRoll,
  //21: ReallyStupidRoll,
  22: WildAnimalRoll,
  //23: LonerRoll,
  //24: LandingRoll,
  26: null, // Inaccurate Pass Scatter
  //27: AlwaysHungryRoll,
  29: DauntlessRoll,
  31: JumpUpRoll,
  // 34: StabRoll,
  // 36: LeapRoll,
  // 37: FoulAppearanceRoll,
  // 40: TakeRootRoll,
  // 42: HailMaryPassRoll,
  // 45: ProRoll,
  // 46: HypnoticGazeRoll,
  // 54: FireballRoll,
  // 55: LightningBoltRoll,
  // 56: ThrowTeammateRoll,
  58: null, // Kickoff Gust
  59: ArmorRoll,
  60: InjuryRoll,
  63: null, // Carrier KD scatter
  // 69: FansRoll,
  70: null, // Weather
};

// TODO: Parse Kickoff events
