import {
  ATTACKER_DOWN,
  PUSH,
  BOTH_DOWN,
  DEFENDER_STUMBLES,
  DEFENDER_DOWN,
  dice,
  BLOCK,
} from "./dice.js";
import { SKILL_NAME, SKILL, SITUATION } from "./constants.js";
import { quantile } from "./utils.js";

// TODO: Switch over to using dice.js for better clarity

function ensureList(objOrList) {
  if (objOrList && objOrList.length) {
    return objOrList;
  } else if (objOrList) {
    return [objOrList];
  } else {
    return [];
  }
}

function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function decayedHalfTurns(halfTurns) {
  var decayedTurns = 0;
  for (var turn = 0; turn < halfTurns; turn++) {
    decayedTurns += 0.8 ** turn;
  }
  return decayedTurns;
}

class Player {
  team;
  playerState;

  constructor(team, playerState) {
    this.team = team;
    this.playerState = playerState;
    this.id = this.playerState.Data.Id;
    this.name = this.playerState.Data.Name;
    this.cell = this.playerState.Cell;
    this.situation = this.playerState.Situation;
    this.canAct =
      this.playerState.CanAct == 1 && this.situation === SITUATION.Active;
  }

  get skills() {
    Object.defineProperty(this, 'skills', {value: Roll.translateStringNumberList(
      this.playerState.Data.ListSkills
    ) || []});
    return this.skills;
  }

  get skillNames() {
    return this.skills.map((skill) => SKILL_NAME[skill]);
  }
}

class Team {
  teamState;
  constructor(teamState) {
    this.teamState = teamState;
    this.players = this.teamState.ListPitchPlayers.PlayerState.map(
      (playerState) => new Player(this, playerState)
    );
    this.name = this.teamState.Data.Name;
    this.id = this.teamState.Data.TeamId || 0;
    this.turn = this.teamState.GameTurn || 0;
  }

  get shortName() {
    return this.name.split(/\s+/).map(word => word[0]).join('');
  }
}

export class Roll {
  static handledSkills = [];

  constructor(attrs) {
    Object.assign(this, attrs);

    this.teams = this.replayStep.BoardState.ListTeams.TeamState.map(
      (teamState) => new Team(teamState)
    );
    this.activeTeam =
      this.teams.filter(
        (team) => team.id == this.replayStep.BoardState.ActiveTeam
      )[0] || this.teams[0];
    this.turn = (this.activeTeam && this.activeTeam.turn) || 0;
    this.activePlayer = this.playerById(this.action.PlayerId);
    this.rollType = this.boardActionResult.RollType;
    this.dice = this.constructor.dice(this.boardActionResult);

    var unhandledSkills = this.skillsInEffect.filter(
      (skillInfo) => !this.constructor.handledSkills.includes(skillInfo.SkillId)
    );
    if (unhandledSkills.length > 0) {
      console.warn("Unhandled skills for roll", {
        roll: this,
        skills: unhandledSkills.map(
          (skillinfo) => SKILL_NAME[skillinfo.SkillId]
        ),
        rollName: this.rollName,
      });
    }

    this.onPitchValues = {};
  }

  get rollName() {
    return this.constructor.name
      .replace("Roll", "")
      .replace(/([a-z])([A-Z])/, "$1 $2");
  }

  get description() {
    var activeSkills =
      this.activePlayer.skills.length > 0
        ? ` (${this.activePlayer.skillNames.join(", ")})`
        : "";
    return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name}${activeSkills}  - ${this.dice}`;
  }

  value(dice) {
    throw "value must be defined by subclass";
  }
  get expectedValue() {
    return (
      this.possibleOutcomes
        .map((outcome) => outcome.value * (outcome.count || 1))
        .reduce((a, b) => a + b, 0) /
      this.possibleOutcomes
        .map((outcome) => outcome.count || 1)
        .reduce((a, b) => a + b, 0)
    );
  }
  get possibleOutcomes() {
    throw `possibleOutcomes must be defined by subclass ${this.constructor.name}`;
  }
  simulateDice() {
    throw "simulateDice must be defined by subclass";
  }

  get ignore() {
    if (this.boardActionResult.CoachChoices.ListDices === undefined) {
      return true;
    }

    const dataPoint = this.actual;
    if (!isFinite(dataPoint.outcomeValue)) {
      console.warn("Dice roll with non-finite outcome value", {
        roll: this,
        dataPoint: dataPoint,
      });
      return true;
    }
    if (!isFinite(dataPoint.expectedValue)) {
      console.warn("Dice roll with non-finite expected value", {
        roll: this,
        dataPoint: dataPoint,
      });
      return true;
    }

    return false;
  }

  static dice(boardActionResult) {
    return this.translateStringNumberList(
      boardActionResult.CoachChoices.ListDices
    );
  }

  get actual() {
    var dataPoint = this.dataPoint(-1, this.dice, "actual");
    const deltaNetValues = this.possibleOutcomes
      .flatMap((outcome) => new Array(outcome.count).fill(outcome))
      .map(
        (outcome) =>
          (this.activePlayer.team.id === this.activeTeam.id
            ? outcome.value
            : -outcome.value) - dataPoint.expectedValue
      );
    return Object.assign(dataPoint, {
      turn: this.turn,
      player: (this.activePlayer && this.activePlayer.name) || "",
      playerSkills:
        (this.activePlayer &&
          this.activePlayer.skills.map((skill) => SKILL_NAME[skill])) ||
        [],
      rollName: this.rollName,
      dice: this.dice,
      dnvMin: Math.min(...deltaNetValues),
      dnvq33: quantile(deltaNetValues, 0.33),
      dnvMed: quantile(deltaNetValues, 0.5),
      dnvq67: quantile(deltaNetValues, 0.67),
      dnvMax: Math.max(...deltaNetValues),
    });
  }
  simulated(iteration, rollIndex) {
    return this.dataPoint(
      iteration,
      this.simulateDice(),
      "simulated",
      rollIndex
    );
  }

  dataPoint(iteration, dice, type) {
    var outcomeValue =
      this.activePlayer.team.id === this.activeTeam.id
        ? this.value(dice)
        : -this.value(dice);
    var expectedValue =
      this.activePlayer.team.id === this.activeTeam.id
        ? this.expectedValue
        : -this.expectedValue;
    return {
      iteration: iteration,
      turn: this.turn,
      stepIndex: this.stepIndex,
      actionIndex: this.actionIndex,
      resultIndex: this.resultIndex,
      activeTeamId: this.activeTeam.id,
      activeTeamName: this.activeTeam.name,
      teamId: this.activePlayer
        ? this.activePlayer.team.id
        : this.activeTeam.id,
      teamName: this.activePlayer
        ? this.activePlayer.team.name
        : this.activeTeam.name,
      outcomeValue,
      type,
      expectedValue,
      netValue: outcomeValue - expectedValue,
      description: this.description,
      valueDescription: `${outcomeValue.toFixed(
        2
      )} (expected: ${expectedValue.toFixed(2)})`,
      rollIndex: this.rollIndex,
    };
  }

  playerById(playerId) {
    for (var team of this.teams) {
      for (var player of team.players) {
        if (player.id === playerId) {
          return player;
        }
      }
    }
  }

  playerAtPosition(cell) {
    for (var team of this.teams) {
      for (var player of team.players) {
        if (player.cell.x === cell.x && player.cell.y === cell.y) {
          return player;
        }
      }
    }
    console.log("No player found", {
      replayStep: this.replayStep,
      action: this.action,
      cell,
    });
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

  static fromReplayStep(stepIndex, replayStep) {
    var actions = ensureList(replayStep.RulesEventBoardAction);
    var rolls = [];
    for (var actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      var action = actions[actionIndex];
      rolls = rolls.concat(
        Roll.fromAction(stepIndex, replayStep, actionIndex, action)
      );
    }
    return rolls;
  }

  static fromAction(stepIndex, replayStep, actionIndex, action) {
    var results = ensureList(action.Results.BoardActionResult);
    var rolls = [];
    for (var resultIndex = 0; resultIndex < results.length; resultIndex++) {
      var result = results[resultIndex];
      var roll = this.fromBoardActionResult(
        stepIndex,
        replayStep,
        actionIndex,
        action,
        resultIndex,
        result
      );
      if (roll) {
        rolls.push(roll);
      }
    }
    if (results.length == 0) {
      console.warn("Unexpectedly missing boardactionresult", {
        stepIndex,
        replayStep,
        action,
      });
    }
    return rolls;
  }
  static fromBoardActionResult(
    stepIndex,
    replayStep,
    actionIndex,
    action,
    resultIndex,
    boardActionResult
  ) {
    if (boardActionResult.RollType === undefined) {
      return null;
    }
    var rollClass = ROLL_TYPES[boardActionResult.RollType];
    if (rollClass === null) {
      return null;
    }

    if (rollClass) {
      return new rollClass({
        stepIndex,
        replayStep,
        actionIndex,
        action,
        resultIndex,
        boardActionResult,
      });
    } else {
      console.warn("Unknown roll " + boardActionResult.RollType, {
        stepIndex,
        replayStep,
        actionIndex,
        action,
        resultIndex,
        boardActionResult,
      });
      return null;
    }
  }

  get skillsInEffect() {
    Object.defineProperty(this, "skillsInEffect", {
      value: ensureList(
        this.boardActionResult.CoachChoices.ListSkills.SkillInfo
      ),
    });
    return this.skillsInEffect;
  }

  onActiveTeam(player) {
    return player.team.id === this.activeTeam.id;
  }

  playerValue(player) {
    var ballCell = this.replayStep.BoardState.Ball.Cell;
    if (ballCell.x < 0 || ballCell.y < 0) {
      return this.rawPlayerValue(player);
    }
    var distanceToBall = Math.max(
      Math.abs(ballCell.x - player.cell.x),
      Math.abs(ballCell.y - player.cell.y)
    );
    if (distanceToBall == 0) {
      return 2 * this.rawPlayerValue(player);
    } else if (distanceToBall == 1) {
      return 1.5 * this.rawPlayerValue(player);
    } else {
      return this.rawPlayerValue(player);
    }
  }

  rawPlayerValue(player) {
    return 1;
  }

  teamValue(team, situations) {
    return team.players
      .filter((player) => situations.includes(player.situation))
      .map((player) => this.rawPlayerValue(player))
      .reduce((a, b) => a + b, 0);
  }

  get halfTurnsLeft() {
    // Return the number of half-turns left in the game
    var halfTurns = this.teams.map((team) => {
      if (team.turn <= 16) {
        return 16 - team.turn;
      } else {
        return 24 - team.turn;
      }
    });
    return halfTurns[0] + halfTurns[1];
  }

  onPitchValue(player) {
    // The fraction of the teams on-pitch players that this player represents.
    return (
      this.onPitchValues[player.id] ||
      (this.onPitchValues[player.id] =
        this.playerValue(player) /
        this.teamValue(player.team, [SITUATION.Active]))
    );
  }

  knockdownValue(player) {
    // Return the number of half-turns the player is unavailable times the
    // fraction of current team value it represents
    var playerValue = this.onPitchValue(player);
    if (this.onActiveTeam(player)) {
      return playerValue * decayedHalfTurns(Math.min(2, this.halfTurnsLeft));
    } else {
      return playerValue;
    }
  }

  stunValue(player) {
    // Return the number of half-turns the player is unavailable times the
    // fraction of current team value it represents
    var playerValue = this.onPitchValue(player);
    if (this.onActiveTeam(player)) {
      return playerValue * decayedHalfTurns(Math.min(3, this.halfTurnsLeft));
    } else {
      return playerValue * decayedHalfTurns(Math.min(4, this.halfTurnsLeft));
    }
  }

  koValue(player) {
    return (
      this.onPitchValue(player) * decayedHalfTurns(this.halfTurnsLeft) -
      this.stunValue(player)
    );
  }

  casValue(player) {
    return (
      this.onPitchValue(player) * this.halfTurnsLeft - this.stunValue(player)
    );
  }

  get unactivatedPlayers() {
    Object.defineProperty(this, "unactivatedPlayers", {
      value: this.activeTeam.players.filter((player) => player.canAct),
    });
    return this.unactivatedPlayers;
  }

  get turnoverValue() {
    var value = this.unactivatedPlayers
      .filter((player) => player != this.activePlayer)
      .map((player) => this.onPitchValue(player))
      .reduce((a, b) => a + b, 0);
    Object.defineProperty(this, "turnoverValue", { value: value });
    return this.turnoverValue;
  }
}

class BlockRoll extends Roll {
  static handledSkills = [
    SKILL.Tackle,
    SKILL.Dodge,
    SKILL.Block,
    SKILL.Guard,
    SKILL.Horns,
    SKILL.StandFirm,
  ];

  constructor(attrs) {
    super(attrs);
    this.isRedDice = this.boardActionResult.Requirement < 0;
  }

  static dice(boardActionResult) {
    var dice = super.dice(boardActionResult);
    // Block dice are doubled up, only use the first half of the dice list.
    return dice.slice(0, dice.length / 2).map(BlockRoll.asBlockDie);
  }

  get description() {
    var uphill = this.isRedDice ? ' uphill' : '';
    var attackerSkills = this.attacker.skills.length > 0 ? ` (${this.attacker.skillNames.join(', ')})` : '';
    var defenderSkills = this.defender.skills.length > 0 ? ` (${this.defender.skillNames.join(', ')})` : '';
    return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name}${attackerSkills} against ${this.defender.name}${defenderSkills} - ${this.dice.join('/')}${uphill}`;
  }

  get ignore() {
    // Block dice have dice repeated for the coaches selection, resulttype is missing for the second one
    if (this.boardActionResult.ResultType != 2) {
      return true;
    }
    if (this.boardActionResult.SubResultType == 35) {
      // Opponent picking whether to activate fend
      return true;
    }
    if (this.boardActionResult.SubResultType == 57) {
      // Not sure what this is, but it doesn't have the expected number of dice.
      return true;
    }

    return super.ignore;
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

  dieValue(result, attacker, defender) {
    var attackerSkills = (attacker && attacker.skills) || [];
    var defenderSkills = (defender && defender.skills) || [];

    switch (result) {
      case ATTACKER_DOWN:
        return -this.knockdownValue(attacker) - this.turnoverValue;
      case BOTH_DOWN:
        if (attackerSkills.includes(SKILL.Block)) {
          if (defenderSkills.includes(SKILL.Block)) {
            return 0;
          } else {
            return this.knockdownValue(defender);
          }
        } else if (attackerSkills.includes(SKILL.Wrestle)) {
          return this.knockdownValue(defender) - this.knockdownValue(attacker);
        } else {
          return (
            this.knockdownValue(defender) -
            this.knockdownValue(attacker) -
            this.turnoverValue
          );
        }
      case PUSH:
        return defenderSkills.includes(SKILL.StandFirm)
          ? 0
          : this.knockdownValue(defender) * 0.25;
      case DEFENDER_STUMBLES:
        if (
          defenderSkills.includes(SKILL.Dodge) &&
          !attackerSkills.includes(SKILL.Tackle)
        ) {
          return defenderSkills.includes(SKILL.StandFirm)
            ? 0
            : this.knockdownValue(defender) * 0.25;
        } else {
          return this.knockdownValue(defender);
        }
      case DEFENDER_DOWN:
        return this.knockdownValue(defender);
    }
  }

  get attacker() {
    return this.activePlayer;
  }

  get defender() {
    Object.defineProperty(this, "defender", {
      value: this.playerAtPosition(this.action.Order.CellTo.Cell),
    });
    return this.defender;
  }

  value(dice) {
    var possibilities = dice.map((die) =>
      this.dieValue(die, this.attacker, this.defender)
    );
    if (this.isRedDice) {
      return Math.min(...possibilities);
    } else {
      return Math.max(...possibilities);
    }
  }
  get possibleOutcomes() {
    var values;
    if (this.dice.length == 1) {
      values = BLOCK.values.map((dice) => ({name: dice.toString(), value: this.value([dice])}));
    } else {
      console.log(dice(new Array(this.dice.length).fill(BLOCK)));
      values = dice(new Array(this.dice.length).fill(BLOCK)).values.map(
        (dice) => ({
          name: dice.join("/"),
          value: this.value(dice),
        })
      );
    }
    Object.defineProperty(this, "possibleOutcomes", { value: values });
    return this.possibleOutcomes;
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
}

class FansRoll extends Roll {
  // TODO: Need to capture both teams rolls, because result is about comparison.
}

class ModifiedD6SumRoll extends Roll {
  constructor(args) {
    super(args);
    this.modifier =
      ensureList(this.boardActionResult.ListModifiers.DiceModifier || [])
        .map((modifier) => modifier.value)
        .reduce((a, b) => a + b, 0) || 0;
    this.target = this.boardActionResult.Requirement;
  }

  get description() {
    var activeSkills = this.activePlayer.skills.length > 0 ? ` (${this.activePlayer.skillNames})` : '';
    return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name}${activeSkills} - ${this.dice} (${this.modifiedTarget})`;
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
      return this.passValue();
    } else {
      return this.failValue();
    }
  }
  get possibleOutcomes() {
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

    var passingSums = [];
    var failingSums = [];
    for (const sum of diceSums) {
      if (sum >= this.modifiedTarget) {
        passingSums.unshift(sum);
      } else {
        failingSums.unshift(sum);
      }
    }
    return [
      {
        name: `${Math.min(...passingSums)} - ${Math.max(...passingSums)}`,
        value: this.passValue(),
        count: passingSums.length,
      },
      {
        name: `${Math.min(...failingSums)} - ${Math.max(...failingSums)}`,
        value: this.failValue(),
        count: failingSums.length,
      },
    ];
  }
  simulateDice() {
    return this.dice.map(() => sample([1, 2, 3, 4, 5, 6]));
  }
  passValue() {
    return 0;
  }
  failValue() {
    return 0;
  }
}

class PickupRoll extends ModifiedD6SumRoll {
  failValue() {
    return -this.turnoverValue;
  }
}

class BoneHeadRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.BoneHead];
  failValue() {
    return -this.knockdownValue(this.activePlayer);
  }
}

class ReallyStupidRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.ReallyStupid];
  failValue() {
    return -this.knockdownValue(this.activePlayer);
  }
}

class ArmorRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.MightyBlow, SKILL.Claw];

  constructor(args) {
    super(args);

    // An Armor PileOn has a IsOrderCompleted RollType 60 right before it
    if (this.resultIndex == 0) {
      this.isPileOn = false;
    } else {
      var previousResult = this.action.Results.BoardActionResult[
        this.resultIndex - 1
      ];
      this.isPileOn = previousResult.RollType == 59;
      if (this.isPileOn) {
        var previousSkills = previousResult.CoachChoices.ListSkills.SkillInfo;
        if (previousSkills && !previousSkills.length) {
          previousSkills = [previousSkills];
        }
        this.pilingOnPlayer = this.playerById(
          previousSkills.filter((skill) => skill.SkillId == SKILL.PilingOn)[0]
            .PlayerId
        );
      }
    }
  }

  passValue() {
    // passValue is negative because "Passing" an armor roll means rolling higher than
    // armor, which is a bad thing.
    var injuredPlayerValue = -this.stunValue(this.activePlayer); // Player is at least stunned = out for 2 turns
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      return injuredPlayerValue + this.knockdownValue(this.pilingOnPlayer);
    } else {
      return injuredPlayerValue;
    }
  }

  failValue() {
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      return this.knockdownValue(this.pilingOnPlayer);
    } else {
      return 0;
    }
  }

  value(dice) {
    return super.value(dice);
  }
}

class WildAnimalRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.WildAnimal];
  failValue() {
    // Failing Wild Animal means that this player is effectively unavailable
    // for the rest of your turn, but is active on your opponents turn
    return -this.onPitchValue(this.activePlayer);
  }
}

class DauntlessRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.Dauntless];
}

class DodgeRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.BreakTackle, SKILL.Stunty];
  failValue() {
    return -this.knockdownValue(this.activePlayer) - this.turnoverValue;
  }
}

class JumpUpRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.JumpUp];
  failValue() {
    // Jump Up failure means the block fails to activate, so the player is no longer
    // available for this turn.
    return -this.onPitchValue(this.activePlayer);
  }
}

class LeapRoll extends ModifiedD6SumRoll {
  failValue() {
    return -this.knockdownValue(this.activePlayer) - this.turnoverValue;
  }
}

class PassRoll extends ModifiedD6SumRoll {
  failValue() {
    // TODO: Failed pass doesn't turn over, it causes the ball to scatter. If it scatters to another
    // player, then it's not a turnover.
    // TODO: Account for fumbles.
    return -this.turnoverValue;
  }
}

class ThrowTeammateRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.ThrowTeamMate];
  failValue() {
    // TODO: Throw teammate only turns over if the thrown player has the ball, and even then, only
    // TODO: Failed pass doesn't turn over, it causes the ball to scatter. If it scatters to another
    // player, then it's not a turnover.
    // TODO: Account for fumbles.
    return 0;
  }
}

class InterceptionRoll extends ModifiedD6SumRoll {
  // Interception rolls on the thrower, not the interceptee. If it "passes",
  // then the ball is caught
  passValue() {
    return -this.turnoverValue;
  }
}

class WakeUpRoll extends ModifiedD6SumRoll {
  constructor(attrs) {
    super(attrs);
    this.activeTeam = this.activePlayer.team;
  }
  passValue() {
    return this.koValue(this.activePlayer);
  }
}

class GFIRoll extends ModifiedD6SumRoll {
  failValue() {
    return -this.knockdownValue(this.activePlayer) - this.turnoverValue;
  }
}

class CatchRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.DisturbingPresence];

  failValue() {
    return -this.turnoverValue;
  }
}

class StandUpRoll extends ModifiedD6SumRoll {
  passValue() {
    return this.knockdownValue(this.activePlayer);
  }
}

class TakeRootRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.TakeRoot];
  failValue() {
    return -this.knockdownValue(this.activePlayer);
  }
}

class LandingRoll extends ModifiedD6SumRoll {
  failValue() {
    // TODO: Handle a turnover if the thrown player has the ball
    return -this.knockdownValue(this.activePlayer);
  }
}

class InjuryRoll extends Roll {
  static handledSkills = [SKILL.MightyBlow, SKILL.DirtyPlayer, SKILL.Stunty];

  constructor(args) {
    super(args);

    // An Injury PileOn has a IsOrderCompleted RollType 60 right before it
    if (this.resultIndex == 0) {
      this.isPileOn = false;
    } else {
      var previousResult = this.action.Results.BoardActionResult[
        this.resultIndex - 1
      ];
      this.isPileOn = previousResult.RollType == 60;
      if (this.isPileOn) {
        var previousSkills = ensureList(
          previousResult.CoachChoices.ListSkills.SkillInfo
        );
        this.pilingOnPlayer = this.playerById(
          previousSkills.filter((skill) => skill.SkillId == SKILL.PilingOn)[0]
            .PlayerId
        );
      }
    }

    this.modifier =
      ensureList(this.boardActionResult.ListModifiers.DiceModifier || [])
        .map((modifier) => modifier.value)
        .reduce((a, b) => a + b, 0) || 0;
  }

  // TODO: Handle skills
  injuryValue(total) {
    if (this.activePlayer.skills.includes(SKILL.Stunty)) {
      total += 1;
    }
    if (total <= 7) {
      return 0; // Only stunned, no additional cost relative to armor break failure
    } else if (total <= 9) {
      return -this.koValue(this.activePlayer);
    } else {
      return -this.casValue(this.activePlayer);
    }
  }

  value(dice) {
    var total = dice[0] + dice[1] + this.modifier;
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      return this.injuryValue(total) + this.onPitchValue(this.pilingOnPlayer);
    } else {
      return this.injuryValue(total);
    }
  }
  get possibleOutcomes() {
    var outcomes = [];
    for (var first = 1; first <= 6; first++) {
      for (var second = 1; second <= 6; second++) {
        outcomes.unshift({
          name: (first  +  second).toString(),
          value: this.value([first, second]),
        });
      }
    }
    Object.defineProperty(this, "possibleOutcomes", { value: outcomes });
    return this.possibleOutcomes;
  }
  simulateDice() {
    return this.dice.map(() => sample([1, 2, 3, 4, 5, 6]));
  }
}

class CasualtyRoll extends Roll {
  // TODO: Handle skills
  // TODO: Selecting the Apo result seems to read as a separate roll

  static dice(BoardActionResult) {
    // Casualty dice are also doubled up, and also both rolls appear when an apoc is used (so the last one is the valid one)
    var dice = super.dice(BoardActionResult);
    dice = dice.slice(0, dice.length / 2);
    return [dice[dice.length - 1]];
  }
  value(dice) {
    return 0; // Need to figure out how to grade losing player value for multiple matches
    if (dice < 40) {
      return 0; // Badly Hurt
    } else if (dice < 50) {
      return -0.5; // MNG
    } else if (dice < 60) {
      return -0.75; // Stat Damage
    } else {
      return -1; // Dead
    }
  }
  get possibleOutcomes() {
    var outcomes = [];
    for (var type = 1; type <= 6; type++) {
      for (var subtype = 1; subtype <= 8; subtype++) {
        outcomes.unshift({name: `${type}${subtype}`, value: this.value(type * 10 + subtype)});
      }
    }
    Object.defineProperty(this, 'possibleOutcomes', {value: outcomes});
    return this.possibleOutcomes;
  }
  simulateDice() {
    return sample([1, 2, 3, 4, 5, 6]) * 10 + sample([1, 2, 3, 4, 5, 6, 7, 8]);
  }
  get ignore() {
    // Just guessing at this
    if (
      this.boardActionResult.ResultType != 2 &&
      this.boardActionResult.SubResultType != 1 &&
      // Replay Coach-551-9619f4910217db1915282ea2242c819f_2016-04-07_00_05_06, Furry Bears turn 8 crowdsurf injury, shouldn't be ignored
      this.boardActionResult.SubResultType != 12
    ) {
      console.warn("Ignoring casualty roll, should verify", { roll: this });
      return true;
    }
    return super.ignore;
  }
}

class NoValueRoll extends Roll {
  get ignore() {
    return true;
  }
  value() {
    return null;
  }
  get expectedValue() {
    return null;
  }
  simulateDice() {
    return null;
  }
  get actual() {
    return null;
  }
  simulated() {
    return null;
  }
}

class PushRoll extends NoValueRoll {
  static handledSkills = [SKILL.SideStep];
}

class FollowUpRoll extends NoValueRoll {}

class FoulPenaltyRoll extends NoValueRoll {}

export const ROLL_TYPES = {
  1: GFIRoll,
  2: DodgeRoll,
  3: ArmorRoll,
  4: InjuryRoll,
  5: BlockRoll,
  6: StandUpRoll,
  7: PickupRoll,
  8: CasualtyRoll,
  9: CatchRoll,
  10: null, // Kickoff Scatter
  11: null, // Throw-in Roll
  12: PassRoll,
  13: PushRoll,
  14: FollowUpRoll,
  15: FoulPenaltyRoll,
  16: InterceptionRoll,
  17: WakeUpRoll,
  20: BoneHeadRoll,
  21: ReallyStupidRoll,
  22: WildAnimalRoll,
  //23: LonerRoll,
  24: LandingRoll,
  26: null, // Inaccurate Pass Scatter
  //27: AlwaysHungryRoll,
  29: DauntlessRoll,
  31: JumpUpRoll,
  // 34: StabRoll,
  36: LeapRoll,
  // 37: FoulAppearanceRoll,
  40: TakeRootRoll,
  // 42: HailMaryPassRoll,
  // 45: ProRoll,
  // 46: HypnoticGazeRoll,
  // 54: FireballRoll,
  // 55: LightningBoltRoll,
  56: ThrowTeammateRoll,
  58: null, // Kickoff Gust
  59: ArmorRoll, // Armor Roll with Pile On. If followed by a RollType 59 w/ IsOrderCompleted, then PO happened. Otherwise, no PO
  60: InjuryRoll, // Injury Roll with Pile On. If followed by a RollType 60 w/ IsOrderCompleted, then PO happened, otherwise, no PO?
  61: null, // Some sort of wrestle roll that doesn't do anything
  63: null, // Carrier KD scatter
  // 69: FansRoll,
  70: null, // Weather
};

// TODO: Parse Kickoff events
