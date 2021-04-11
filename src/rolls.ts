import {
  SKILL_NAME,
  SKILL,
  SITUATION,
  ROLL_STATUS,
  RESULT_TYPE,
  SUB_RESULT_TYPE,
  ACTION_TYPE,
  BLOCK,
  BLOCK_DIE,
  PLAYER_TVS,
  SKILL_CATEGORY,
  getPlayerType,
  STAR_NAMES,
  KICKOFF_RESULT,
  KICKOFF_RESULT_NAMES,
  ROLL,
  PLAYER_TYPE,
  SIDE,
  PlayerTV
} from './constants.js';
import { translateStringNumberList, ensureList, ReplayPosition, REPLAY_SUB_STEP, REPLAY_KEY } from './replay-utils.js';
import {
  SingleValue,
  SimpleDistribution,
  SumDistribution,
  MinDistribution,
  MaxDistribution,
  Distribution
} from './distribution.js';
import * as BB2 from './replay/BB2.js';
import _ from 'underscore';
import parser from 'fast-xml-parser';
import he from 'he';
import { assembleParameterSignals } from 'vega-lite/build/src/parameter';

// TODO: Switch over to using dice.js for better clarity

function sample<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function decayedHalfTurns(halfTurns: number): number {
  return halfTurns;
  var decayedTurns = 0;
  for (var turn = 0; turn < halfTurns; turn++) {
    decayedTurns += 0.9 ** turn;
  }
  return decayedTurns;
}

function manhattan(a:BB2.Cell, b:BB2.Cell): number {
  return Math.max(
    Math.abs((a.x || 0) - (b.x || 0)),
    Math.abs((a.y || 0) - (b.y || 0))
  );
}

function ballPositionValue(team: Team, cell: BB2.Cell): SingleValue {
  var distToGoal;
  if (team.id == 0) {
    distToGoal = 25 - (cell.x || 0);
  } else {
    distToGoal = (cell.x || 0);
  }
  var distValue;
  if (distToGoal == 0) {
    distValue = 1;
  } else {
    distValue = .5 * (0.85 ** (distToGoal - 1));
  }
  return new SingleValue(`${distToGoal} to goal`, distValue);
}

const POINT = {
  Actual: 'actual',
  Simulated: 'simulated',
}

class Player {
  team: Team;
  playerState;
  name: string;
  id: number;
  playerType: PLAYER_TYPE;
  cell: BB2.Cell;
  situation: SITUATION;
  canAct: boolean;
  skills: SKILL[];
  isBallCarrier: boolean;

  constructor(team, playerState, boardState) {
    this.team = team;
    this.id = playerState.Data.Id;
    this.playerType = getPlayerType(playerState.Data.IdPlayerTypes);
    this.name = he.decode(playerState.Data.Name.toString().replace(/\[colour='[0-9a-f]{8}'\]/i, '').toString());
    this.name = STAR_NAMES[this.name] || this.name;
    this.cell = playerState.Cell;
    this.situation = playerState.Situation;
    this.playerState = playerState;
    this.canAct =
      playerState.CanAct == 1 && this.situation === SITUATION.Active;
    this.skills =
      translateStringNumberList(playerState.Data.ListSkills) || [];
    this.isBallCarrier = manhattan(boardState.Ball.Cell, this.cell) == 0 && boardState.Ball.IsHeld == 1;
  }

  get skillNames() {
    return this.skills.map((skill) => SKILL_NAME[skill]);
  }

  get tv() {
    let playerTV = PLAYER_TVS.get(this.playerType);
    if (playerTV.star === true) {
      return playerTV.tv;
    } else {
      let { tv, normals, doubles, free } = playerTV;
      this.skills.forEach(skill => {
        if (free.includes(skill)) {
          return;
        } else if (doubles.includes(SKILL_CATEGORY[skill])) {
          tv += 30;
        } else if (normals.includes(SKILL_CATEGORY[skill])) {
          tv += 20;
        } else if ([SKILL.IncreaseMovement, SKILL.IncreaseArmour].includes(skill)) {
          tv += 30;
        } else if (skill == SKILL.IncreaseAgility) {
          tv += 40;
        } else if (skill == SKILL.IncreaseStrength) {
          tv += 50;
        }
      })
      return tv;
    }
  }
}

class Team {
  players: Player[];
  name: string;
  id: SIDE;
  turn: number;
  fame: number
  teamState: BB2.TeamState;
  blitzerId: number;

  constructor(teamState, boardState) {
    this.players = teamState.ListPitchPlayers.PlayerState.map(
      (playerState) => new Player(this, playerState, boardState)
    );
    this.name = he.decode(teamState.Data.Name.toString());
    this.id = teamState.Data.TeamId || 0;
    this.turn = teamState.GameTurn || 1;
    this.fame = teamState.Fame || 0;
    this.teamState = teamState;
    this.blitzerId = teamState.BlitzerId;
  }

  get shortName() {
    return this.name
      .split(/\s+/)
      .map((word) => word[0])
      .join('');
  }
}

interface BoardStateArgs {
  teams: Team[],
  activeTeamId: number,
  ballCell: BB2.Cell
}

class BoardState {
  ballCell: BB2.Cell;
  teams: Team[];
  activeTeamId: number;
  activeTeam: Team;
  turn: number;
  replayStep: number;
  action: number;

  constructor({ teams, activeTeamId, ballCell }: BoardStateArgs) {
    this.teams = teams;
    this.activeTeam =
      teams.filter((team) => team.id == activeTeamId)[0] || teams[0];
    this.turn = (this.activeTeam && this.activeTeam.turn) || 0;
    this.ballCell = ballCell;
  }
  static argsFromXml(boardState: BB2.BoardState) {
    let teams = boardState.ListTeams.TeamState.map(
      (teamState) => new Team(teamState, boardState)
    );
    let activeTeamId = boardState.ActiveTeam || 0;
    let args = {
      teams,
      activeTeamId,
      ballCell: boardState.Ball.Cell,
    }
    return args;
  }

  playerById(playerId: BB2.PlayerId): Player {
    for (var team of this.teams) {
      for (var player of team.players) {
        if (player.id === playerId) {
          return player;
        }
      }
    }
  }

  playerAtPosition(cell: BB2.Cell): Player {
    for (var team of this.teams) {
      for (var player of team.players) {
        if ((player.cell.x || 0) === (cell.x || 0) && (player.cell.y || 0) === (cell.y || 0)) {
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

interface RollArgs<Dice> {
  initialBoardState: BoardState,
  finalBoardState: BoardState,
  skillsInEffect: BB2.SkillInfo[],
  rollStatus: ROLL_STATUS,
  activePlayer: Player,
  rollType: ROLL,
  dice: Dice[]
  unhandledSkills: BB2.SkillInfo[],
  ignore: boolean,
  actionType: ACTION_TYPE,
  resultType: RESULT_TYPE,
  subResultType: SUB_RESULT_TYPE,
  startIndex: ReplayPosition,
  isReroll: boolean,
  gameLength: number,
  rolls?: Roll<any>[],
}

interface RollXML<A extends BB2.ResultsAction<R>, R> {
  replay: BB2.Replay,
  initialBoard: BB2.BoardState,
  action: A,
  actionIndex: number,
  boardActionResult: R,
  resultIndex: number,
  replayStep: BB2.ReplayStep,
  stepIndex: number,
  gameLength: number,
}


export class Roll<Dice> {
  _futurePlayerValue: Record<number, Distribution>;
  activePlayer: Player;
  armorRollCache: Record<string, ArmorRoll>;
  dependentIndex?: number;
  dependentOn?: Roll<any>;
  dependentRolls: Roll<any>[];
  dice: Dice[];
  finalBoardState: BoardState;
  gameLength: number;
  initialBoardState: BoardState;
  isReroll: boolean;
  onTeamValues: Record<number, Distribution>;
  rollIndex: number;
  rolls: Roll<any>[];
  rollStatus: ROLL_STATUS;
  rollType: ROLL;
  skillsInEffect: BB2.SkillInfo[];
  startIndex: ReplayPosition;
  endIndex?: ReplayPosition;
  unhandledSkills: BB2.SkillInfo[];
  get rollName() { return `Unnamed Roll ${this.constructor.name}`; }
  static handledSkills = [];
  get diceSeparator() { return ', '; }
  static hideDependents = false;
  get dependentConditions() {return [];}

  constructor(attrs: RollArgs<Dice>) {
    Object.assign(this, attrs);

    this.onTeamValues = {};
    this.armorRollCache = {};
    this.dependentRolls = [];
    this._futurePlayerValue = {};

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

  static argsFromXml(xml: RollXML<BB2.PlayerAction & BB2.Action, BB2.BoardActionResult>): RollArgs<any> {

    const initialBoardState = new BoardState(BoardState.argsFromXml(xml.initialBoard));
    const activePlayerId = xml.action.PlayerId;

    const skillsInEffect = xml.boardActionResult.CoachChoices.ListSkills != "" ? ensureList(
      xml.boardActionResult.CoachChoices.ListSkills.SkillInfo
    ): [];
    let rollStatus, rollType;
    if (BB2.isDiceRollResult(xml.boardActionResult)) {
      rollStatus = xml.boardActionResult.RollStatus;
      rollType = xml.boardActionResult.RollType;
    }

    return {
      initialBoardState,
      skillsInEffect,
      rollStatus,
      finalBoardState: new BoardState(BoardState.argsFromXml(xml.replayStep.BoardState)),
      activePlayer: initialBoardState.playerById(activePlayerId),
      rollType,
      dice: this.dice(xml.boardActionResult),
      unhandledSkills: skillsInEffect.filter(
        (skillInfo: BB2.SkillInfo) => !this.handledSkills.includes(skillInfo.SkillId)
      ),
      ignore: this.ignore(xml),
      actionType: xml.action.ActionType,
      resultType: xml.boardActionResult.ResultType,
      subResultType: xml.boardActionResult.SubResultType,
      startIndex: new ReplayPosition(xml.stepIndex, REPLAY_SUB_STEP.BoardAction, xml.actionIndex, xml.resultIndex),
      isReroll: [
        ROLL_STATUS.RerollTaken,
        ROLL_STATUS.RerollWithSkill,
        ROLL_STATUS.RerollWithSkillChoice,
        ROLL_STATUS.RerollWithFailedOutcome
      ].includes(rollStatus),
      gameLength: xml.gameLength,
    };
  }

  get nextRoll() {
    if (this.dependentRolls.length > 0) {
      return this.dependentRolls[0];
    } else if (this.dependentOn) {
      return this.dependentOn.dependentRolls[this.dependentIndex + 1];
    }
  }

  get improbability() {
    return 0;
  }

  get activeTeam() {
    return this.finalBoardState.activeTeam;
  }

  get teams() {
    return this.finalBoardState.teams;
  }

  get turn() {
    return this.finalBoardState.turn;
  }

  get jointDescription() {
    return [this.description].concat(this.dependentRolls.map(roll => roll.shortDescription || roll.description)).join(" \u2192 ");
  }

  get description() {
    var activeSkills =
      this.activePlayer.skills.length > 0
        ? ` (${this.activePlayer.skillNames.join(', ')})`
        : '';
    return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name}${activeSkills} - ${this.dice}`;
  }

  get shortDescription() {
    return `${this.rollName}: ${this.activePlayer.name} - ${this.dice.join(this.diceSeparator)}`;
  }

  isDependentRoll(roll) {
    return this.dependentConditions.some(cond => cond(this, roll));
  }

  value(dice?: Dice[], expected?: boolean): Distribution | number {
    throw 'value must be defined by subclass';
  }
  get expectedValue() {
    return this.possibleOutcomes.expectedValue;
  }
  get _possibleOutcomes(): Distribution {
    throw `_possibleOutcomes must be defined by subclass ${this.constructor.name}`;
  }

  get possibleOutcomes() {
    Object.defineProperty(this, 'possibleOutcomes', { value: this._possibleOutcomes });
    return this.possibleOutcomes;
  }

  simulateDice() {
    throw 'simulateDice must be defined by subclass';
  }

  static ignore(xml) {
    if (xml.boardActionResult.RollStatus == ROLL_STATUS.RerollNotTaken) {
      return true; // Didn't take an offered reroll, so ignore this roll in favor of the previous one
    }

    if (xml.boardActionResult.CoachChoices.ListDices === undefined) {
      return true;
    }

    return false;
  }

  static dice(boardActionResult) {
    return translateStringNumberList(
      boardActionResult.CoachChoices.ListDices
    );
  }

  get actualValue() {
    const outcomeValue = this.value(this.dice, false);
    if (!(outcomeValue instanceof Distribution)) {
      return new SingleValue(this.rollName, outcomeValue);
    } else {
      return outcomeValue;
    }
  }

  get valueWithDependents() {
    return this.actualValue.add(...this.dependentRolls.map(roll => roll.actualValue));
  }

  get actual() {
    var dataPoint = this.dataPoint(-1, POINT.Actual);
    return Object.assign(dataPoint, {
      turn: this.turn,
      player: (this.activePlayer && this.activePlayer.name) || '',
      playerSkills:
        (this.activePlayer &&
          this.activePlayer.skills.map((skill) => SKILL_NAME[skill])) ||
        [],
      rollName: this.rollName,
      dice: this.dice,
      outcomes: this.possibleOutcomes.flat.map(outcome => outcome.value),
      weights: this.possibleOutcomes.flat.map(outcome => outcome.weight),
      description: this.jointDescription,
      valueDescription: `${this.valueWithDependents.valueString} ${this.possibleOutcomes.valueString}`,
      improbability: this.dependentRolls.reduce((acc, roll) => acc + roll.improbability, this.improbability),
    });
  }
  simulated(iteration) {
    return this.dataPoint(
      iteration,
      POINT.Simulated,
    );
  }

  dataPoint(iteration, type) {
    var outcomeValue;
    if (type == POINT.Actual) {
      outcomeValue = this.valueWithDependents.singularValue;
    } else if (type == POINT.Simulated) {
      outcomeValue = this.possibleOutcomes.sample();
    }
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
      expectedValue: this.expectedValue,
      netValue: outcomeValue - this.expectedValue,
      rollIndex: this.rollIndex,
    };
  }

  static fromReplayStep(replay: BB2.Replay, initialBoard: BB2.BoardState, stepIndex: number, replayStep: BB2.ReplayStep) {
    if (replayStep[REPLAY_KEY.get(REPLAY_SUB_STEP.SetupAction)]) {
      return new SetupAction(SetupAction.argsFromXml({
        gameLength: Math.max(...replay.ReplayStep.flatMap(
          step => {
            if (!step.BoardState) {
              console.log(step);
              return [];
            }
            return [step.BoardState.ListTeams.TeamState[0].GameTurn, step.BoardState.ListTeams.TeamState[1].GameTurn];
          }
        )),
        initialBoard,
        stepIndex,
        replayStep,
        setupAction: replayStep[REPLAY_KEY.get(REPLAY_SUB_STEP.SetupAction)],
      }))
    }
    var rolls = [];

    var kickoff = replayStep.RulesEventKickOffTable;
    if (kickoff) {
      let kickoffRolls = Roll.fromKickoffEvent(replay, initialBoard, stepIndex, replayStep, kickoff);
      rolls.push(...kickoffRolls);
    }

    var actions = ensureList(replayStep.RulesEventBoardAction);
    for (var actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      var action = actions[actionIndex];
      rolls.push(
        ...Roll.fromAction(replay, initialBoard, stepIndex, replayStep, actionIndex, action)
      );
    }
    return rolls;
  }

  static fromAction(replay: BB2.Replay, initialBoard, stepIndex, replayStep, actionIndex, action) {
    var results = ensureList(action.Results.BoardActionResult);
    var rolls = [];
    for (var resultIndex = 0; resultIndex < results.length; resultIndex++) {
      var result = results[resultIndex];
      var roll = this.fromBoardActionResult(
        replay,
        initialBoard,
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
    replay,
    initialBoard,
    stepIndex: number,
    replayStep,
    actionIndex: number,
    action: BB2.RulesEventBoardAction,
    resultIndex,
    boardActionResult
  ) {
    var rollClass;
    if (boardActionResult.RollType === undefined) {
      if (action.ActionType === undefined) {
        rollClass = MoveAction;
      } else {
        rollClass = null;
      }
    } else {
      rollClass = ROLL_TYPES[boardActionResult.RollType];
    }
    if (rollClass === null) {
      return null;
    } else if (!rollClass) {
      return new UnknownRoll(`Unknown Roll ${boardActionResult.RollType}`, replayStep);
    } else if (typeof rollClass === "string") {
      return new UnknownRoll(rollClass, replayStep);
    } else {
      return new rollClass(
        rollClass.argsFromXml({
          replay,
          gameLength: Math.max(...replay.ReplayStep.flatMap(
            step => {
              if (!step.BoardState) {
                console.log(step);
                return [];
              }
              return [step.BoardState.ListTeams.TeamState[0].GameTurn, step.BoardState.ListTeams.TeamState[1].GameTurn];
            }
          )),
          initialBoard,
          stepIndex,
          replayStep,
          actionIndex,
          action,
          resultIndex,
          boardActionResult
        })
      );
    }
  }

  static fromKickoffEvent(
    replay: BB2.Replay,
    initialBoard: BB2.BoardState,
    stepIndex: number,
    replayStep: BB2.ReplayStep,
    kickoff: BB2.RulesEventKickOffTable
  ) {
    let kickoffRoll = new KickoffRoll(
      KickoffRoll.argsFromXml({
        replay,
        initialBoard,
        stepIndex,
        replayStep,
        kickoff
      })
    );
    let dice = kickoffRoll.dice;
    let diceSum = dice[0] + dice[1];
    let rollClass = KICKOFF_RESULT_TYPES[diceSum];
    let rolls: (Roll<any> | UnknownRoll)[] = [kickoffRoll];
    if (rollClass === null) {
    } else if (!rollClass) {
      rolls.push(new UnknownRoll(`Unknown Kickoff Event ${diceSum}`, replayStep));
    } else if (typeof rollClass === "string") {
      rolls.push(new UnknownRoll(rollClass, replayStep));
    } else if (kickoff.EventResults) {
      rolls.push(...ensureList(kickoff.EventResults.StringMessage).map(msg => {
        let messageData = parser.parse(he.decode(msg.MessageData), {
          ignoreAttributes: true,
        }) as BB2.KickoffEventMessageData;
        return new rollClass(
          rollClass.argsFromXml({
            replay,
            initialBoard,
            stepIndex,
            replayStep,
            kickoff,
            messageData
          })
        );
      }));
    }
    return rolls;
  }

  onActiveTeam(player) {
    return player.team.id === this.activeTeam.id;
  }

  playerValue(player) {
    var ballCell = this.initialBoardState.ballCell;
    if ((ballCell.x || 0) < 0 || (ballCell.y || 0) < 0) {
      return this.rawPlayerValue(player);
    }
    var distanceToBall = manhattan(ballCell, player.cell);
    if (distanceToBall == 0) {
      return this.rawPlayerValue(player).product(new SingleValue("On Ball", 2)).named(`PV(${player.name})`);
    } else if (distanceToBall == 1) {
      return this.rawPlayerValue(player).product(new SingleValue("By Ball", 1.5)).named(`PV(${player.name})`);
    } else {
      return this.rawPlayerValue(player);
    }
  }

  rawPlayerValue(player) {
    return new SingleValue(`TV(${player.name})`, player.tv);
  }

  teamValue(team, situations, includingPlayer) {
    return new SumDistribution(
      team.players
        .filter((player) => situations.includes(player.situation) || player.id == includingPlayer.id)
        .map((player) => this.playerValue(player)),
      `TV(${team.name})`
    );
  }

  get halfTurnsInGame() {
    // Return the number of half-turns left in the game
    var halfTurns = this.teams.map((team) => {
      if (this.turn <= 16) {
        return 16 - team.turn;
      } else {
        return 24 - team.turn;
      }
    });
    return halfTurns[0] + halfTurns[1];
  }

  get halfTurnsInHalf() {
    // Return the number of half-turns left in the game
    var halfTurns = this.teams.map((team) => {
      if (this.turn <= 8) {
        return 8 - team.turn;
      } else if (this.turn <= 16) {
        return 16 - team.turn;
      } else {
        return Math.min(24, this.gameLength) - team.turn;
      }
    });
    return halfTurns[0] + halfTurns[1] + 1;
  }

  stunTurns(player) {
    return Math.min(
      this.onActiveTeam(player) ? 4 : 3,
      this.halfTurnsInHalf
    );
  }

  kdTurns(player) {
    return Math.min(
      this.onActiveTeam(player) ? 2 : 1,
      this.halfTurnsInHalf
    );
  }

  onTeamValue(player): Distribution {
    // The fraction of the teams on-pitch players that this player represents.
    return (
      this.onTeamValues[player.id] || (
        this.onTeamValues[player.id] = (
          this.playerValue(player).divide(
            this.teamValue(
              player.team,
              [SITUATION.Active, SITUATION.Reserves, SITUATION.KO],
              player
            ).named('Players on Team')
            // Scale players by the difference between a full team scoring 1.5 points per game
            // and pitch-cleared opponent scoring 16 points per game
          ).product(6.5 / 32).named(player.name)
        )
      )
    );
  }

  armorRoll(player, damageBonusActive) {
    damageBonusActive = damageBonusActive || false;
    let key = `${player.id}-${damageBonusActive}`;
    return (
      this.armorRollCache[key] ||
      (this.armorRollCache[key] = new ArmorRoll({
        initialBoardState: this.initialBoardState,
        finalBoardState: this.finalBoardState,
        activePlayer: player,
        modifier: damageBonusActive ? 1 : 0,
        damageBonusActive,
        isFoul: false,
        canPileOn: false,
        isPileOn: false,
        target: undefined,
        skillsInEffect: [],
        rollStatus: undefined,
        rollType: ROLL.Armor,
        dice: [1, 1],
        unhandledSkills: [],
        ignore: false,
        actionType: undefined,
        resultType: undefined,
        subResultType: undefined,
        startIndex: this.startIndex,
        isReroll: false,
        gameLength: this.gameLength,
        rolls: this.rolls,
      }))
    );
  }

  knockdownValue(player, includeExpectedValues = false, damageBonusActive = false) {
    // Return the number of half-turns the player is unavailable times the
    // fraction of current team value it represents
    const playerValue = this.onTeamValue(player);
    var turnsMissing = this.kdTurns(player);
    var tdTurnsMissing = decayedHalfTurns(turnsMissing);
    var scalingFactors = [new SingleValue(`TDT(${turnsMissing / 2})`, tdTurnsMissing)];
    if (this.onActiveTeam(player)) {
      scalingFactors.push(new SingleValue('On Active Team', -1));
    }
    var result = playerValue.product(...scalingFactors).named(`KD(${player.name})`);
    if (includeExpectedValues) {
      result = result.add(this.armorRoll(player, damageBonusActive).possibleOutcomes.named('Armor Roll'));
    }
    return result;
  }

  stunValue(player) {
    // Return the number of half-turns the player is unavailable times the
    // fraction of current team value it represents
    var playerValue = this.onTeamValue(player);
    var turnsMissing = this.stunTurns(player);
    var tdTurnsMissing = decayedHalfTurns(turnsMissing);
    var scalingFactors = [new SingleValue(`TDT(${turnsMissing / 2})`, tdTurnsMissing)];
    if (this.onActiveTeam(player)) {
      scalingFactors.push(new SingleValue('On Active Team', -1));
    }

    return playerValue.product(...scalingFactors).named(`STUN(${player.name})`);
  }

  koValue(player) {
    const playerValue =
      this.onTeamValue(player)
    let turnsInGame = this.halfTurnsInGame;
    let turnsInHalf = this.halfTurnsInHalf;
    let wakeUpChance = (3 + (player.team.teamState.Babes || 0)) / 6;
    let wakeUpTurns = wakeUpChance * turnsInHalf + (1 - wakeUpChance) * turnsInGame;
    let stunTurns = this.stunTurns(player);
    let turns = wakeUpTurns - stunTurns;
    let decayedTurns = decayedHalfTurns(wakeUpTurns) - decayedHalfTurns(stunTurns);

    let scalingFactors = [
      new SingleValue(
        `TDT(${turns})`,
        decayedTurns
      )
    ];
    if (this.onActiveTeam(player)) {
      scalingFactors.push(new SingleValue('On Active Team', -1));
    }

    return playerValue.product(...scalingFactors).named(`KO(${player.name})`);
  }

  casValue(player) {
    const gameValue = this.onTeamValue(player).product(
      new SingleValue(`TDT(${this.halfTurnsInGame / 2})`, decayedHalfTurns(this.halfTurnsInGame))
    );
    const playerValue = gameValue.named(`PV(${player.name})`);

    var scalingFactors = [];
    if (this.onActiveTeam(player)) {
      scalingFactors.push(new SingleValue('On Active Team', -1));
    }
    return playerValue.product(...scalingFactors).subtract(this.stunValue(player)).named(`CAS(${player.name})`);
  }

  get dependentMoveValues() {
    const dependentMoves = this.dependentRolls.filter(
      roll => roll instanceof MoveAction
    );
    if (dependentMoves.length > 0) {
      return new SumDistribution(
        dependentMoves.map(roll => roll.value()),
        "Following Moves"
      );
    } else {
      return null;
    }
  }

  get unactivatedPlayers() {
    Object.defineProperty(this, 'unactivatedPlayers', {
      value: this.activeTeam.players.filter((player) => player.canAct)
    });
    return this.unactivatedPlayers;
  }

  futurePlayerValue(player) {
    let cachedValue = this._futurePlayerValue[player.id];
    if (cachedValue) {
      return cachedValue;
    }

    let futureActions = this.rolls.filter(
      roll => (
        roll.startIndex.after(this.startIndex) &&
        roll.activePlayer &&
        roll.activePlayer.id == player.id &&
        roll.turn == this.turn
      )
    );

    let result;
    if (futureActions.length) {
      result = futureActions.reduce((sum, roll) => sum + roll.expectedValue, 0);
    } else {
      result = this.onTeamValue(player);
    }
    this._futurePlayerValue[player.id] = result;
    return new SingleValue(`Remaining Turn ${this.turn} value for ${player.name}`, result);
  }

  get turnoverValue() {
    // futurePlayerValue == EV of all further player actions in the turn, or an estimate if the player didn't get to act
    const playerValues = this.unactivatedPlayers.map(player => this.futurePlayerValue(player));
    var value;
    if (playerValues.length > 0) {
      value = new SumDistribution(playerValues).named('Unactivated FPV').product(-1).named('Turnover');
    } else {
      value = new SingleValue("No Active Players", 0);
    }
    Object.defineProperty(this, 'turnoverValue', { value: value });
    return this.turnoverValue;
  }

  get rerollValue() {
    return new SingleValue("Reroll", 0);
  }
}


function pushOrFollow(roll, dependent) {
  return [PushChoice, FollowUpChoice].includes(
    dependent.constructor
  );
}

function nonFoulDamage(roll, dependent) {
  return (
    [ArmorRoll, InjuryRoll, CasualtyRoll].includes(dependent.constructor) && // Include following armor/injury/cas rolls
    !dependent.isFoul
  );
}

function foulDamage(roll, dependent) {
  return roll.isFoul && ((
    [InjuryRoll, CasualtyRoll].includes(dependent.constructor) && dependent.isFoul && dependent.activePlayer.id == roll.activePlayer.id) || dependent.constructor == FoulPenaltyRoll)
}

function reroll(roll, dependent) {
  return (
    dependent.rollType === roll.rollType &&
    [
      ROLL_STATUS.RerollTaken,
      ROLL_STATUS.RerollWithSkill,
      ROLL_STATUS.RerollWithSkillChoice,
      ROLL_STATUS.RerollWithFailedOutcome
    ].includes(
      dependent.rollStatus
    )
  );
}

function sameTeamMove(roll, dependent) {
  return (
    dependent.constructor == MoveAction && roll.activeTeam.id == dependent.activeTeam.id
  )
}

function setup(roll, dependent) {
  return (
    dependent instanceof SetupAction
  )
}

function samePlayerMove(roll, dependent) {
  return (
    dependent.constructor == MoveAction && roll.activePlayer.id == dependent.activePlayer.id
  )
}

function catchOrInterception(roll, dependent) {
  return [CatchRoll, InterceptionRoll].includes(dependent.constructor);
}

interface BlockRollArgs extends RollArgs<BLOCK> {
  isRedDice: boolean,
  attacker: Player,
  defender: Player,
  isBlitz: boolean,
}

export class BlockRoll extends Roll<BLOCK> {
  isRedDice: boolean;
  attacker: Player;
  defender: Player;
  isBlitz: boolean;
  get rollName() { return "Block"; }
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
  get diceSeparator() { return '/'; }
  get dependentConditions() { return [pushOrFollow, nonFoulDamage, reroll, samePlayerMove]; }

  static argsFromXml(xml: RollXML<BB2.BlockAction, BB2.BlockResult>): BlockRollArgs {
    let args = super.argsFromXml(xml);
    let isRedDice = false;
    if (BB2.isDiceRollResult(xml.boardActionResult)) {
      isRedDice = xml.boardActionResult.Requirement < 0;
    }
    return {
      ...args,
      isRedDice,
      attacker: args.activePlayer,
      defender: args.finalBoardState.playerAtPosition(
        xml.action.Order.CellTo.Cell
      ),
      isBlitz: args.activePlayer.team.blitzerId == args.activePlayer.id,
    }
  }

  static dice(boardActionResult) {
    var dice = super.dice(boardActionResult);
    // Block dice are doubled up, only use the first half of the dice list.
    return dice.slice(0, dice.length / 2).map(face => BLOCK_DIE[face]);
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
      }${defenderSkills} - ${this.dice.join(this.diceSeparator)}${uphill}`;
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
    if (xml.boardActionResult.SubResultType == SUB_RESULT_TYPE.ChoiceUseDodgeTackle) {
      // Opponent picking whether to activate tackle
      return true;
    }

    return super.ignore(xml);
  }

  dieValue(result, expected) {
    const attacker = this.attacker;
    const defender = this.defender;
    var attackerSkills = attacker.skills;
    var defenderSkills = defender.skills;

    switch (result) {
      case BLOCK.AttackerDown:
        return this.knockdownValue(attacker, expected, defenderSkills.includes(SKILL.MightyBlow)).add(
          this.turnoverValue,
        );
      case BLOCK.BothDown:

        const aBlock = attackerSkills.includes(SKILL.Block);
        const dBlock = defenderSkills.includes(SKILL.Block);

        var aOptions = [];
        if (attackerSkills.includes(SKILL.Wrestle)) {
          const wrestleDown = this.knockdownValue(defender, false).add(
            this.knockdownValue(attacker, false)
          );
          aOptions.push(wrestleDown);
        }
        if (attackerSkills.includes(SKILL.Juggernaut) && this.isBlitz) {
          const push = this.knockdownValue(
            defender, false
          ).product(
            new SingleValue('Push', 0.33)
          ).named(
            `Push(${defender.name})`
          ).add(expected ? this.dependentMoveValues : null);
          aOptions.push(push);
        }
        var dOptions = [];
        if (defenderSkills.includes(SKILL.Wrestle)) {
          const wrestleDown = this.knockdownValue(defender, false).add(
            this.knockdownValue(attacker, false)
          );
          dOptions.push(wrestleDown);
        }

        var base;
        if (aBlock && dBlock) {
          const blockBlock = new SingleValue('Block/Block', 0).add(expected ? this.dependentMoveValues : null);
          base = blockBlock;
        } else if (aBlock) {
          const defDown = this.knockdownValue(defender, expected, attackerSkills.includes(SKILL.MightyBlow)).add(expected ? this.dependentMoveValues : null);
          base = defDown;
        } else if (dBlock) {
          const attDown = this.knockdownValue(attacker, expected, defenderSkills.includes(SKILL.MightyBlow));
          base = attDown;
        } else {
          const bothDown = this.knockdownValue(defender, expected, attackerSkills.includes(SKILL.MightyBlow)).add(
            this.knockdownValue(attacker, expected, defenderSkills.includes(SKILL.MightyBlow)),
            this.turnoverValue
          );
          base = bothDown;
        }

        return base.min(...dOptions).max(...aOptions);
      case BLOCK.Push:
        return (
          defenderSkills.includes(SKILL.StandFirm)
            ? new SingleValue('Stand Firm', 0)
            : this.knockdownValue(defender, false).product(new SingleValue('Push', 0.33)).named(`Push(${defender.name})`)
        ).add(expected ? this.dependentMoveValues : null);
      case BLOCK.DefenderStumbles:
        if (
          defenderSkills.includes(SKILL.Dodge) &&
          !attackerSkills.includes(SKILL.Tackle)
        ) {
          return (
            defenderSkills.includes(SKILL.StandFirm)
              ? new SingleValue('Stand Firm', 0)
              : this.knockdownValue(defender, false).product(new SingleValue('Push', 0.33)).named(`Push(${defender.name})`)
          ).add(expected ? this.dependentMoveValues : null);
        } else {
          return this.knockdownValue(defender, expected, attackerSkills.includes(SKILL.MightyBlow)).add(expected ? this.dependentMoveValues : null);
        }
      case BLOCK.DefenderDown:
        return this.knockdownValue(defender, expected, attackerSkills.includes(SKILL.MightyBlow)).add(expected ? this.dependentMoveValues : null);
    }
  }

  value(dice, expected): Distribution {
    if (
      this.dependentRolls.length > 0 &&
      this.dependentRolls[0].rollType == this.rollType &&
      this.dependentRolls[0].rollStatus == ROLL_STATUS.RerollTaken
    ) {
      return this.rerollValue;
    }
    var possibilities = dice
      .filter((value, index, self) => self.indexOf(value) === index)
      .map((die) => this.dieValue(die, expected));
    if (possibilities.length == 1) {
      return possibilities[0];
    } else if (this.isRedDice) {
      var [first, ...rest] = possibilities;
      return first.min(...rest);
    } else {
      var [first, ...rest] = possibilities;
      return first.max(...rest);
    }
  }

  get improbability() {
    let bothDownSafe = this.attacker.skills.includes(SKILL.Block) || this.attacker.skills.includes(SKILL.Wrestle);
    let unsafeFaces = [BLOCK.AttackerDown, BLOCK.BothDown];
    if (bothDownSafe) {
      unsafeFaces = [BLOCK.AttackerDown];
    }
    var pass, passChance;
    if (this.isRedDice) {
      pass = !this.dice.some(face => unsafeFaces.includes(face));
      passChance = 1 - ((1 - ((6 - unsafeFaces.length) / 6)) ** this.dice.length);
    } else {
      pass = !this.dice.every(face => unsafeFaces.includes(face));
      passChance = ((6 - unsafeFaces.length) / 6) ** this.dice.length;
    }
    return (pass ? 1 : 0) - passChance;
  }

  get _possibleOutcomes() {
    var value;
    const blockDie = new SimpleDistribution([
      { name: BLOCK.Push, weight: 1 / 3, value: this.dieValue(BLOCK.Push, true) },
      { name: BLOCK.AttackerDown, weight: 1 / 6, value: this.dieValue(BLOCK.AttackerDown, true) },
      { name: BLOCK.DefenderDown, weight: 1 / 6, value: this.dieValue(BLOCK.DefenderDown, true) },
      { name: BLOCK.DefenderStumbles, weight: 1 / 6, value: this.dieValue(BLOCK.DefenderStumbles, true) },
      { name: BLOCK.BothDown, weight: 1 / 6, value: this.dieValue(BLOCK.BothDown, true) },
    ])
    if (this.dice.length == 1) {
      value = blockDie;
    } else if (this.isRedDice) {
      value = new MinDistribution(new Array(this.dice.length).fill(blockDie));
    } else {
      value = new MaxDistribution(new Array(this.dice.length).fill(blockDie));
    }
    return value;
  }

  simulateDice() {
    return this.dice.map(() =>
      sample([
        BLOCK.AttackerDown,
        BLOCK.BothDown,
        BLOCK.Push,
        BLOCK.Push,
        BLOCK.DefenderStumbles,
        BLOCK.DefenderDown
      ])
    );
  }
}

class FansRoll extends Roll<number> {
  get rollName() { return "Fans"; }
  // TODO: Need to capture both teams rolls, because result is about comparison.
}

interface ModifiedD6SumRollArgs extends RollArgs<number> {
  target: number,
  modifier: number,
}


export class ModifiedD6SumRoll extends Roll<number> {
  target: number;
  modifier: number;
  get computedTarget() { return 0; }
  get computedModifier() { return 0; }
  get numDice() { return 1 };
  get diceSeparator() { return '+' }
  get rerollSkill() { return undefined; }
  get rerollCancelSkill() { return undefined; }
  get dependentConditions() { return [reroll, samePlayerMove]; }

  constructor(args: ModifiedD6SumRollArgs) {
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
      this.dice === undefined || this.numDice == this.dice.length,
      'Mismatch in number of dice (%d) and expected number of dice (%d)',
      this.dice && this.dice.length,
      this.numDice,
      this
    );
  }

  static argsFromXml(xml: RollXML<any, BB2.DiceRollResult>): ModifiedD6SumRollArgs {
    return {
      ...super.argsFromXml(xml),
      modifier: (
        xml.boardActionResult.ListModifiers == ""
        ? []
        : ensureList(xml.boardActionResult.ListModifiers.DiceModifier || [])
      ) .map((modifier) => modifier.Value || 0)
        .reduce((a, b) => a + b, 0) || 0,
      target: xml.boardActionResult.Requirement,
    }
  }

  get description() {
    var activeSkills =
      this.activePlayer.skills.length > 0
        ? ` (${this.activePlayer.skillNames})`
        : '';
    return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name}${activeSkills} - ${this.dice} (${this.modifiedTarget})`;
  }

  get shortDescription() {
    return `${this.rollName}: ${this.activePlayer.name} - ${this.dice.reduce((a, b) => a + b)} (${this.modifiedTarget})`;
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
    if (this.numDice == 1) {
      return Math.min(6, Math.max(2, target));
    } else {
      return target;
    }
  }

  get improbability() {
    let { pass, fail } = this.diceSums.reduce((acc, sum) => {
      if (sum >= this.modifiedTarget) {
        acc.pass += 1;
      } else {
        acc.fail += 1;
      }
      return acc;
    }, { pass: 0, fail: 0 });
    let passChance = pass / (pass + fail);
    let passed = this.dice.reduce((a, b) => a + b) >= this.modifiedTarget;
    return (passed ? 1 : 0) - passChance;
  }

  get diceSums() {
    var diceSums = [0];
    for (var die = 0; die < this.numDice; die++) {
      var newSums = [];
      for (var face = 1; face <= 6; face++) {
        for (const sum of diceSums) {
          newSums.push(sum + face);
        }
      }
      diceSums = newSums;
    }
    diceSums.sort((a, b) => a - b);
    Object.defineProperty(this, 'diceSums', { value: diceSums });
    return diceSums;
  }

  value(dice, expected): Distribution {
    let rollTotal = dice.reduce((a, b) => a + b, 0);
    if (rollTotal >= this.modifiedTarget) {
      return this.passValue(expected, rollTotal, this.modifiedTarget).add(expected ? this.dependentMoveValues : null);
    } else if (
      this.nextRoll &&
      this.nextRoll.constructor == this.constructor &&
      this.nextRoll.isReroll
    ) {
      return new SingleValue(`Rerolled ${this.rollName}`, this.rerollValue);
    } else {
      return this.failValue(expected, rollTotal, this.modifiedTarget);
    }
  }
  get _possibleOutcomes() {
    var sumsByOutcome = this.diceSums.reduce((acc, sum) => {
      let value;
      if (sum >= this.modifiedTarget) {
        value = this.passValue(true, sum, this.modifiedTarget).add(this.dependentMoveValues);
      } else {
        value = this.hasSkillReroll ? this.reroll.possibleOutcomes : this.failValue(true, sum, this.modifiedTarget)
      }
      if (acc.length == 0) {
        acc.push({
          min: sum,
          max: sum,
          count: 1,
          value
        })
      } else {
        var lastValue = acc[acc.length - 1];
        if (lastValue.value.valueOf() == value.valueOf()) {
          if (sum == lastValue.min - 1) {
            lastValue.min = sum;
            lastValue.count += 1;
          } else if (sum == lastValue.max + 1) {
            lastValue.max = sum;
            lastValue.count += 1;
          } else if (sum >= lastValue.min && sum <= lastValue.max) {
            lastValue.count += 1;
          } else {
            acc.push({
              min: sum,
              max: sum,
              count: 1,
              value
            })
          }
        } else {
          acc.push({
            min: sum,
            max: sum,
            count: 1,
            value
          })
        }
      }
      return acc;
    }, []);

    var outcomes = sumsByOutcome.map(outcome => {
      return {
        name: outcome.min === outcome.max ? outcome.min.toString() : `${outcome.min}-${outcome.max}`,
        value: outcome.value,
        weight: outcome.count / this.diceSums.length
      }
    });
    return new SimpleDistribution(outcomes);
  }
  get reroll() {
    const reroll = new (this.constructor as any)({
      ...this,
      rollStatus: ROLL_STATUS.RerollWithSkill
    });
    Object.defineProperty(this, 'reroll', { value: reroll });
    return this.reroll;

  }
  get hasSkillReroll() {
    return this.activePlayer.skills.includes(this.rerollSkill) &&
      !this.skillsInEffect.map(info => info.SkillId).includes(this.rerollCancelSkill) &&
      ![ROLL_STATUS.RerollWithSkill, ROLL_STATUS.RerollTaken].includes(this.rollStatus);
  }
  simulateDice() {
    return this.dice.map(() => sample([1, 2, 3, 4, 5, 6]));
  }
  passValue(expected: boolean, rollTotal: number, modifiedTarget: number): Distribution {
    return new SingleValue("Pass", 0);
  }
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number): Distribution {
    return new SingleValue("Fail", 0);
  }
}

class PickupRoll extends ModifiedD6SumRoll {
  get rollName() { return "Pickup"; }
  get rerollSkill() { return SKILL.SureHands; }
  static handledSkills = [SKILL.SureHands, SKILL.BigHand, SKILL.ExtraArms];
  failValue(expected, rollTotal, modifiedTarget) {
    return this.turnoverValue;
  }
}

class BoneHeadRoll extends ModifiedD6SumRoll {
  get rollName() { return "Bone Head"; }
  static handledSkills = [SKILL.BoneHead];
  get dependentConditions() { return [reroll, samePlayerMove]; }
  failValue(expected, rollTotal, modifiedTarget) {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class ReallyStupidRoll extends ModifiedD6SumRoll {
  get rollName() { return "Really Stupid"; }
  static handledSkills = [SKILL.ReallyStupid];
  get dependentConditions() { return [reroll, samePlayerMove]; }
  failValue(expected, rollTotal, modifiedTarget) {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class FoulAppearanceRoll extends ModifiedD6SumRoll {
  get rollName() { return "Foul Appearance"; }
  static handledSkills = [SKILL.FoulAppearance];
  get dependentConditions() { return [reroll, samePlayerMove]; }
  failValue(expected, rollTotal, modifiedTarget) {
    return this.onTeamValue(this.activePlayer).product(-1);
  }
}

interface ArmorRollArgs extends ModifiedD6SumRollArgs {
  foulingPlayer?: Player,
  pilingOnPlayer?: Player,
  canPileOn: boolean,
  isFoul: boolean,
  isPileOn: boolean,
  damageBonusActive: boolean,
}

class ArmorRoll extends ModifiedD6SumRoll {
  foulingPlayer?: Player;
  pilingOnPlayer?: Player;
  canPileOn: boolean;
  isFoul: boolean;
  isPileOn: boolean;
  injuryRollCache: Map<string, InjuryRoll>;
  damageBonusActive: boolean;

  get numDice() { return 2; }
  static handledSkills = [SKILL.Claw, SKILL.MightyBlow, SKILL.DirtyPlayer, SKILL.PilingOn];
  get dependentConditions() { return [foulDamage]; }

  constructor(attrs: ArmorRollArgs) {
    super(attrs);
    this.injuryRollCache = new Map();
  }

  static argsFromXml(xml: RollXML<BB2.TakeDamageAction | BB2.FoulAction, BB2.DiceRollResult>): ArmorRollArgs {
    const args = super.argsFromXml(xml);

    let canPileOn, isPileOn, isFoul, foulingPlayer, pilingOnPlayer, damageBonusActive;

    if (args.rollType == ROLL.PileOnArmorRoll) {
      // The first time you see it, without an IsOrderCompleted, is the choice to use PileOn
      // The second time, with IsOrderComplete, is an actual PileOn (but there are no dice associated)
      // If there's no IsOrderComplete, then it will show up as a normal injury roll.
      canPileOn = xml.boardActionResult.IsOrderCompleted == undefined;
    }

    // An Armor PileOn has a IsOrderCompleted RollType 60 right before it
    if (xml.resultIndex == 0) {
      isPileOn = false;
    } else {
      var previousResult =
        xml.action.Results.BoardActionResult[xml.resultIndex - 1];
      isPileOn = previousResult.RollType == 59;
      if (isPileOn) {
        var previousSkills = ensureList(previousResult.CoachChoices.ListSkills.SkillInfo);
        pilingOnPlayer = args.finalBoardState.playerById(
          previousSkills.filter((skill) => skill.SkillId == SKILL.PilingOn)[0]
            .PlayerId
        );
      }
    }
    isFoul = xml.action.ActionType == ACTION_TYPE.Foul;
    if (isFoul) {
      // @ts-ignore
      foulingPlayer = args.finalBoardState.playerById(ensureList(xml.replayStep.RulesEventBoardAction)[0].PlayerId);
      damageBonusActive = foulingPlayer.skills.includes(SKILL.DirtyPlayer);
    }
    return {
      ...args,
      canPileOn,
      isPileOn,
      isFoul,
      foulingPlayer,
      pilingOnPlayer,
      damageBonusActive,
    };
  }

  get description() {
    if (this.isFoul) {
      var foulerSkills =
        this.foulingPlayer.skills.length > 0
          ? ` (${this.foulingPlayer.skillNames.join(', ')})` : '';
      var fouledSkills =
        this.activePlayer.skills.length > 0
          ? ` (${this.activePlayer.skillNames.join(', ')})`
          : '';
      return `${this.rollName}: [${this.foulingPlayer.team.shortName}] ${this.foulingPlayer.name
        }${foulerSkills} against ${this.activePlayer.name}${fouledSkills} - ${this.dice.join(this.diceSeparator)}`;
    } else {
      return super.description;
    }
  }

  get rollName() {
    if (this.isFoul) {
      return "Foul (Armor)";
    } else if (this.isPileOn) {
      return "Pile On (Armor)";
    } else {
      return "Armor";
    }
  }

  get computedTarget() {
    return this.activePlayer.playerState.Data.Av + 1;
  }

  get computedModifier() {
    return this.damageBonusActive ? 1 : 0;
  }

  injuryRoll(damageBonusAvailable: boolean, canPileOn: boolean, isFoul: boolean) {
    let key = `${damageBonusAvailable}-${canPileOn}-${isFoul}`;
    let result = this.injuryRollCache.get(key) ||
      (this.injuryRollCache.set(key, new InjuryRoll({
        initialBoardState: this.initialBoardState,
        finalBoardState: this.finalBoardState,
        activePlayer: this.activePlayer,
        modifier: damageBonusAvailable ? 1 : 0,
        skillsInEffect: [],
        canPileOn,
        isPileOn: false,
        isFoul: this.isFoul,
        foulingPlayer: this.foulingPlayer,
        rollStatus: undefined,
        rollType: undefined,
        dice: [],
        ignore: false,
        unhandledSkills: [],
        actionType: undefined,
        resultType: undefined,
        subResultType: undefined,
        startIndex: this.startIndex,
        isReroll: false,
        gameLength: this.gameLength,
        rolls: this.rolls,
      })).get(key));
    return result;
  }

  value(dice, expected): Distribution {
    var value = super.value(dice, expected);
    if (this.isFoul && dice[0] == dice[1]) {
      value = value.add(this.casValue(this.foulingPlayer).named('Sent Off'), this.turnoverValue);
    }
    return value;
  }

  passValue(expected, rollTotal, modifiedTarget) {
    let damageBonusAvailable = this.damageBonusActive;
    if (this.damageBonusActive && rollTotal == modifiedTarget) {
      damageBonusAvailable = false;
    }
    var injuredPlayerValue = this.stunValue(this.activePlayer).subtract(this.knockdownValue(this.activePlayer)); // Player is at least stunned = out for 2 turns
    if (expected) {
      injuredPlayerValue = injuredPlayerValue.add(this.injuryRoll(damageBonusAvailable, this.canPileOn && !this.isPileOn, this.isFoul).possibleOutcomes.named('Injury Roll'));
    }
    if (this.isPileOn) {
      const pileOnCost = this.knockdownValue(this.pilingOnPlayer, false);
      return injuredPlayerValue.add(pileOnCost);
    } else {
      return injuredPlayerValue;
    }
  }

  failValue(expected, rollTotal, modifiedTarget) {
    var value = new SingleValue('No Break', 0);
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      return value.add(this.knockdownValue(this.pilingOnPlayer, false));
    } else {
      return value;
    }
  }

  get improbability() {
    let { numBroke, numHeld } = this.diceSums.reduce((acc, sum) => {
      if (sum >= this.modifiedTarget) {
        acc.numBroke += 1;
      } else {
        acc.numHeld += 1;
      }
      return acc;
    }, { numBroke: 0, numHeld: 0 });
    if (this.onActiveTeam(this.activePlayer)) {
      let heldChance = numHeld / (numBroke + numHeld);
      let held = this.dice.reduce((a, b) => a + b) < this.modifiedTarget;
      return (held ? 1 : 0) - heldChance;
    } else {
      let brokeChance = numBroke / (numBroke + numHeld);
      let broke = this.dice.reduce((a, b) => a + b) >= this.modifiedTarget;
      return (broke ? 1 : 0) - brokeChance;
    }
  }
}

class WildAnimalRoll extends ModifiedD6SumRoll {
  get rollName() { return "Wild Animal"; }
  static handledSkills = [SKILL.WildAnimal];
  get dependentConditions() { return [reroll, samePlayerMove]; }
  failValue(expected, rollTotal, modifiedTarget) {
    // Failing Wild Animal means that this player is effectiFvely unavailable
    // for the rest of your turn, but is active on your opponents turn
    return this.onTeamValue(this.activePlayer).product(-1);
  }
}

class DauntlessRoll extends ModifiedD6SumRoll {
  get rollName() { return "Dauntless"; }
  static handledSkills = [SKILL.Dauntless];
}

interface MoveRollArgs extends ModifiedD6SumRollArgs {
  cellFrom: BB2.Cell,
  cellTo: BB2.Cell,
}

class DodgeRoll extends ModifiedD6SumRoll {
  cellFrom: BB2.Cell;
  cellTo: BB2.Cell;

  get rollName() { return "Dodge"; }
  static handledSkills = [SKILL.BreakTackle, SKILL.Stunty, SKILL.TwoHeads, SKILL.Dodge, SKILL.Tackle, SKILL.PrehensileTail, SKILL.DivingTackle];
  get rerollSkill() { return SKILL.Dodge; }
  get rerollCancelSkill() { return SKILL.Tackle; }
  get dependentConditions() { return [reroll, samePlayerMove, nonFoulDamage]; }

  static argsFromXml(xml: RollXML<BB2.MoveAction, BB2.DiceRollResult>): MoveRollArgs {
    let args = super.argsFromXml(xml);
    let target, modifier;
    if (
      [
        SUB_RESULT_TYPE.ChoiceUseDodgeTackle,
        SUB_RESULT_TYPE.ChoiceUseDodgeSkill
      ].includes(xml.boardActionResult.SubResultType)
    ) {
      // A dodge that fails in tackle and prompts for a team reroll doesn't have the requirement attached, so
      // pull them from the later roll
      let nextActions = ensureList(xml.replay.ReplayStep[xml.stepIndex + 1].RulesEventBoardAction)
      let nextResult = ensureList(nextActions[0].Results.BoardActionResult)[0] as BB2.DiceRollResult;
      target = nextResult.Requirement;
      modifier = (nextResult.ListModifiers == "" ? [] : ensureList(nextResult.ListModifiers.DiceModifier || []))
        .map((modifier) => modifier.Value || 0)
        .reduce((a, b) => a + b, 0) || 0;
    }
    return {
      ...args,
      cellFrom: xml.action.Order.CellFrom,
      cellTo: xml.action.Order.CellTo.Cell,
      target,
      modifier
    }
  }
  failValue(expected, rollTotal, modifiedTarget) {
    return this.knockdownValue(this.activePlayer, expected).add(this.turnoverValue);
  }
  passValue(expected, rollTotal, modifiedTarget) {
    if (this.activePlayer && this.activePlayer.isBallCarrier) {
      return ballPositionValue(this.activePlayer.team, this.cellTo).subtract(
        ballPositionValue(this.activePlayer.team, this.cellFrom)
      );
    } else {
      return new SingleValue("Dodge", 0);
    }
  }
}

class JumpUpRoll extends ModifiedD6SumRoll {
  get rollName() { return "Jump-Up"; }
  static handledSkills = [SKILL.JumpUp];
  failValue(expected, rollTotal, modifiedTarget) {
    // Jump Up failure means the block fails to activate, so the player is no longer
    // available for this turn.
    return this.onTeamValue(this.activePlayer).product(-1);
  }
}

class LeapRoll extends ModifiedD6SumRoll {
  cellFrom: BB2.Cell;
  cellTo: BB2.Cell;
  get rollName() { return "Leap"; }
  get dependentConditions() { return [reroll, samePlayerMove, nonFoulDamage]; }
  static argsFromXml(xml: RollXML<BB2.MoveAction, BB2.MoveResult>): MoveRollArgs {
    return {
      ...super.argsFromXml(xml),
      cellFrom: xml.action.Order.CellFrom,
      cellTo: xml.action.Order.CellTo.Cell,
    };
  }
  failValue(expected, rollTotal, modifiedTarget) {
    return this.knockdownValue(this.activePlayer).add(this.turnoverValue);
  }
  passValue(expected, rollTotal, modifiedTarget) {
    if (this.activePlayer && this.activePlayer.isBallCarrier) {
      return ballPositionValue(this.activePlayer.team, this.cellTo).subtract(
        ballPositionValue(this.activePlayer.team, this.cellFrom)
      );
    } else {
      return new SingleValue("Leap", 0);
    }
  }
}

class PassRoll extends ModifiedD6SumRoll {
  get rollName() { return "Pass"; }
  get rerollSkill() { return SKILL.Pass; }
  static handledSkills = [SKILL.Pass, SKILL.StrongArm, SKILL.Accurate];
  get dependentConditions() { return [catchOrInterception, samePlayerMove, reroll]; }
  failValue(expected, rollTotal, modifiedTarget) {
    // TODO: Failed pass doesn't turn over, it causes the ball to scatter. If it scatters to another
    // player, then it's not a turnover.
    // TODO: Account for fumbles.
    return this.turnoverValue;
  }
}

class ThrowTeammateRoll extends ModifiedD6SumRoll {
  get rollName() { return "Throw Teammate"; }
  static handledSkills = [SKILL.ThrowTeamMate];
  get dependentConditions() { return [samePlayerMove, reroll]; }
  failValue(expected, rollTotal, modifiedTarget) {
    // TODO: Throw teammate only turns over if the thrown player has the ball, and even then, only
    // TODO: Failed pass doesn't turn over, it causes the ball to scatter. If it scatters to another
    // player, then it's not a turnover.
    // TODO: Account for fumbles.
    return new SingleValue("Fail", 0);
  }

}

class InterceptionRoll extends ModifiedD6SumRoll {
  get rollName() { return "Intercept"; }
  static handledSkills = [SKILL.ExtraArms];
  // Interception rolls on the thrower, not the interceptee. If it "passes",
  // then the ball is caught
  passValue(expected, rollTotal, modifiedTarget) {
    return this.turnoverValue;
  }
}

class WakeUpRoll extends ModifiedD6SumRoll {
  get rollName() { return "Wake Up"; }
  constructor(attrs) {
    super(attrs);
    this.finalBoardState.activeTeam = this.activePlayer.team;
  }
  passValue(expected, rollTotal, modifiedTarget) {
    const playerValue =
      this.onTeamValue(this.activePlayer)
    let turnsInGame = this.halfTurnsInGame;

    let turnDecay = new SingleValue(
      `TDT(${turnsInGame})`,
      decayedHalfTurns(turnsInGame)
    );

    return playerValue.product(turnDecay).named(`WakeUp(${this.activePlayer.name})`);
  }
}

class GFIRoll extends ModifiedD6SumRoll {
  cellFrom: BB2.Cell;
  cellTo: BB2.Cell;
  get rollName() { return "GFI"; }
  static handledSkills = [SKILL.SureFeet];
  get rerollSkill() { return SKILL.SureFeet; }
  get dependentConditions() { return [nonFoulDamage, reroll, samePlayerMove]; }

  static argsFromXml(xml: RollXML<BB2.MoveAction, BB2.MoveResult>): MoveRollArgs {
    return {
      ...super.argsFromXml(xml),
      cellFrom: xml.action.Order.CellFrom,
      cellTo: xml.action.Order.CellTo.Cell,
    };
  }

  failValue(expected, rollTotal, modifiedTarget) {
    return this.knockdownValue(this.activePlayer, expected).add(this.turnoverValue);
  }
  passValue(expected, rollTotal, modifiedTarget) {
    if (this.activePlayer && this.activePlayer.isBallCarrier) {
      return ballPositionValue(this.activePlayer.team, this.cellTo).subtract(
        ballPositionValue(this.activePlayer.team, this.cellFrom)
      );
    } else {
      return new SingleValue("GFI", 0);
    }
  }
}

class CatchRoll extends ModifiedD6SumRoll {
  get rollName() { return "Catch"; }
  static handledSkills = [SKILL.DisturbingPresence, SKILL.Catch, SKILL.ExtraArms];
  get rerollSkill() { return SKILL.Catch; }

  failValue(expected, rollTotal, modifiedTarget) {
    return this.turnoverValue;
  }
}

class StandUpRoll extends ModifiedD6SumRoll {
  get rollName() { return "Stand Up"; }
  failValue(expected, rollTotal, modifiedTarget) {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class TakeRootRoll extends ModifiedD6SumRoll {
  get rollName() { return "Take Root"; }
  static handledSkills = [SKILL.TakeRoot];
  failValue(expected, rollTotal, modifiedTarget) {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class LandingRoll extends ModifiedD6SumRoll {
  get rollName() { return "Landing"; }
  get dependentConditions() { return [reroll, samePlayerMove, nonFoulDamage]; }
  failValue(expected, rollTotal, modifiedTarget) {
    // TODO: Handle a turnover if the thrown player has the ball
    return this.knockdownValue(this.activePlayer, expected);
  }
}

class FireballRoll extends ModifiedD6SumRoll {
  get rollName() { return "Fireball"; }
  get dependentConditions() { return [nonFoulDamage]; }
  passValue(expected, rollTotal, modifiedTarget) {
    return this.knockdownValue(this.activePlayer, expected);
  }
}

class LightningBoltRoll extends ModifiedD6SumRoll {
  get rollName() { return "Lightning Bolt"; }
  get dependentConditions() { return [reroll, samePlayerMove, nonFoulDamage]; }
  static argsFromXml(xml) {
    const args = super.argsFromXml(xml);
    args.activePlayer = args.initialBoardState.playerAtPosition(xml.action.Order.CellTo.Cell);
    return args;
  }
  passValue(expected, rollTotal, modifiedTarget) {
    return this.knockdownValue(this.activePlayer, expected);
  }
}

interface InjuryRollArgs extends RollArgs<number> {
  canPileOn: boolean,
  isPileOn: boolean,
  pilingOnPlayer?: Player,
  isFoul: boolean,
  foulingPlayer?: Player,
  modifier: number
}

interface Outcome {
  name: string,
  value: Distribution,
}

export class InjuryRoll extends Roll<number> {
  canPileOn: boolean;
  isPileOn: boolean;
  pilingOnPlayer?: Player;
  isFoul: boolean;
  foulingPlayer?: Player;
  modifier: number;

  constructor(args: InjuryRollArgs) {
    super(args);
    console.assert(
      this.isFoul === !(this.foulingPlayer === undefined),
      { msg: "Must have a fouling player for a foul", roll: this }
    )
  }

  static handledSkills = [SKILL.MightyBlow, SKILL.DirtyPlayer, SKILL.Stunty];
  get diceSeparator() { return '+'; }
  get dependentConditions() { return [reroll]; }

  static argsFromXml(xml: RollXML<any, any>): InjuryRollArgs {
    const args = super.argsFromXml(xml);
    let canPileOn, isPileOn, pilingOnPlayer, isFoul, foulingPlayer, modifier;

    if (args.rollType == ROLL.PileOnInjuryRoll) {
      // The first time you see it, without an IsOrderComplete, is the choice to use PileOn
      // The second time, with IsOrderComplete, is an actual PileOn (but there are no dice associated)
      // If there's no IsOrderComplete, then it will show up as a normal injury roll.
      canPileOn = xml.boardActionResult.IsOrderComplete == undefined;
    }

    // An Injury PileOn has a IsOrderCompleted RollType 60 right before it
    if (xml.resultIndex == 0) {
      isPileOn = false;
    } else {
      var previousResult =
        xml.action.Results.BoardActionResult[xml.resultIndex - 1];
      isPileOn = previousResult.RollType == 60;
      if (isPileOn) {
        var previousSkills = ensureList(
          previousResult.CoachChoices.ListSkills.SkillInfo
        );
        pilingOnPlayer = args.finalBoardState.playerById(
          previousSkills.filter((skill) => skill.SkillId == SKILL.PilingOn)[0]
            .PlayerId
        );
      }
    }

    isFoul = xml.action.ActionType == ACTION_TYPE.Foul;
    if (isFoul) {
      let foulAction = ensureList(xml.replayStep.RulesEventBoardAction)[0] as BB2.FoulAction;
      foulingPlayer = args.finalBoardState.playerById(foulAction.PlayerId);
    }

    modifier =
      ensureList(xml.boardActionResult.ListModifiers.DiceModifier || [])
        .map((modifier) => modifier.Value || 0)
        .reduce((a, b) => a + b, 0) || 0;

    return {
      ...args,
      canPileOn,
      isPileOn,
      pilingOnPlayer,
      isFoul,
      foulingPlayer,
      modifier,
    };
  }

  get shortDescription() {
    return `${this.rollName}: ${this.activePlayer.name} - ${this.dice.reduce((a, b) => a + b)}`;
  }

  get rollName() {
    if (this.canPileOn) {
      return "Injury (Can Pile On)"
    } else if (this.isPileOn) {
      return "Injury (Piled On)";
    } else {
      return "Injury";
    }
  }

  // TODO: Handle skills
  get injuryName() {
    let total = this.dice[0] + this.dice[1] + this.modifier;
    if (this.activePlayer.skills.includes(SKILL.Stunty)) {
      total += 1;
    }
    if (total <= 7) {
      return "Stun";
    } else if (total <= 9) {
      return "KO";
    } else {
      return "CAS";
    }
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

  get improbability() {
    let modifier = this.activePlayer.skills.includes(SKILL.Stunty) ? 1 : 0;
    let { pass, fail } = this.diceCombinations.reduce((acc, dice) => {
      if (dice[0] + dice[1] + modifier <= 7) {
        acc.fail += 1;
      } else {
        acc.pass += 1;
      }
      return acc;
    }, { pass: 0, fail: 0 });

    let passChance = pass / (pass + fail);
    let passed = this.dice[0] + this.dice[1] + modifier > 7;
    return (passed ? 1 : 0) - passChance;
  }

  get diceCombinations() {

    var combinations = [];
    for (var first = 1; first <= 6; first++) {
      for (var second = 1; second <= 6; second++) {
        combinations.push([first, second]);
      }
    }
    Object.defineProperty(this, 'diceCombinations', { value: combinations });
    return this.diceCombinations;
  }

  value(dice, expected): Distribution {
    if (this.canPileOn) {
      return new SingleValue(`Pile On Decision Pending`, 0);
    }
    var total = dice[0] + dice[1] + this.modifier;
    var value = this.injuryValue(total);
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      value = value.subtract(this.onTeamValue(this.pilingOnPlayer));
    }
    if (this.isFoul && dice[0] == dice[1]) {
      value = value.add(this.casValue(this.foulingPlayer).named('Sent Off'), this.turnoverValue);
    }
    if (
      this.nextRoll &&
      this.nextRoll.constructor == this.constructor &&
      this.nextRoll.isReroll
    ) {
      return new SingleValue(`Rerolled ${this.rollName}`, this.rerollValue);
    } else {
      return value;
    }
  }

  get _possibleOutcomes() {
    var outcomesByName: Record<string, Outcome[]> = {};
    for (var combination of this.diceCombinations) {
      let value = this.value(combination, true);
      var outcomeList = outcomesByName[value.name];
      if (!outcomeList) {
        outcomeList = outcomesByName[value.name] = [];
      }
      outcomeList.unshift({
        name: (combination[0] + combination[1]).toString(),
        value: value
      });
    }
    return new SimpleDistribution(
      Object.values(outcomesByName).map((outcomes) => {
        const minOutcome = Math.min(
          ...outcomes.map((outcome) => parseInt(outcome.name))
        );
        const maxOutcome = Math.max(...outcomes.map((outcome) => parseInt(outcome.name)));
        return {
          name: minOutcome === maxOutcome ? minOutcome.toString() : `${minOutcome}-${maxOutcome}`,
          weight: outcomes.length,
          value: outcomes[0].value
        }
      })
    );
  }
  simulateDice() {
    return this.dice.map(() => sample([1, 2, 3, 4, 5, 6]));
  }
}

interface CasualtyRollArgs extends RollArgs<number> {
  isFoul: boolean,
}
export class CasualtyRoll extends Roll<number> {
  isFoul: boolean;
  get rollName() { return "Casualty"; }
  static handledSkills = [SKILL.NurglesRot, SKILL.Decay];
  // TODO: Handle skills
  // TODO: Selecting the Apo result seems to read as a separate roll
  get diceSeparator() { return ''; }

  static argsFromXml(xml: RollXML<any, any>): CasualtyRollArgs {
    return {
      ...super.argsFromXml(xml),
      isFoul: xml.action.ActionType == ACTION_TYPE.Foul,
    };
  }

  static dice(BoardActionResult) {
    // Casualty dice are also doubled up, and also both rolls appear when an apoc is used (so the last one is the valid one)
    var dice = super.dice(BoardActionResult);
    dice = dice.slice(0, dice.length / 2);
    return [dice[dice.length - 1]];
  }

  casName(dice) {
    if (dice < 40) {
      return "Badly Hurt";
    } else if (dice < 50) {
      return "Miss Next Game";
    } else if (dice <= 52) {
      return "Niggling Injury";
    } else if (dice <= 54) {
      return "-MA";
    } else if (dice <= 56) {
      return "-AV";
    } else if (dice == 57) {
      return "-AG";
    } else if (dice == 58) {
      return "-ST";
    } else if (dice < 70) {
      return "Dead!";
    }
  }
  value(dice, expected): Distribution {
    return new SingleValue("CAS", 0); // Need to figure out how to grade losing player value for multiple matches
  }
  get _possibleOutcomes() {
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
    return new SimpleDistribution(outcomes);
  }
  simulateDice() {
    return sample([1, 2, 3, 4, 5, 6]) * 10 + sample([1, 2, 3, 4, 5, 6, 7, 8]);
  }
}

class RegenerationRoll extends ModifiedD6SumRoll {
  get rollName() { return "Regeneration"; }
  static handledSkills = [SKILL.Regeneration];

  passValue(expected, rollTotal, modifiedTarget) {
    return this.koValue(this.activePlayer).product(-0.5).named('Regeneration');
  }
}

interface MoveActionArgs extends RollArgs<null> {
  cellFrom: BB2.Cell,
  cellTo: BB2.Cell,
}

export class MoveAction extends Roll<null> {
  cellFrom: BB2.Cell;
  cellTo: BB2.Cell;
  get rollName() { return "Move"; }
  get dependentConditions() { return [sameTeamMove]; }
  static handledSkills = [SKILL.JumpUp];

  static ignore() {
    return false;
  }

  static argsFromXml(xml: RollXML<any, any>): MoveActionArgs {
    return {
      ...super.argsFromXml(xml),
      cellFrom: xml.action.Order.CellFrom,
      cellTo: xml.action.Order.CellTo.Cell,
    };
  }
  get description() {
    const from = this.cellFrom;
    const to = this.cellTo;
    return `Move: [${this.activePlayer.team.shortName}] ${this.activePlayer.name} - (${from.x || 0}, ${from.y || 0}) \u2192 (${to.x || 0}, ${to.y || 0})`;
  }

  get shortDescription() {
    const from = this.cellFrom;
    const to = this.cellTo;
    return `Move: ${this.activePlayer.name} - (${from.x || 0}, ${from.y || 0}) \u2192 (${to.x || 0}, ${to.y || 0})`;
  }
  value() {
    if (this.activePlayer && this.activePlayer.isBallCarrier) {
      return ballPositionValue(this.activePlayer.team, this.cellTo).subtract(
        ballPositionValue(this.activePlayer.team, this.cellFrom)
      );
    } else {
      return new SingleValue("Move", 0);
    }
  }
  get _possibleOutcomes() {
    return this.value().add(...this.dependentRolls.map(roll => roll.value()))
  }
}

class NoValueRoll extends Roll<number> {
  static ignore(xml) {
    return true;
  }
  value() {
    return new SingleValue("No Value", 0);
  }
  get expectedValue() {
    return 0;
  }
  simulateDice() {
    return null;
  }
  get _possibleOutcomes() {
    return new SingleValue("No Value", 0);
  }
}

function isKickoffRoll(roll, dependent) {
  return dependent instanceof KickoffEventRoll;
}

interface KickoffRollArgs extends RollArgs<number> {
  diceSum: number,
  kickoffTeam: SIDE,
}

export class KickoffRoll extends Roll<number> {
  kickoffTeam: number;
  diceSum: number;

  get rollName() { return "Kickoff"; }
  get dependentConditions() { return [isKickoffRoll]; }
  get activeTeam() {
    return this.finalBoardState.teams[this.kickoffTeam];
  }
  static argsFromXml(xml: any): KickoffRollArgs {
    let dice = translateStringNumberList(xml.kickoff.ListDice);
    return {
      initialBoardState: new BoardState(BoardState.argsFromXml(xml.initialBoard)),
      finalBoardState: new BoardState(BoardState.argsFromXml(xml.replayStep.BoardState)),
      dice,
      diceSum: dice[0] + dice[1],
      startIndex: new ReplayPosition(xml.stepIndex, REPLAY_SUB_STEP.Kickoff),
      kickoffTeam: xml.replayStep.BoardState.KickOffTeam || 0,
      skillsInEffect: [],
      rollStatus: undefined,
      activePlayer: undefined,
      rollType: undefined,
      unhandledSkills: [],
      ignore: false,
      actionType: undefined,
      resultType: undefined,
      subResultType: undefined,
      isReroll: undefined,
      gameLength: xml.gameLength,
    };
  }
  get description() {
    return `${this.rollName}: ${KICKOFF_RESULT_NAMES[this.diceSum]}`;
  }
  get shortDescription() {
    return this.description;
  }

  // TODO: Handle skills
  kickoffValue(total) {
    switch (total) {
      case KICKOFF_RESULT.GetTheRef:
        return new SingleValue("GetTheRef", 0);
      case KICKOFF_RESULT.Riot:
        return new SingleValue("Riot", 0);
      case KICKOFF_RESULT.PerfectDefence:
        return new SingleValue("PerfectDefence", 0);
      case KICKOFF_RESULT.HighKick:
        return new SingleValue("HighKick", 0);
      case KICKOFF_RESULT.CheeringFans:
        return new SingleValue("CheeringFans", 0);
      case KICKOFF_RESULT.ChangingWeather:
        return new SingleValue("ChangingWeather", 0);
      case KICKOFF_RESULT.BrilliantCoaching:
        return new SingleValue("BrilliantCoaching", 0);
      case KICKOFF_RESULT.QuickSnap:
        return new SingleValue("QuickSnap", 0);
      case KICKOFF_RESULT.Blitz:
        return new SingleValue("Blitz", 0);
      case KICKOFF_RESULT.ThrowARock:
        return new SingleValue("ThrowARock", 0);
      case KICKOFF_RESULT.PitchInvasion:
        return new SingleValue("PitchInvasion", 0);
    }
  }

  get improbability() {
    let { pass, fail } = this.diceCombinations.reduce((acc, dice) => {
      let total = dice[0] + dice[1];
      switch (total) {
        case KICKOFF_RESULT.GetTheRef:
        case KICKOFF_RESULT.Riot:
        case KICKOFF_RESULT.CheeringFans:
        case KICKOFF_RESULT.ChangingWeather:
        case KICKOFF_RESULT.BrilliantCoaching:
        case KICKOFF_RESULT.ThrowARock:
        case KICKOFF_RESULT.PitchInvasion:
          acc.pass += 0.5;
          acc.fail += 0.5;
          break;
        case KICKOFF_RESULT.PerfectDefence:
        case KICKOFF_RESULT.HighKick:
          acc.fail += 1;
          break;
        case KICKOFF_RESULT.QuickSnap:
        case KICKOFF_RESULT.Blitz:
          acc.pass += 1;
          break;
      }
      return acc;
    }, { pass: 0, fail: 0 });


    let total = this.dice[0] + this.dice[1];
    switch (total) {
      case KICKOFF_RESULT.GetTheRef:
      case KICKOFF_RESULT.Riot:
      case KICKOFF_RESULT.CheeringFans:
      case KICKOFF_RESULT.ChangingWeather:
      case KICKOFF_RESULT.BrilliantCoaching:
      case KICKOFF_RESULT.ThrowARock:
      case KICKOFF_RESULT.PitchInvasion:
        return 0;
      case KICKOFF_RESULT.PerfectDefence:
      case KICKOFF_RESULT.HighKick:
        return (-pass) / (pass + fail);
      case KICKOFF_RESULT.QuickSnap:
      case KICKOFF_RESULT.Blitz:
        return 1 - (pass / (pass + fail));
    }
  }

  get diceCombinations() {

    var combinations = [];
    for (var first = 1; first <= 6; first++) {
      for (var second = 1; second <= 6; second++) {
        combinations.push([first, second]);
      }
    }
    Object.defineProperty(this, 'diceCombinations', { value: combinations });
    return this.diceCombinations;
  }

  value(dice, expected): Distribution {
    var total = dice[0] + dice[1];
    var value = this.kickoffValue(total);
    return value;
  }

  get _possibleOutcomes() {
    var outcomesByName: Record<string, {name: string, value: Distribution}[]> = {};
    for (var combination of this.diceCombinations) {
      var outcomeList = outcomesByName[this.value(combination, true).name];
      if (!outcomeList) {
        outcomeList = outcomesByName[this.value(combination, true).name] = [];
      }
      outcomeList.unshift({
        name: (combination[0] + combination[1]).toString(),
        value: this.value(combination, true)
      });
    }
    return new SimpleDistribution(
      Object.values(outcomesByName).map((outcomes) => {
        const minOutcome = Math.min(
          ...outcomes.map((outcome) => parseInt(outcome.name))
        );
        const maxOutcome = Math.max(...outcomes.map((outcome) => parseInt(outcome.name)));
        return {
          name: minOutcome === maxOutcome ? minOutcome.toString() : `${minOutcome}-${maxOutcome}`,
          weight: outcomes.length,
          value: outcomes[0].value
        }
      })
    );
  }

  simulateDice() {
    return this.dice.map(() => sample([1, 2, 3, 4, 5, 6]));
  }
}

interface KickoffEventRollArgs extends ModifiedD6SumRollArgs {
  kickoffTeam: SIDE,
  messageData: BB2.KickoffEventMessageData,
}

 // @ts-ignore
class KickoffEventRoll extends ModifiedD6SumRoll {
  kickoffTeam: SIDE;
  messageData: any;

  get activeTeam() {
    return this.finalBoardState.teams[this.kickoffTeam];
  }
  static argsFromXml(xml: {
    initialBoard: BB2.BoardState,
    replayStep: BB2.ReplayStep,
    stepIndex: number,
    messageData: BB2.KickoffEventMessageData,
    gameLength: number,
  }): KickoffEventRollArgs {
    return {
      initialBoardState: new BoardState(BoardState.argsFromXml(xml.initialBoard)),
      finalBoardState: new BoardState(BoardState.argsFromXml(xml.replayStep.BoardState)),
      startIndex: new ReplayPosition(xml.stepIndex, REPLAY_SUB_STEP.Kickoff),
      messageData: xml.messageData,
      kickoffTeam: xml.replayStep.BoardState.KickOffTeam || SIDE.home,
      target: undefined,
      modifier: undefined,
      skillsInEffect: [],
      rollStatus: undefined,
      rollType: undefined,
      actionType: undefined,
      activePlayer: undefined,
      dice: [],
      unhandledSkills: [],
      ignore: false,
      resultType: undefined,
      subResultType: undefined,
      isReroll: false,
      gameLength: xml.gameLength,
    };
  }
}

interface RulesEventPlayerInvaded {
  PlayerId: BB2.PlayerId,
  Die: number,
  Stunned?: number,
}

interface PitchInvasionMessage {
  RulesEventPlayerInvaded: RulesEventPlayerInvaded,
}

export class PitchInvasionRoll extends KickoffEventRoll {
  messageData: PitchInvasionMessage;
  stunned: boolean;
  activePlayer: Player;

  get rollName() { return "Pitch Invasion"; }
  constructor(args: KickoffEventRollArgs) {
    super(args);
    this.activePlayer = this.finalBoardState.playerById(this.messageData.RulesEventPlayerInvaded.PlayerId);
    this.dice = [this.messageData.RulesEventPlayerInvaded.Die];
    this.stunned = this.messageData.RulesEventPlayerInvaded.Stunned == 1;
    let playerTeam = this.activePlayer.team;
    let opposingTeam = this.finalBoardState.teams.filter(team => team.id != playerTeam.id)[0];
    this.target = 6;
    this.modifier = opposingTeam.fame;
  }

  get description() {
    return `${this.rollName}: ${this.activePlayer.name} ${this.stunned ? 'stunned!' : 'safe'} - ${this.dice[0]} (${this.target})`;
  }

  passValue(expected, rollTotal, modifiedTarget) {
    return this.stunValue(this.activePlayer);
  }

  get improbability() {
    if (this.onActiveTeam(this.activePlayer)) {
      let safeChance = (5 - this.modifier) / 6;
      let safe = !this.stunned;
      return (safe ? 1 : 0) - safeChance;
    } else {
      let stunnedChance = (1 + this.modifier) / 6;
      return (this.stunned ? 1 : 0) - stunnedChance;
    }
  }
}



export class SetupAction extends NoValueRoll {
  get rollName() { return "Setup"; }
  get dependentConditions() { return [setup]; }
  static hideDependents = true;
  static ignore(xml) {
    return false;
  }

  get description() {
    return `Setup`;
  }

  get jointDescription() {
    return "Setup";
  }

  get shortDescription() {
    return this.description;
  }
  static argsFromXml(xml: any): RollArgs<null> {
    return {
      initialBoardState: new BoardState(BoardState.argsFromXml(xml.initialBoard)),
      finalBoardState: new BoardState(BoardState.argsFromXml(xml.replayStep.BoardState)),
      ignore: this.ignore(xml),
      startIndex: new ReplayPosition(xml.stepIndex, REPLAY_SUB_STEP.SetupAction),
      gameLength: xml.gameLength,
      skillsInEffect: [],
      rollStatus: undefined,
      activePlayer: undefined,
      rollType: undefined,
      dice: [],
      unhandledSkills: [],
      actionType: undefined,
      resultType: undefined,
      subResultType: undefined,
      isReroll: false,
    };
  }
}

class PushChoice extends NoValueRoll {
  get rollName() { return "Push"; }
  static handledSkills = [SKILL.SideStep];
}

class FollowUpChoice extends NoValueRoll {
  get rollName() { return "Follow Up"; }
  static handledSkills = [SKILL.Frenzy];
}

class FoulPenaltyRoll extends NoValueRoll { }

export class UnknownRoll {
  name: string;
  xml: any;
  ignore: boolean;

  constructor(name, xml) {
    this.name = name;
    this.xml = xml;
    this.ignore = true;
  }
}

const ROLL_TYPES = {
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
  13: null, //PushChoice,
  14: null, //FollowUpChoice,
  15: FoulPenaltyRoll,
  16: InterceptionRoll,
  17: WakeUpRoll,
  19: null, // Touch Back
  20: BoneHeadRoll,
  21: ReallyStupidRoll,
  22: WildAnimalRoll,
  23: "Loner",
  24: LandingRoll,
  25: RegenerationRoll,
  26: null, // Inaccurate Pass Scatter
  27: "Always Hungry",
  28: "Eat Teammate",
  29: DauntlessRoll,
  30: "Safe Throw",
  31: JumpUpRoll,
  32: "Shadowing",
  34: "Shadowing",
  36: LeapRoll,
  37: FoulAppearanceRoll,
  38: "Tentacles",
  39: "Chainsaw (Kickback?)",
  40: TakeRootRoll,
  41: "Ball And Chain",
  42: "Hail Mary Pass",
  44: "Diving Tackle",
  45: "Pro",
  46: "Hypnotic Gaze",
  49: "Animosity",
  50: "Bloodlust",
  51: "Bite",
  52: "Bribe",
  53: "Halfling Chef",
  54: FireballRoll,
  55: LightningBoltRoll,
  56: ThrowTeammateRoll,
  57: "Multiblock",
  58: null, // Kickoff Gust
  59: ArmorRoll, // Armor Roll with Pile On. If followed by a RollType 59 w/ IsOrderCompleted, then PO happened. Otherwise, no PO
  60: InjuryRoll, // Injury Roll with Pile On. If followed by a RollType 60 w/ IsOrderCompleted, then PO happened, otherwise, no PO?
  61: null, // Some sort of wrestle roll that doesn't do anything
  62: null, // Choic to use Dodge
  63: null, // Choice to use Stand Firm
  64: null, // Juggernaut
  65: "Stand Firm 2",
  66: "Raise Dead",
  69: null, // Fans
  70: null, // Weather
  71: "Swealtering Heat",
  72: "Bomb KD",
  73: "Chainsaw Armor",
};

const KICKOFF_RESULT_TYPES: Map<KICKOFF_RESULT, typeof KickoffEventRoll> = new Map([
  [KICKOFF_RESULT.PitchInvasion, PitchInvasionRoll],
]);
