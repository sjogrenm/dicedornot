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

class Roll {
  constructor({
    stepIndex,
    actionIndex,
    resultIndex,
    team,
    turn,
    playerName,
    playerTeam,
    rollType,
    dice
  }) {
    this.stepIndex = stepIndex;
    this.actionIndex = actionIndex;
    this.resultIndex = resultIndex;
    this.activeTeam = team;
    this.turn = turn;
    this.playerName = playerName;
    this.playerTeam = playerTeam;
    this.rollType = rollType;
    this.dice = dice;
  }
  static constructFromXML(
    stepIndex,
    replaystep,
    actionIndex,
    action,
    resultIndex,
    boardactionresult
  ) {
    if (this.ignore(replaystep, action, boardactionresult)) {
      return null;
    } else {
      return new this({
        stepIndex,
        actionIndex,
        resultIndex,
        team: this.activeTeamName(replaystep),
        turn: this.currentTurn(replaystep),
        playerName: this.currentPlayerName(replaystep, action),
        playerTeam: this.currentPlayerTeam(replaystep, action),
        rollType: this.rollType(boardactionresult),
        dice: this.dice(boardactionresult)
      });
    }
  }
  value(dice) {
    throw "Must be defined by subclass";
  }
  get expectedValue() {
    throw "Must be defined by subclass";
  }
  simulateDice() {
    throw "Must be defined by subclass";
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
    return this.dataPoint(0, this.dice, "actual");
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
      team: this.playerTeam || this.activeTeam,
      turn: this.turn,
      player: this.playerName,
      playerTeam: this.playerTeam,
      rollName: this.rollName || this.rollType,
      outcomeValue: this.value(dice),
      expectedValue: this.expectedValue,
      type: type,
      dice: dice
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
  static currentPlayerName(replaystep, action) {
    var currentId = this.currentPlayer(action);
    for (var team of replaystep.boardstate.listteams.teamstate) {
      for (var player of team.listpitchplayers.playerstate) {
        if (player.id === currentId) {
          return player.data.name;
        }
      }
    }
    console.log("No player found", { replaystep, action });
  }
  static currentPlayerTeam(replaystep, action) {
    var currentId = Roll.currentPlayer(action);
    for (var team of replaystep.boardstate.listteams.teamstate) {
      for (var player of team.listpitchplayers.playerstate) {
        if (player.id === currentId) {
          return team.data.name;
        }
      }
    }
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
      console.warning("Unexpectedly missing boardactionresult", {
        stepIndex,
        replaystep,
        action
      });
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
      return rollClass.constructFromXML(
        stepIndex,
        replaystep,
        actionIndex,
        action,
        resultIndex,
        boardactionresult
      );
    } else {
      console.warn("Unknown roll " + boardactionresult.rolltype, {
        stepIndex,
        replaystep,
        actionIndex,
        action,
        resultIndex,
        boardactionresult
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
    return boardactionresult.resulttype != 2;
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

  static dieValue(result) {
    switch (result) {
      case ATTACKER_DOWN:
        return -1;
      case BOTH_DOWN:
        return -0.75;
      case PUSH:
        return 0.25;
      case DEFENDER_STUMBLES:
        return 0.75;
      case DEFENDER_DOWN:
        return 1;
    }
  }
  value(dice) {
    // TODO: Handle values based on skills
    // TODO: Red Dice?
    return Math.max(...dice.map(BlockRoll.dieValue));
  }
  get expectedValue() {
    if (this.dice.length == 1) {
      values = BLOCK.values.map(BlockRoll.dieValue);
    } else {
      values = TWO_DIE_BLOCK.values.map(dice =>
        Math.max(BlockRoll.dieValue(dice[0]), BlockRoll.dieValue(dice[1]))
      );
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
        DEFENDER_DOWN
      ])
    );
  }
}

class FansRoll extends Roll {
  static constructFromXML(
    stepIndex,
    replaystep,
    actionIndex,
    action,
    resultIndex,
    boardactionresult
  ) {
    // TODO: Need to capture both teams rolls, because result is about comparison.
    teamId =
      boardactionresult.coachchoices.concernedteam ||
      Roll.activeTeamId(replaystep);
    return new this({
      stepIndex,
      actionIndex,
      resultIndex,
      team: Roll.teamName(replaystep, teamId),
      turn: Roll.currentTurn(replaystep),
      playerName: this.currentPlayerName(replaystep, action),
      playerTeam: this.currentPlayerTeam(replaystep, action),
      rollType: Roll.rollType(boardactionresult),
      dice: Roll.dice(boardactionresult)
    });
  }
}

class ModifiedD6SumRoll extends Roll {
  constructor({ target, modifier, ...rest }) {
    super(rest);
    this.target = target;
    this.modifier = modifier;
  }
  static constructFromXML(
    stepIndex,
    replaystep,
    actionIndex,
    action,
    resultIndex,
    boardactionresult
  ) {
    return new this({
      stepIndex,
      actionIndex,
      resultIndex,
      team: this.activeTeamName(replaystep),
      turn: this.currentTurn(replaystep),
      playerName: this.currentPlayerName(replaystep, action),
      playerTeam: this.currentPlayerTeam(replaystep, action),
      rollType: this.rollType(boardactionresult),
      dice: this.dice(boardactionresult),
      modifier:
        ensureList(boardactionresult.listmodifiers.dicemodifier || [])
          .map(modifier => modifier.value)
          .reduce((a, b) => a + b, 0) || 0,
      target: boardactionresult.requirement
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
      return this.passValue;
    } else {
      return this.failValue;
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
        expected += this.passValue / numPossible;
      } else {
        expected += this.failValue / numPossible;
      }
    }
    return expected;
  }
  simulateDice() {
    return this.dice.map(() => sample([1, 2, 3, 4, 5, 6]));
  }
}

class PickupRoll extends ModifiedD6SumRoll {
  static rollName = "Pickup";
  static passValue = 1;
  static failValue = -1;
}
class ArmorRoll extends ModifiedD6SumRoll {
  static rollName = "Armor";
  // Cases: Defender down, GFI fail, Attacker Down, Leap fail
  static passValue = -1;
  static failValue = 0;
}

class WildAnimalRoll extends ModifiedD6SumRoll {
  static rollName = "Wild Animal";
  static passValue = 0;
  static failValue = -1;
}

class DauntlessRoll extends ModifiedD6SumRoll {
  static rollName = "Dauntless";
  static passValue = 1;
  static failValue = -1;
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
  injuryValue(total) {
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
    return this.injuryValue(total);
  }
  get expectedValue() {
    var expected = 0;
    for (var first = 1; first <= 6; first++) {
      for (var second = 1; second <= 6; second++) {
        expected += this.injuryValue(first + second);
      }
    }
    return expected / 36;
  }
  simulateDice() {
    return this.dice.map(() => sample([1, 2, 3, 4, 5, 6]));
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
  value(dice) {
    if (dice <= 30) {
      return 0; // Badly Hurt
    } else if (dice == 40) {
      return -0.5; // MNG
    } else if (dice == 50) {
      return -0.75; // Stat Damage
    } else {
      return -1; // Dead
    }
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
}

const ROLL_TYPES = {
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
  70: null // Weather
};

// TODO: Parse Kickoff events
