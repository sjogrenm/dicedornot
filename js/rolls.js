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
import { weightedQuantile } from "./utils.js";

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
  return decayedTurns;
}

class Details {
  summary;
  detailDescription;
  details;
  
  constructor({summary, detailDescription, details}) {
    this.summary = summary;
    this.detailDescription = detailDescription;
    this.details = details;
  }
}

class ValueComponent {
  valueOf() {
    return this.value;
  }
  toFixed(n) {
    return this.value.toFixed(n);
  }
}

class DetailedValue extends ValueComponent {
  value;
  detail;

  constructor({value, ...rest}) {
    super()
    this.detail = new Details(rest)
    this.value = value;
  }
}

class ExpectedOutcome extends ValueComponent{
  constructor(outcomes) {
    super()
    this.outcomes = outcomes;
    this.value = (
      outcomes
        .map((outcome) => outcome.value * (outcome.count || 1))
        .reduce((a, b) => a + b, 0) /
      outcomes
        .map((outcome) => outcome.count || 1)
        .reduce((a, b) => a + b, 0)
    );
  }
  get detail() {
    return new Details({
      summary: `Expected Outcome: ${this.toFixed(2)}`,
      detailDescription: "Possible outcomes",
      details: this.outcomes.map(
        (outcome) => outcome.detail ||
          `${outcome.count || 1}x ${
            outcome.name
          }: value = ${outcome.value.toFixed(2)}`
      ),
    })
  }
}

class ValueSum extends ValueComponent {
  constructor(factors) {
    super()
    this.factors = factors;
    this.value = factors.reduce((a, b) => a + b, 0)
  }
  get detail() {
    return new Details({
      summary: `${this.factors.map(factor => factor.toFixed(2)).join(" + ")} = ${this.value.toFixed(2)}`,
      details: this.factors.map(
        factor => factor.detail || factor.toFixed(2)
      )
    });
  }
}

class MaxValue extends ValueComponent {
  constructor(values) {
    super()
    this.values = values;
    this.value = Math.max(...values);
  }
  get detail() {
    return new Details({
      summary: `Max of ${this.values.map(value => value.toFixed(2)).join(', ')}`,
      details: this.values.map(
        value => value.detail || value.toFixed(3)
      )
    });
  }
}

class MinValue extends ValueComponent {
  constructor(values) {
    super()
    this.values = values;
    this.value = Math.min(...values);
  }
  get detail() {
    return new Details({
      summary: `Min of ${this.values.map(value => value.toFixed(2)).join(', ')}`,
      details: this.values.map(
        value => value.detail || value
      )
    });
  }
}

class NamedOutcome extends ValueComponent {
  constructor(name, outcome, count) {
    super()
    this.name = name;
    this.value = outcome;
    this.count = count || 1;
  }

  get detail() {
    return new Details({
      summary: `${this.count || 1}x ${
            this.name
          }: value = ${this.value.toFixed(2)}`,
      details: [this.value.detail || this.value],
    });
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
    this.skills = Roll.translateStringNumberList(playerState.Data.ListSkills) || [];
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
      .join("");
  }
}

class BoardState {
  teams;
  activeTeam;
  turn;
  
  constructor({teams, activeTeamId, activePlayerId, ballCell}) {
    this.teams = teams;
    this.activeTeam = teams.filter(
        (team) => team.id == activeTeamId
      )[0] || teams[0];
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
    console.log("No player found", {
      replayStep: this.replayStep,
      action: this.action,
      cell,
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
      "Unhandled skills for roll",
      {
        roll: this,
        skills: (this.unhandledSkills && this.unhandledSkills.map(
          (skillinfo) => SKILL_NAME[skillinfo.SkillId]
        )),
        rollName: this.rollName,
      }
    );
  }

  static argsFromXml(xml) {
    const args = {};

    args.boardState = new BoardState(BoardState.argsFromXml(xml)
    );
    args.rollType = xml.boardActionResult.RollType;
    args.dice = this.dice(xml.boardActionResult);
    const skillsInEffect = ensureList(xml.boardActionResult.CoachChoices.ListSkills.SkillInfo);
    args.unhandledSkills = skillsInEffect.filter(
      (skillInfo) => !this.handledSkills.includes(skillInfo.SkillId)
    );
    args.ignore = this.ignore(xml);

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
  get detail() {
    var details = [
      this.value(this.dice).detail || `Value: ${this.value(this.dice).toFixed(2)}`
    ]
    if (this.dependentRolls.length > 0) {
      details.push(new Details({
        summary: `Dependent rolls value = ${this.dependentRollsValue}`,
        details: this.dependentRolls.map(roll => roll.detail)
      }))
    }
    details.push(this.expectedValue.detail)
    return new Details({
      summary: `${this.description}: value = ${this.value(this.dice).toFixed(
        2
      )} (expected: ${this.expectedValue.toFixed(2)})`,
      detailDescription: "Value Breakdown",
      details: details
    });
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

  isDependentRoll(roll) {
    return false;
  }

  value(dice, expected) {
    throw "value must be defined by subclass";
  }
  get expectedValue() {
    return new ExpectedOutcome(this.possibleOutcomes);
  }
  get possibleOutcomes() {
    throw `possibleOutcomes must be defined by subclass ${this.constructor.name}`;
  }
  simulateDice() {
    throw "simulateDice must be defined by subclass";
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
    var dataPoint = this.dataPoint(-1, this.dice, "actual", true);
    const deltaNetValues = this.possibleOutcomes.map((outcome) => ({
      value: outcome.value - dataPoint.expectedValue,
      weight: outcome.count,
    }));
    return Object.assign(dataPoint, {
      turn: this.turn,
      player: (this.activePlayer && this.activePlayer.name) || "",
      playerSkills:
        (this.activePlayer &&
          this.activePlayer.skills.map((skill) => SKILL_NAME[skill])) ||
        [],
      rollName: this.rollName,
      dice: this.dice,
      dnvMin: Math.min(...deltaNetValues.map((outcome) => outcome.value)),
      dnvq33: weightedQuantile(deltaNetValues, 0.33, "value", "weight"),
      dnvMed: weightedQuantile(deltaNetValues, 0.5, "value", "weight"),
      dnvq67: weightedQuantile(deltaNetValues, 0.67, "value", "weight"),
      dnvMax: Math.max(...deltaNetValues.map((outcome) => outcome.value)),
    });
  }
  simulated(iteration, rollIndex) {
    var dataPoint = this.dataPoint(
      iteration,
      this.simulateDice(),
      "simulated",
      false
    );
    dataPoint.outcomeValue += this.dependentRolls
      .map((roll) => roll.value(roll.simulateDice(), false))
      .reduce((a, b) => a + b, 0);
    return dataPoint;
  }

  dataPoint(iteration, dice, type, includeDependent) {
    var outcomeValue = this.value(dice, false);
    if (includeDependent) {
      outcomeValue += this.dependentRollsValue;
    }
    var expectedValue = this.expectedValue;
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
      rollIndex: this.rollIndex,
    };
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
      return new rollClass(
        rollClass.argsFromXml({
            stepIndex,
            replayStep,
            actionIndex,
            action,
            resultIndex,
            boardActionResult,
          })
      );
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

  onTeamValue(player) {
    // The fraction of the teams on-pitch players that this player represents.
    return (
      this.onTeamValues[player.id] ||
      (this.onTeamValues[player.id] =
        this.playerValue(player) /
        this.teamValue(player.team, [SITUATION.Active, SITUATION.Reserves]))
    );
  }

  armorRoll(player) {
    return (
      this.armorRollCache[player.id] ||
      (this.armorRollCache[player.id] = new ArmorRoll({
        boardState: {
          ...this.boardState,
          activePlayer: player,
        },
      }))
    );
  }

  knockdownValue(player, includeExpectedArmor) {
    // Return the number of half-turns the player is unavailable times the
    // fraction of current team value it represents
    var playerValue = this.onPitchValue(player);
    var turnsMissing = 1
    if (this.onActiveTeam(player)) {
      turnsMissing = decayedHalfTurns(Math.min(2, this.halfTurnsLeft));
    }
    var value = playerValue * turnsMissing;
    var details = [
      playerValue.detail || `Player Value: ${playerValue.toFixed(2)}`,
      `Time-discounted half-turns missing: ${turnsMissing}`,
    ]
    if (this.onActiveTeam(player)) {
      value *= -1;
      details.push(`On Active Team (negative value)`);
    }
    if (includeExpectedArmor) {
      const armorValue = this.armorRoll(player).expectedValue;
      const armorDetail = armorValue.detail;
      armorDetail.summary = 'Armor: ' + armorDetail.summary;
      details.push(armorDetail);
      value += armorValue;
    }
    return new DetailedValue({
      summary: `Knockdown Value: ${value.toFixed(2)}`,
      details: details,
      value: value,
    });
  }

  stunValue(player) {
    // Return the number of half-turns the player is unavailable times the
    // fraction of current team value it represents
    var playerValue = this.onPitchValue(player);
    if (this.onActiveTeam(player)) {
      return -playerValue * decayedHalfTurns(Math.min(3, this.halfTurnsLeft));
    } else {
      return playerValue * decayedHalfTurns(Math.min(4, this.halfTurnsLeft));
    }
  }

  koValue(player) {
    const playerValue =
      this.onPitchValue(player) * decayedHalfTurns(this.halfTurnsLeft);
    return (
      (this.onActiveTeam(player) ? -playerValue : playerValue) -
      this.stunValue(player)
    );
  }

  casValue(player) {
    const playerValue =
      this.onTeamValue(player) * this.halfTurnsLeft +
      (this.onPitchValue(player) - this.onTeamValue(player)) *
        decayedHalfTurns(this.halfTurnsLeft);
    return (
      (this.onActiveTeam(player) ? -playerValue : playerValue) -
      this.stunValue(player)
    );
  }

  get unactivatedPlayers() {
    Object.defineProperty(this, "unactivatedPlayers", {
      value: this.activeTeam.players.filter((player) => player.canAct),
    });
    return this.unactivatedPlayers;
  }

  get turnoverValue() {
    const value = -this.unactivatedPlayers
      .filter((player) => player != this.activePlayer)
      .map((player) => this.onPitchValue(player))
      .reduce((a, b) => a + b, 0);
    const detail = new DetailedValue({
      value,
      summary: `Turnover Value: ${value.toFixed(2)}`,
      details: this.unactivatedPlayers
        .filter((player) => player != this.activePlayer)
        .map(
          (player) => `${player.name}: ${-this.onPitchValue(player).toFixed(2)}`
        )
    });
    Object.defineProperty(this, 'turnoverValue', { value: detail });
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

  static argsFromXml(xml) {
    const args = super.argsFromXml(xml);
    args.isRedDice = xml.boardActionResult.Requirement < 0;
    args.attacker = args.boardState.activePlayer;
    args.defender = args.boardState.playerAtPosition(xml.action.Order.CellTo.Cell);
    return args;
  }

  isDependentRoll(roll) {
    return [PushRoll, FollowUpRoll, ArmorRoll, InjuryRoll].includes(
      roll.constructor
    );
  }

  static dice(boardActionResult) {
    var dice = super.dice(boardActionResult);
    // Block dice are doubled up, only use the first half of the dice list.
    return dice.slice(0, dice.length / 2).map(BlockRoll.asBlockDie);
  }

  get description() {
    var uphill = this.isRedDice ? " uphill" : "";
    var attackerSkills =
      this.attacker.skills.length > 0
        ? ` (${this.attacker.skillNames.join(", ")})`
        : "";
    var defenderSkills =
      this.defender.skills.length > 0
        ? ` (${this.defender.skillNames.join(", ")})`
        : "";
    return `${this.rollName}: [${this.activePlayer.team.shortName}] ${
      this.activePlayer.name
    }${attackerSkills} against ${
      this.defender.name
    }${defenderSkills} - ${this.dice.join("/")}${uphill}`;
  }

  static ignore(xml) {
    // Block dice have dice repeated for the coaches selection, resulttype is missing for the second one
    if (xml.boardActionResult.ResultType != 2) {
      return true;
    }
    if (xml.boardActionResult.SubResultType == 35) {
      // Opponent picking whether to activate fend
      return true;
    }
    if (xml.boardActionResult.SubResultType == 57) {
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
        return new ValueSum([
          this.knockdownValue(attacker, includeExpectedArmor),
          this.turnoverValue
        ]);
      case BOTH_DOWN:
        if (attackerSkills.includes(SKILL.Block)) {
          if (defenderSkills.includes(SKILL.Block)) {
            return new DetailedValue({summary: 'Block/Block', value: 0});
          } else {
            return this.knockdownValue(defender, includeExpectedArmor);
          }
        } else if (attackerSkills.includes(SKILL.Wrestle)) {
          return new ValueSum([
            this.knockdownValue(defender, false),
            this.knockdownValue(attacker, false)
          ]);
        } else {
          return new ValueSum([
            this.knockdownValue(defender, includeExpectedArmor),
            this.knockdownValue(attacker, includeExpectedArmor),
            this.turnoverValue
          ]);
        }
      case PUSH:
        return defenderSkills.includes(SKILL.StandFirm)
          ? new DetailedValue({summary: 'Push into Stand Firm', value: 0})
          : this.knockdownValue(defender, false) * 0.25;
      case DEFENDER_STUMBLES:
        if (
          defenderSkills.includes(SKILL.Dodge) &&
          !attackerSkills.includes(SKILL.Tackle)
        ) {
          return defenderSkills.includes(SKILL.StandFirm)
            ? new DetailedValue({summary: 'DS into Dodge + Stand Firm', value: 0})
            : this.knockdownValue(defender, includeExpectedArmor) * 0.25;
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
      return new MinValue(possibilities);
    } else {
      return new MaxValue(possibilities);
    }
  }
  get possibleOutcomes() {
    var values;
    if (this.dice.length == 1) {
      values = BLOCK.values.map((dice) => new NamedOutcome(
        dice.toString(),
        this.value([dice], true),
      ));
    } else {
      values = dice(new Array(this.dice.length).fill(BLOCK)).values.map(
        (dice) => new NamedOutcome(
          dice.sort().join("/"),
          this.value(dice, true),
        )
      );
    }
    var valuesSummary = {};
    for (const value of values) {
      if (valuesSummary[value.name]) {
        valuesSummary[value.name].count += 1;
      } else {
        valuesSummary[value.name] = value;
        value.count = 1;
      }
    }
    Object.defineProperty(this, "possibleOutcomes", {
      value: Object.values(valuesSummary),
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
        DEFENDER_DOWN,
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
      !this.computedTarget  || !this.target || this.computedTarget == this.target,
      "Computed target (%d) doesn't equal target from replay XML (%d)",
      this.computedTarget,
      this.target,
      this
    )
    console.assert(
      this.computedModifier === undefined || this.modifier === undefined || this.computedModifier == this.modifier,
      "Computed modifier (%d) doesn't equal modifier from replay XML (%d)",
      this.computedModifier,
      this.modifier,
      this
    )
    console.assert(
      this.dice === undefined || this.constructor.numDice == this.dice.length,
      "Mismatch in number of dice (%d) and expected number of dice (%d)",
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
        : "";
    return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name}${activeSkills} - ${this.dice} (${this.modifiedTarget})`;
  }

  get actual() {
    return Object.assign(super.actual, {
      target: this.modifiedTarget,
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
    } else {
      return this.failValue(expected);
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
      outcomes.push({
        name: `${Math.min(...passingSums)} - ${Math.max(...passingSums)}`,
        value: this.passValue(true),
        count: passingSums.length,
      });
    }
    if (failingSums.length > 0) {
      outcomes.push({
        name: `${Math.min(...failingSums)} - ${Math.max(...failingSums)}`,
        value: this.failValue(true),
        count: failingSums.length,
      });
    }
    return outcomes;
  }
  hasFreeReroll() {
    return false;
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
    return this.turnoverValue;
  }
}

class BoneHeadRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.BoneHead];
  failValue(expected) {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class ReallyStupidRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.ReallyStupid];
  failValue(expected) {
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
      var previousResult = xml.action.Results.BoardActionResult[
        xml.resultIndex - 1
      ];
      args.isPileOn = previousResult.RollType == 59;
      if (args.isPileOn) {
        var previousSkills = previousResult.CoachChoices.ListSkills.SkillInfo;
        if (previousSkills && !previousSkills.length) {
          previousSkills = [previousSkills];
        }
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
    Object.defineProperty(this, "injuryRoll", {
      value: new InjuryRoll({
        boardState: {
          ...this.boardState,
        }
      })
    });
    return this.injuryRoll;
  }

  passValue(expected) {
    // passValue is negative because "Passing" an armor roll means rolling higher than
    // armor, which is a bad thing.
    var injuredPlayerValue = this.stunValue(this.activePlayer); // Player is at least stunned = out for 2 turns
    if (expected) {
      injuredPlayerValue += this.injuryRoll.expectedValue;
    }
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      return (
        injuredPlayerValue + this.knockdownValue(this.pilingOnPlayer, false)
      );
    } else {
      return injuredPlayerValue;
    }
  }

  failValue() {
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      return this.knockdownValue(this.pilingOnPlayer, false);
    } else {
      return 0;
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
  static handledSkills = [SKILL.BreakTackle, SKILL.Stunty];
  isDependentRoll(roll) {
    return [DodgeRoll, ArmorRoll, InjuryRoll].includes(roll.constructor);
  }
  failValue() {
    return this.knockdownValue(this.activePlayer) + this.turnoverValue;
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
    return this.knockdownValue(this.activePlayer) + this.turnoverValue;
  }
}

class PassRoll extends ModifiedD6SumRoll {
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
  failValue(expected) {
    return this.knockdownValue(this.activePlayer, expected) + this.turnoverValue;
  }
}

class CatchRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.DisturbingPresence];

  failValue() {
    return this.turnoverValue;
  }
}

class StandUpRoll extends ModifiedD6SumRoll {
  failValue(expected) {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class TakeRootRoll extends ModifiedD6SumRoll {
  static handledSkills = [SKILL.TakeRoot];
  failValue(expected) {
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
      var previousResult = xml.action.Results.BoardActionResult[
        xml.resultIndex - 1
      ];
      args.isPileOn = previousResult.RollType == 60;
      if (this.isPileOn) {
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
      console.log("Ignoring incomplete InjuryRoll", { roll: this });
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
      return 0; // Only stunned, no additional cost relative to armor break failure
    } else if (total <= 9) {
      return this.koValue(this.activePlayer);
    } else {
      return this.casValue(this.activePlayer);
    }
  }

  value(dice, expected) {
    var total = dice[0] + dice[1] + this.modifier;
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      return this.injuryValue(total) - this.onPitchValue(this.pilingOnPlayer);
    } else {
      return this.injuryValue(total);
    }
  }
  get possibleOutcomes() {
    var outcomesByValue = {};
    for (var first = 1; first <= 6; first++) {
      for (var second = 1; second <= 6; second++) {
        var outcomeList = outcomesByValue[this.value([first, second], true)];
        if (!outcomeList) {
          outcomeList = outcomesByValue[this.value([first, second], true)] = [];
        }
        outcomeList.unshift({
          name: (first + second).toString(),
          value: this.value([first, second], true),
        });
      }
    }
    Object.defineProperty(this, "possibleOutcomes", {
      value: Object.entries(outcomesByValue).map(([value, outcomes]) => ({
        name: `${Math.min(
          ...outcomes.map((outcome) => parseInt(outcome.name))
        )} - ${Math.max(...outcomes.map((outcome) => parseInt(outcome.name)))}`,
        count: outcomes.length,
        value: outcomes[0].value,
      })),
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
        outcomes.unshift({
          name: `${type}${subtype}`,
          value: this.value(type * 10 + subtype, true),
        });
      }
    }
    Object.defineProperty(this, "possibleOutcomes", { value: outcomes });
    return this.possibleOutcomes;
  }
  simulateDice() {
    return sample([1, 2, 3, 4, 5, 6]) * 10 + sample([1, 2, 3, 4, 5, 6, 7, 8]);
  }
  static ignore(xml) {
    // Just guessing at this
    if (
      xml.ResultType != 2 &&
      xml.SubResultType != 1 &&
      // Replay Coach-551-9619f4910217db1915282ea2242c819f_2016-04-07_00_05_06, Furry Bears turn 8 crowdsurf injury, shouldn't be ignored
      xml.SubResultType != 12
    ) {
      console.warn("Ignoring casualty roll, should verify", { roll: this });
      return true;
    }
    return super.ignore(xml);
  }
}

class NoValueRoll extends Roll {
  static ignore(xml) {
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
  54: FireballRoll,
  55: LightningBoltRoll,
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
// TODO: Parse Kickoff events
// TODO: Parse Kickoff events
