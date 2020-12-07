import {
  ATTACKER_DOWN,
  PUSH,
  BOTH_DOWN,
  DEFENDER_STUMBLES,
  DEFENDER_DOWN,
  dice,
  BLOCK
} from './dice.js';
import {
  SKILL_NAME,
  SKILL,
  SITUATION,
  ROLL_STATUS,
  RESULT_TYPE,
  SUB_RESULT_TYPE
} from './constants.js';
import {
  SingleValue,
  SimpleDistribution,
  SumDistribution,
  MinDistribution,
  MaxDistribution,
  Distribution
} from './distribution.js';
import { weightedQuantile } from './utils.js';

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
    decayedTurns += 0.9 ** turn;
  }
  return new SingleValue("Time-discounted half turns", decayedTurns);
}

class Details {
  summary;
  detailDescription;
  details;

  constructor({ summary, detailDescription, details }) {
    this.summary = summary;
    this.detailDescription = detailDescription;
    this.details = details;
  }
}

class Player {
  team;
  playerState;

  constructor(team, playerState) {
    this.team = team;
    this.id = playerState.Data.Id;
    this.name = playerState.Data.Name;
    this.cell = playerState.Cell;
    this.situation = playerState.Situation;
    this.playerState = playerState;
    this.canAct =
      playerState.CanAct == 1 && this.situation === SITUATION.Active;
    this.skills =
      Roll.translateStringNumberList(playerState.Data.ListSkills) || [];
  }

  get skillNames() {
    return this.skills.map((skill) => SKILL_NAME[skill]);
  }
}

class Team {
  teamState;
  constructor(teamState) {
    this.players = teamState.ListPitchPlayers.PlayerState.map(
      (playerState) => new Player(this, playerState)
    );
    this.name = teamState.Data.Name;
    this.id = teamState.Data.TeamId || 0;
    this.turn = teamState.GameTurn || 0;
  }

  get shortName() {
    return this.name
      .split(/\s+/)
      .map((word) => word[0])
      .join('');
  }
}

class BoardState {
  teams;
  activeTeam;
  turn;

  constructor({ teams, activeTeamId, activePlayerId, ballCell }) {
    this.teams = teams;
    this.activeTeam =
      teams.filter((team) => team.id == activeTeamId)[0] || teams[0];
    this.turn = (this.activeTeam && this.activeTeam.turn) || 0;
    this.activePlayer = this.playerById(activePlayerId);
    this.ballCell = ballCell;
  }
  static argsFromXml(xml) {
    const args = {};
    args.teams = xml.replayStep.BoardState.ListTeams.TeamState.map(
      (teamState) => new Team(teamState)
    );
    args.activeTeamId = xml.replayStep.BoardState.ActiveTeam;
    args.activePlayerId = xml.action.PlayerId;
    args.ballCell = xml.replayStep.BoardState.Ball.Cell;
    return args;
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
    console.log('No player found', {
      replayStep: this.replayStep,
      action: this.action,
      cell
    });
  }
}

export class Roll {
  static handledSkills = [];

  constructor(attrs) {
    Object.assign(this, attrs);

    this.onPitchValues = {};
    this.onTeamValues = {};
    this.armorRollCache = {};
    this.dependentRolls = [];

    console.assert(
      !this.unhandledSkills || this.unhandledSkills.length == 0,
      'Unhandled skills for roll',
      {
        roll: this,
        skills:
          this.unhandledSkills &&
          this.unhandledSkills.map(
            (skillinfo) => SKILL_NAME[skillinfo.SkillId]
          ),
        rollName: this.rollName
      }
    );
  }

  static argsFromXml(xml) {
    const args = {};

    args.boardState = new BoardState(BoardState.argsFromXml(xml));
    args.rollType = xml.boardActionResult.RollType;
    args.dice = this.dice(xml.boardActionResult);
    args.skillsInEffect = ensureList(
      xml.boardActionResult.CoachChoices.ListSkills.SkillInfo
    );
    args.unhandledSkills = args.skillsInEffect.filter(
      (skillInfo) => !this.handledSkills.includes(skillInfo.SkillId)
    );
    args.ignore = this.ignore(xml);
    args.actionType = xml.action.ActionType;
    args.rollStatus = xml.boardActionResult.RollStatus;
    args.resultType = xml.boardActionResult.ResultType;
    args.subResultType = xml.boardActionResult.SubResultType;
    args.stepIndex = xml.stepIndex;
    args.resultIndex = xml.resultIndex;
    args.actionIndex = xml.actionIndex;

    return args;
  }

  static ignore(xml) {
    return false;
  }

  get activePlayer() {
    return this.boardState.activePlayer;
  }

  set activePlayer(player) {
    this.boardState.activePlayer = player;
  }

  get activeTeam() {
    return this.boardState.activeTeam;
  }

  get teams() {
    return this.boardState.teams;
  }

  get turn() {
    return this.boardState.turn;
  }

  get rollName() {
    return this.constructor.name
      .replace('Roll', '')
      .replace(/([a-z])([A-Z])/, '$1 $2');
  }

  get jointDescription() {
    return [this].concat(this.dependentRolls).map(roll => roll.description).join("\u2192");
  }

  get description() {
    var activeSkills =
      this.activePlayer.skills.length > 0
        ? ` (${this.activePlayer.skillNames.join(', ')})`
        : '';
    return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name}${activeSkills}  - ${this.dice}`;
  }

  isDependentRoll(roll) {
    return false;
  }

  value(dice, expected) {
    throw 'value must be defined by subclass';
  }
  get expectedValue() {
    return this.possibleOutcomes.expectedValue;
  }
  get possibleOutcomes() {
    throw `possibleOutcomes must be defined by subclass ${this.constructor.name}`;
  }
  simulateDice() {
    throw 'simulateDice must be defined by subclass';
  }

  static ignore(xml) {
    if (xml.boardActionResult.CoachChoices.ListDices === undefined) {
      return true;
    }

    return false;
  }

  static dice(boardActionResult) {
    return this.translateStringNumberList(
      boardActionResult.CoachChoices.ListDices
    );
  }

  get dependentRollsValue() {
    return this.dependentRolls
      .map((roll) => roll.value(roll.dice, false))
      .reduce((a, b) => a + b, 0);
  }

  get actual() {
    var dataPoint = this.dataPoint(-1, this.dice, 'actual', true);
    const deltaNetValues = this.possibleOutcomes.flat.map((outcome) => ({
      value: outcome.value - dataPoint.expectedValue,
      weight: outcome.weight
    }));
    return Object.assign(dataPoint, {
      turn: this.turn,
      player: (this.activePlayer && this.activePlayer.name) || '',
      playerSkills:
        (this.activePlayer &&
          this.activePlayer.skills.map((skill) => SKILL_NAME[skill])) ||
        [],
      rollName: this.rollName,
      dice: this.dice,
      dnvMin: Math.min(...deltaNetValues.map((outcome) => outcome.value)),
      dnvq33: weightedQuantile(deltaNetValues, 0.33, 'value', 'weight'),
      dnvMed: weightedQuantile(deltaNetValues, 0.5, 'value', 'weight'),
      dnvq67: weightedQuantile(deltaNetValues, 0.67, 'value', 'weight'),
      dnvMax: Math.max(...deltaNetValues.map((outcome) => outcome.value))
    });
  }
  simulated(iteration, rollIndex) {
    var dataPoint = this.dataPoint(
      iteration,
      this.simulateDice(),
      'simulated',
      false
    );
    dataPoint.outcomeValue += this.dependentRolls
      .map((roll) => roll.value(roll.simulateDice(), false))
      .reduce((a, b) => a + b, 0);
    return dataPoint;
  }

  dataPoint(iteration, dice, type, includeDependent) {
    var outcomeValue = this.value(dice, false);
    if (!(outcomeValue instanceof Distribution)) {
      outcomeValue = new SingleValue(this.rollName, outcomeValue);
    }
    if (includeDependent) {
      outcomeValue = outcomeValue.add(...this.dependentRolls.map(roll => roll.value(roll.dice, false)));
    }
    outcomeValue = outcomeValue.singularValue;
    const expectedValue = this.expectedValue;
    return {
      iteration: iteration,
      turn: this.turn,
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
      rollIndex: this.rollIndex
    };
  }

  static translateStringNumberList(str) {
    if (!str) return [];

    var stripped = str.substring(1, str.length - 1);
    var textList = stripped.split(',');

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
      console.warn('Unexpectedly missing boardactionresult', {
        stepIndex,
        replayStep,
        action
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
      return new rollClass(
        rollClass.argsFromXml({
          stepIndex,
          replayStep,
          actionIndex,
          action,
          resultIndex,
          boardActionResult
        })
      );
    } else {
      console.warn('Unknown roll ' + boardActionResult.RollType, {
        stepIndex,
        replayStep,
        actionIndex,
        action,
        resultIndex,
        boardActionResult
      });
      return null;
    }
  }

  onActiveTeam(player) {
    return player.team.id === this.activeTeam.id;
  }

  playerValue(player) {
    var ballCell = this.boardState.ballCell;
    if (ballCell.x < 0 || ballCell.y < 0) {
      return this.rawPlayerValue(player);
    }
    var distanceToBall = Math.max(
      Math.abs(ballCell.x - player.cell.x),
      Math.abs(ballCell.y - player.cell.y)
    );
    if (distanceToBall == 0) {
      return this.rawPlayerValue(player).product(new SingleValue("On Ball", 2));
    } else if (distanceToBall == 1) {
      return this.rawPlayerValue(player).product(new SingleValue("By Ball", 1.5));
    } else {
      return this.rawPlayerValue(player);
    }
  }

  rawPlayerValue(player) {
    return new SingleValue(player.name, 1);
  }

  teamValue(team, situations) {
    return new SumDistribution(
      team.players
      .filter((player) => situations.includes(player.situation))
        .map((player) => this.rawPlayerValue(player)),
      ''
    );
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
    return this.onPitchValues[player.id] || (
      this.onPitchValues[player.id] =
      this.playerValue(player).divide(
        this.teamValue(player.team, [SITUATION.Active]).named('Players on Pitch')
      ).named(player.name)
    );
  }

  onTeamValue(player) {
    // The fraction of the teams on-pitch players that this player represents.
    return (
      this.onTeamValues[player.id] || (
        this.onTeamValues[player.id] =
        this.playerValue(player).divide(
          this.teamValue(player.team, [SITUATION.Active, SITUATION.Reserves]).named('Players on Team')
        ).named(player.name)
      )
    );
  }

  armorRoll(player) {
    return (
      this.armorRollCache[player.id] ||
      (this.armorRollCache[player.id] = new ArmorRoll({
        boardState: {
          ...this.boardState,
          activePlayer: player
        }
      }))
    );
  }

  knockdownValue(player, includeExpectedArmor) {
    // Return the number of half-turns the player is unavailable times the
    // fraction of current team value it represents
    const playerValue = this.onPitchValue(player);
    var turnsMissing = 1;
    if (this.onActiveTeam(player)) {
      turnsMissing = Math.min(2, this.halfTurnsLeft);
    }
    turnsMissing = decayedHalfTurns(turnsMissing);
    var scalingFactors = [turnsMissing];
    if (this.onActiveTeam(player)) {
      scalingFactors.push(new SingleValue('On Active Team', -1));
    }
    var result = playerValue.product(...scalingFactors).named(`KD(${player.name})`);
    if (includeExpectedArmor) {
      result = result.add(this.armorRoll(player).possibleOutcomes);
    }
    return result;
  }

  stunValue(player) {
    // Return the number of half-turns the player is unavailable times the
    // fraction of current team value it represents
    var playerValue = this.onPitchValue(player);
    var turnsMissing;
    if (this.onActiveTeam(player)) {
      turnsMissing = decayedHalfTurns(Math.min(3, this.halfTurnsLeft));
    } else {
      turnsMissing = decayedHalfTurns(Math.min(4, this.halfTurnsLeft));
    }
    var scalingFactors = [turnsMissing];
    if (this.onActiveTeam(player)) {
      scalingFactors.push(new SingleValue('On Active Team', -1));
    }

    return playerValue.product(...scalingFactors).named(`STUN(${player.name})`);
  }

  koValue(player) {
    const playerValue =
      this.onPitchValue(player)
    var turnsMissing = decayedHalfTurns(this.halfTurnsLeft);
    if (this.onActiveTeam(player)) {
      turnsMissing = turnsMissing.add(decayedHalfTurns(Math.min(3, this.halfTurnsLeft)).product(-1));
    } else {
      turnsMissing = turnsMissing.add(decayedHalfTurns(Math.min(4, this.halfTurnsLeft)).product(-1));
    }

    var scalingFactors = [turnsMissing];
    if (this.onActiveTeam(player)) {
      scalingFactors.push(new SingleValue('On Active Team', -1));
    }

    return playerValue.product(...scalingFactors).named(`KO(${player.name})`);
  }

  casValue(player) {
    const playerValue =
      this.onTeamValue(player).product(this.halfTurnsLeft).add(
        this.onPitchValue(player).add(
          this.onTeamValue(player).product(-1)
        ).product(
          decayedHalfTurns(this.halfTurnsLeft)
        )
      );
    return (
      (this.onActiveTeam(player) ? playerValue.product(-1) : playerValue).add(
        this.stunValue(player).product(-1)
      )
    ).named(`CAS(${player.name})`);
  }

  get unactivatedPlayers() {
    Object.defineProperty(this, 'unactivatedPlayers', {
      value: this.activeTeam.players.filter((player) => player.canAct)
    });
    return this.unactivatedPlayers;
  }

  get turnoverValue() {
    const playerValues = this.unactivatedPlayers.filter((player) => player != this.activePlayer).map((player) => this.onPitchValue(player));
    var value;
    if (playerValues.length > 0) {
      value = new SumDistribution(playerValues).product(-1).named('Turnover');
    } else {
      value = new SingleValue("No Active Players", 0);
    }
    Object.defineProperty(this, 'turnoverValue', { value: value });
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
    SKILL.Wrestle,
    SKILL.TakeRoot
  ];

  static argsFromXml(xml) {
    const args = super.argsFromXml(xml);
    args.isRedDice = xml.boardActionResult.Requirement < 0;
    args.attacker = args.boardState.activePlayer;
    args.defender = args.boardState.playerAtPosition(
      xml.action.Order.CellTo.Cell
    );
    return args;
  }

  isDependentRoll(roll) {
    return [PushRoll, FollowUpRoll, ArmorRoll, InjuryRoll, CasualtyRoll].includes(
      roll.constructor
    );
  }

  static dice(boardActionResult) {
    var dice = super.dice(boardActionResult);
    // Block dice are doubled up, only use the first half of the dice list.
    return dice.slice(0, dice.length / 2).map(BlockRoll.asBlockDie);
  }

  get description() {
    var uphill = this.isRedDice ? ' uphill' : '';
    var attackerSkills =
      this.attacker.skills.length > 0
        ? ` (${this.attacker.skillNames.join(', ')})`
        : '';
    var defenderSkills =
      this.defender.skills.length > 0
        ? ` (${this.defender.skillNames.join(', ')})`
        : '';
    return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name
      }${attackerSkills} against ${this.defender.name
      }${defenderSkills} - ${this.dice.join('/')}${uphill}`;
  }

  static ignore(xml) {
    // Block dice have dice repeated for the coaches selection, resulttype is missing for the second one
    if (xml.boardActionResult.ResultType != RESULT_TYPE.FailTeamRR) {
      return true;
    }
    if (xml.boardActionResult.SubResultType == SUB_RESULT_TYPE.Fend) {
      // Opponent picking whether to activate fend
      return true;
    }
    if (xml.boardActionResult.SubResultType == SUB_RESULT_TYPE.DodgeNoReq) {
      // Not sure what this is, but it doesn't have the expected number of dice.
      return true;
    }

    return super.ignore(xml);
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

  dieValue(result, includeExpectedArmor) {
    const attacker = this.attacker;
    const defender = this.defender;
    var attackerSkills = (attacker && attacker.skills) || [];
    var defenderSkills = (defender && defender.skills) || [];

    switch (result) {
      case ATTACKER_DOWN:
        return this.knockdownValue(attacker, includeExpectedArmor).add(
          this.turnoverValue,
        );
      case BOTH_DOWN:
        if (attackerSkills.includes(SKILL.Block)) {
          if (defenderSkills.includes(SKILL.Block)) {
            return new SingleValue('Block/Block', 0);
          } else {
            return this.knockdownValue(defender, includeExpectedArmor);
          }
        } else if (attackerSkills.includes(SKILL.Wrestle)) {
          return this.knockdownValue(defender, false).add(
            this.knockdownValue(attacker, false)
          );
        } else {
          return this.knockdownValue(defender, includeExpectedArmor).add(
            this.knockdownValue(attacker, includeExpectedArmor),
            this.turnoverValue
          );
        }
      case PUSH:
        return defenderSkills.includes(SKILL.StandFirm)
          ? new SingleValue('Stand Firm', 0)
          : this.knockdownValue(defender, false).product(new SingleValue('Push', 0.33)).named(`Push(${defender.name})`);
      case DEFENDER_STUMBLES:
        if (
          defenderSkills.includes(SKILL.Dodge) &&
          !attackerSkills.includes(SKILL.Tackle)
        ) {
          return defenderSkills.includes(SKILL.StandFirm)
            ? new SingleValue('Stand Firm', 0)
            : this.knockdownValue(defender, false).product(new SingleValue('Push', 0.33)).named(`Push(${defender.name})`);
        } else {
          return this.knockdownValue(defender, includeExpectedArmor);
        }
      case DEFENDER_DOWN:
        return this.knockdownValue(defender, includeExpectedArmor);
    }
  }

  value(dice, expected) {
    var possibilities = dice
      .filter((value, index, self) => self.indexOf(value) === index)
      .map((die) => this.dieValue(die, expected));
    if (possibilities.length == 1) {
      return possibilities[0];
    } else if (this.isRedDice) {
      return new MinDistribution(possibilities);
    } else {
      return new MaxDistribution(possibilities);
    }
  }
  get possibleOutcomes() {
    var value;
    const blockDie = new SimpleDistribution([
      { name: PUSH, weight: 1 / 3, value: this.value([PUSH], true) },
      { name: ATTACKER_DOWN, weight: 1 / 6, value: this.value([ATTACKER_DOWN], true) },
      { name: DEFENDER_DOWN, weight: 1 / 6, value: this.value([DEFENDER_DOWN], true) },
      { name: DEFENDER_STUMBLES, weight: 1 / 6, value: this.value([DEFENDER_STUMBLES], true) },
      { name: BOTH_DOWN, weight: 1 / 6, value: this.value([BOTH_DOWN], true) },
    ])
    if (this.dice.length == 1) {
      value = blockDie;
    } else if (this.isRedDice) {
      value = new MinDistribution(new Array(this.dice.length).fill(blockDie));
    } else {
      value = new MaxDistribution(new Array(this.dice.length).fill(blockDie));
    }
    Object.defineProperty(this, 'possibleOutcomes', {
      value: value
    });
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
        DEFENDER_DOWN
      ])
    );
  }
}

class FansRoll extends Roll {
  // TODO: Need to capture both teams rolls, because result is about comparison.
}

class ModifiedD6SumRoll extends Roll {
  static numDice = 1;

  constructor(args) {
    super(args);
    console.assert(
      !this.computedTarget ||
      !this.target ||
      this.computedTarget == this.target,
      "Computed target (%d) doesn't equal target from replay XML (%d)",
      this.computedTarget,
      this.target,
      this
    );
    console.assert(
      this.computedModifier === undefined ||
      this.modifier === undefined ||
      this.computedModifier == this.modifier,
      "Computed modifier (%d) doesn't equal modifier from replay XML (%d)",
      this.computedModifier,
      this.modifier,
      this
    );
    console.assert(
      this.dice === undefined || this.constructor.numDice == this.dice.length,
      'Mismatch in number of dice (%d) and expected number of dice (%d)',
      this.dice && this.dice.length,
      this.constructor.numDice,
      this
    );
  }

  static argsFromXml(xml) {
    const args = super.argsFromXml(xml);
    args.modifier =
      ensureList(xml.boardActionResult.ListModifiers.DiceModifier || [])
        .map((modifier) => modifier.Value || 0)
        .reduce((a, b) => a + b, 0) || 0;
    args.target = xml.boardActionResult.Requirement;
    return args;
  }

  get description() {
    var activeSkills =
      this.activePlayer.skills.length > 0
        ? ` (${this.activePlayer.skillNames})`
        : '';
    return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name}${activeSkills} - ${this.dice} (${this.modifiedTarget})`;
  }

  get actual() {
    return Object.assign(super.actual, {
      target: this.modifiedTarget
    });
  }
  get modifiedTarget() {
    var target =
      (this.target || this.computedTarget) -
      (this.modifier || this.computedModifier || 0);
    if (this.constructor.numDice == 1) {
      return Math.min(6, Math.max(2, target));
    } else {
      return target;
    }
  }
  value(dice, expected) {
    if (dice.reduce((a, b) => a + b, 0) >= this.modifiedTarget) {
      return this.passValue(expected);
    } else if (!this.hasSkillReroll) {
      return this.failValue(expected);
    } else {
      return new SingleValue(`Rerolled ${this.rollName}`, 0);
    }
  }
  get possibleOutcomes() {
    var diceSums = [0];
    for (var die = 0; die < this.constructor.numDice; die++) {
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
    var outcomes = [];
    if (passingSums.length > 0) {
      const minPassing = Math.min(...passingSums);
      const maxPassing = Math.max(...passingSums);
      outcomes.push({
        name: minPassing === maxPassing ? minPassing : `${minPassing}-${maxPassing}`,
        value: this.passValue(true),
        weight: passingSums.length / (passingSums.length + failingSums.length)
      });
    }
    if (failingSums.length > 0) {
      const minFailing = Math.min(...failingSums);
      const maxFailing = Math.max(...failingSums);
      outcomes.push({
        name: minFailing === maxFailing ? minFailing : `${minFailing}-${maxFailing}`,
        value: this.hasSkillReroll ? this.reroll.possibleOutcomes : this.failValue(true),
        weight: failingSums.length / (passingSums.length + failingSums.length)
      });
    }
    return new SimpleDistribution(outcomes);
  }
  get reroll() {
    const reroll = new this.constructor({
      ...this,
      rollStatus: ROLL_STATUS.RerollWithSkill
    });
    Object.defineProperty(this, 'reroll', { value: reroll });
    return this.reroll;

  }
  get hasSkillReroll() {
    return this.activePlayer.skills.includes(this.constructor.rerollSkill) &&
      !this.skillsInEffect.includes(this.constructor.rerollCancelSkill) &&
      ![ROLL_STATUS.RerollWithSkill, ROLL_STATUS.RerollTaken].includes(this.rollStatus);
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
  isDependentRoll(roll) {
    return (
      roll.rollType == this.rollType &&
      [ROLL_STATUS.RerollTaken, ROLL_STATUS.RerollWithSkill].includes(
        roll.rollStatus
      )
    );
  }
}

class PickupRoll extends ModifiedD6SumRoll {
  static rerollSkill = SKILL.SureHands;
  static handledSkills = [SKILL.SureHands, SKILL.BigHand, SKILL.ExtraArms];
  failValue() {
    return this.turnoverValue;
  }
}

class BoneHeadRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.BoneHead];
  failValue() {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class ReallyStupidRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.ReallyStupid];
  failValue() {
    return this.knockdownValue(this.activePlayer, false);
  }
}

// TODO: Detect which armor/injury rolls are from fouls, and classify as such
// TODO: Include foul send-offs in armor/injury roll outcomes
class ArmorRoll extends ModifiedD6SumRoll {
  static numDice = 2;
  static handledSkills = [SKILL.Claw, SKILL.MightyBlow];

  static argsFromXml(xml) {
    const args = super.argsFromXml(xml);

    // An Armor PileOn has a IsOrderCompleted RollType 60 right before it
    if (xml.resultIndex == 0) {
      args.isPileOn = false;
    } else {
      var previousResult =
        xml.action.Results.BoardActionResult[xml.resultIndex - 1];
      args.isPileOn = previousResult.RollType == 59;
      if (args.isPileOn) {
        var previousSkills = ensureList(previousResult.CoachChoices.ListSkills.SkillInfo);
        args.pilingOnPlayer = args.boardState.playerById(
          previousSkills.filter((skill) => skill.SkillId == SKILL.PilingOn)[0]
            .PlayerId
        );
      }
    }
    return args;
  }

  get computedTarget() {
    return this.activePlayer.playerState.Data.Av + 1;
  }

  get computedModifier() {
    return 0;
  }

  get injuryRoll() {
    Object.defineProperty(this, 'injuryRoll', {
      value: new InjuryRoll({
        boardState: {
          ...this.boardState
        },
        modifier: 0,
      })
    });
    return this.injuryRoll;
  }

  passValue(expected) {
    // passValue is negative because "Passing" an armor roll means rolling higher than
    // armor, which is a bad thing.
    var injuredPlayerValue = this.stunValue(this.activePlayer); // Player is at least stunned = out for 2 turns
    if (expected) {
      injuredPlayerValue = injuredPlayerValue.add(this.injuryRoll.possibleOutcomes);
    }
    if (this.isPileOn) {
      const pileOnCost = this.knockdownValue(this.pilingOnPlayer, false);
      return injuredPlayerValue.add(pileOnCost);
    } else {
      return injuredPlayerValue;
    }
  }

  failValue() {
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      return this.knockdownValue(this.pilingOnPlayer, false);
    } else {
      return new SingleValue('No Break', 0);
    }
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
  static handledSkills = [SKILL.BreakTackle, SKILL.Stunty, SKILL.TwoHeads, SKILL.Dodge, SKILL.Tackle, SKILL.PrehensileTail, SKILL.DivingTackle];
  static rerollSkill = SKILL.Dodge;
  static rerollCancelSkill = SKILL.Tackle;
  isDependentRoll(roll) {
    return (
      super.isDependentRoll(roll) ||
      [ArmorRoll, InjuryRoll].includes(roll.constructor)
    );
  }
  failValue(expected) {
    return this.knockdownValue(this.activePlayer, expected).add(this.turnoverValue);
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
  isDependentRoll(roll) {
    return [ArmorRoll, InjuryRoll].includes(roll.constructor);
  }
  failValue() {
    return this.knockdownValue(this.activePlayer).add(this.turnoverValue);
  }
}

class PassRoll extends ModifiedD6SumRoll {
  static rerollSkill = SKILL.Pass;
  static handledSkills = [SKILL.Pass, SKILL.StrongArm, SKILL.Accurate];
  failValue() {
    // TODO: Failed pass doesn't turn over, it causes the ball to scatter. If it scatters to another
    // player, then it's not a turnover.
    // TODO: Account for fumbles.
    return this.turnoverValue;
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

  isDependentRoll(roll) {
    return [CatchRoll, InterceptionRoll].includes(roll.constructor);
  }
}

class InterceptionRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.ExtraArms];
  // Interception rolls on the thrower, not the interceptee. If it "passes",
  // then the ball is caught
  passValue() {
    return this.turnoverValue;
  }
}

class WakeUpRoll extends ModifiedD6SumRoll {
  constructor(attrs) {
    super(attrs);
    this.boardState.activeTeam = this.boardState.activePlayer.team;
  }
  passValue() {
    return this.koValue(this.activePlayer);
  }
}

class GFIRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.SureFeet];
  static rerollSkill = SKILL.SureFeet;

  isDependentRoll(roll) {
    return (
      super.isDependentRoll(roll) ||
      [ArmorRoll, InjuryRoll].includes(roll.constructor)
    );
  }
  failValue(expected) {
    return this.knockdownValue(this.activePlayer, expected).add(this.turnoverValue);
  }
}

class CatchRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.DisturbingPresence, SKILL.Catch, SKILL.ExtraArms];
  static rerollSkill = SKILL.Catch;

  failValue() {
    return this.turnoverValue;
  }
}

class StandUpRoll extends ModifiedD6SumRoll {
  failValue() {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class TakeRootRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.TakeRoot];
  failValue() {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class LandingRoll extends ModifiedD6SumRoll {
  failValue(expected) {
    // TODO: Handle a turnover if the thrown player has the ball
    return this.knockdownValue(this.activePlayer, expected);
  }
}

class FireballRoll extends ModifiedD6SumRoll {
  passValue(expected) {
    return this.knockdownValue(this.activePlayer, expected);
  }
}

class LightningBoltRoll extends ModifiedD6SumRoll {
  passValue(expected) {
    return this.knockdownValue(this.activePlayer, expected);
  }
}

class InjuryRoll extends Roll {
  static handledSkills = [SKILL.MightyBlow, SKILL.DirtyPlayer, SKILL.Stunty];

  static argsFromXml(xml) {
    const args = super.argsFromXml(xml);

    // An Injury PileOn has a IsOrderCompleted RollType 60 right before it
    if (xml.resultIndex == 0) {
      args.isPileOn = false;
    } else {
      var previousResult =
        xml.action.Results.BoardActionResult[xml.resultIndex - 1];
      args.isPileOn = previousResult.RollType == 60;
      if (args.isPileOn) {
        var previousSkills = ensureList(
          previousResult.CoachChoices.ListSkills.SkillInfo
        );
        args.pilingOnPlayer = args.boardState.playerById(
          previousSkills.filter((skill) => skill.SkillId == SKILL.PilingOn)[0]
            .PlayerId
        );
      }
    }

    args.modifier =
      ensureList(xml.boardActionResult.ListModifiers.DiceModifier || [])
        .map((modifier) => modifier.Value || 0)
        .reduce((a, b) => a + b, 0) || 0;

    return args;
  }

  static ignore(xml) {
    if (xml.boardActionResult.IsOrderCompleted != 1) {
      console.log('Ignoring incomplete InjuryRoll', { roll: this });
      return true;
    }
    return super.ignore(xml);
  }

  // TODO: Handle skills
  injuryValue(total) {
    if (this.activePlayer.skills.includes(SKILL.Stunty)) {
      total += 1;
    }
    if (total <= 7) {
      return new SingleValue("No Injury", 0); // Only stunned, no additional cost relative to armor break failure
    } else if (total <= 9) {
      return this.koValue(this.activePlayer);
    } else {
      return this.casValue(this.activePlayer);
    }
  }

  value(dice) {
    var total = dice[0] + dice[1] + this.modifier;
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      return this.injuryValue(total).add(this.onPitchValue(this.pilingOnPlayer).product(-1));
    } else {
      return this.injuryValue(total);
    }
  }
  get possibleOutcomes() {
    var outcomesByName = {};
    for (var first = 1; first <= 6; first++) {
      for (var second = 1; second <= 6; second++) {
        var outcomeList = outcomesByName[this.value([first, second], true).name];
        if (!outcomeList) {
          outcomeList = outcomesByName[this.value([first, second], true).name] = [];
        }
        outcomeList.unshift({
          name: (first + second).toString(),
          value: this.value([first, second], true)
        });
      }
    }
    Object.defineProperty(this, 'possibleOutcomes', {
      value: new SimpleDistribution(
        Object.values(outcomesByName).map((outcomes) => {
          const minOutcome = Math.min(
            ...outcomes.map((outcome) => parseInt(outcome.name))
          );
          const maxOutcome = Math.max(...outcomes.map((outcome) => parseInt(outcome.name)));
          return {
            name: minOutcome === maxOutcome ? minOutcome : `${minOutcome}-${maxOutcome}`,
            weight: outcomes.length,
            value: outcomes[0].value
          }
        })
      )
    });
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
    return new SingleValue("CAS", 0); // Need to figure out how to grade losing player value for multiple matches
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
        outcomes.unshift({
          name: `${type}${subtype}`,
          value: this.value(type * 10 + subtype, true),
          weight: 1
        });
      }
    }
    Object.defineProperty(this, 'possibleOutcomes', { value: new SimpleDistribution(outcomes) });
    return this.possibleOutcomes;
  }
  simulateDice() {
    return sample([1, 2, 3, 4, 5, 6]) * 10 + sample([1, 2, 3, 4, 5, 6, 7, 8]);
  }
  static ignore(xml) {
    // Just guessing at this
    if (
      xml.boardActionResult.ResultType != RESULT_TYPE.FailTeamRR &&
      xml.boardActionResult.SubResultType != SUB_RESULT_TYPE.ArmorNoBreak &&
      // Replay Coach-551-9619f4910217db1915282ea2242c819f_2016-04-07_00_05_06, Furry Bears turn 8 crowdsurf injury, shouldn't be ignored
      xml.boardActionResult.SubResultType != 12
    ) {
      console.warn('Ignoring casualty roll, should verify', { roll: this });
      return true;
    }
    return super.ignore(xml);
  }
}

class NoValueRoll extends Roll {
  static ignore() {
    return true;
  }
  value() {
    return 0;
  }
  get expectedValue() {
    return 0;
  }
  simulateDice() {
    return null;
  }
  get possibleOutcomes() {
    return [];
  }
}

class PushRoll extends NoValueRoll {
  static handledSkills = [SKILL.SideStep];
}

class FollowUpRoll extends NoValueRoll {
  static handledSkills = [SKILL.Frenzy];
}

class FoulPenaltyRoll extends NoValueRoll { }

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
  19: null, // Touch Back
  20: BoneHeadRoll,
  21: ReallyStupidRoll,
  22: WildAnimalRoll,
  //23: LonerRoll,
  24: LandingRoll,
  // 25: Regeneration
  26: null, // Inaccurate Pass Scatter
  //27: AlwaysHungryRoll
  //28: EatTeammate,
  29: DauntlessRoll,
  //30: SafeThrow
  31: JumpUpRoll,
  //32: Shadowing
  // 34: StabRoll,
  36: LeapRoll,
  // 37: FoulAppearanceRoll,
  // 38: Tentacles
  // 39: Chainsaw (Kickback?)
  40: TakeRootRoll,
  // 41: BallAndChain
  // 42: HailMaryPassRoll,
  // 44: Diving Tackle
  // 45: ProRoll,
  // 46: HypnoticGazeRoll,
  //49: Animosity
  //50: Bloodlust
  // 51: Bite
  // 52: Bribe
  54: FireballRoll,
  55: LightningBoltRoll,
  56: ThrowTeammateRoll,
  // 57: Multiblock
  58: null, // Kickoff Gust
  59: ArmorRoll, // Armor Roll with Pile On. If followed by a RollType 59 w/ IsOrderCompleted, then PO happened. Otherwise, no PO
  60: InjuryRoll, // Injury Roll with Pile On. If followed by a RollType 60 w/ IsOrderCompleted, then PO happened, otherwise, no PO?
  61: null, // Some sort of wrestle roll that doesn't do anything
  // 62: Dodge Pick
  // 63: Stand firm
  // 64: Juggernaut
  // 65: Stand Firm 2
  // 66: Raise Dead
  // 69: FansRoll,
  70: null // Weather
  // 71: Swealtering Heat
  // 72: Bomb KD
  // 73: Chainsaw Armor
};
