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
import { translateStringNumberList, ensureList, ensureKeyedList, ReplayPosition, REPLAY_SUB_STEP, REPLAY_KEY, after} from './replay-utils.js';
import {
  SingleValue,
  SimpleDistribution,
  SumDistribution,
  MinDistribution,
  MaxDistribution,
  Distribution
} from './distribution.js';
import type * as BB2 from './replay/BB2.js';
import type * as Internal from './replay/Internal.js';
import {convertCell} from './replay/BB2toInternal.js';
import _ from 'underscore';
import parser from 'fast-xml-parser';
import he from 'he';
import { assembleParameterSignals } from 'vega-lite/build/src/parameter';
import type { BlockAction } from './replay/Internal.js';
import { update_slot_spread } from 'svelte/internal';

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

function manhattan(a:Internal.Cell, b:Internal.Cell): number {
  return Math.max(
    Math.abs((a.x) - (b.x)),
    Math.abs((a.y) - (b.y))
  );
}

function ballPositionValue(team: Team, cell: Internal.Cell): SingleValue {
  var distToGoal;
  if (team.id == 0) {
    distToGoal = 25 - (cell.x);
  } else {
    distToGoal = (cell.x);
  }
  var distValue;
  if (distToGoal == 0) {
    distValue = 1;
  } else {
    distValue = .5 * (0.85 ** (distToGoal - 1));
  }
  return new SingleValue(`${distToGoal} to goal`, distValue);
}

enum POINT {
  Actual = 'actual',
  Simulated = 'simulated',
}

export class Player {
  team: Team;
  playerState: BB2.PitchPlayer;
  name: string;
  id: number;
  playerType: PLAYER_TYPE;
  cell: Internal.Cell;
  situation?: SITUATION;
  canAct: boolean;
  skills: SKILL[];
  isBallCarrier: boolean;

  constructor(team: Team, playerState: BB2.PitchPlayer, boardState: BB2.BoardState) {
    this.team = team;
    this.id = playerState.Data.Id;
    this.playerType = getPlayerType(playerState.Data.IdPlayerTypes);
    this.name = he.decode(playerState.Data.Name.toString().replace(/\[colour='[0-9a-f]{8}'\]/i, '').toString());
    this.name = STAR_NAMES[this.name] || this.name;
    this.cell = convertCell(playerState.Cell);
    this.situation = playerState.Situation;
    this.playerState = playerState;
    this.canAct =
      playerState.CanAct == 1 && this.situation === SITUATION.Active;
    this.skills = translateStringNumberList(playerState.Data.ListSkills) || [];
    this.isBallCarrier = manhattan(convertCell(boardState.Ball.Cell), this.cell) == 0 && boardState.Ball.IsHeld == 1;
  }

  get skillNames() {
    return this.skills.map((skill) => SKILL_NAME[skill]);
  }

  get tv() {
    let playerTV = PLAYER_TVS[this.playerType];
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

  constructor(teamState: BB2.TeamState, boardState: BB2.BoardState) {
    this.players = ensureKeyedList('PlayerState', teamState.ListPitchPlayers).map(
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
  ballCell: "" | Internal.Cell
}

class BoardState {
  ballCell: Internal.Cell;
  teams: Team[];
  activeTeam: Team;
  turn: number;

  constructor({ teams, activeTeamId, ballCell }: { teams: Team[], activeTeamId: number, ballCell: Internal.Cell }) {
    this.teams = teams;
    this.activeTeam =
      teams.filter((team) => team.id == activeTeamId)[0] || teams[0];
    this.turn = (this.activeTeam && this.activeTeam.turn) || 0;
    this.ballCell = ballCell || {x: 0, y: 0};
  }
  static argsFromXml(boardState: BB2.BoardState) {
    let teams = boardState.ListTeams.TeamState.map(
      (teamState) => new Team(teamState, boardState)
    );
    let activeTeamId = boardState.ActiveTeam || 0;
    let args = {
      teams,
      activeTeamId,
      ballCell: convertCell(boardState.Ball.Cell),
    }
    return args;
  }

  playerById(playerId: BB2.PlayerId): Player | undefined {
    for (var team of this.teams) {
      for (var player of team.players) {
        if (player.id === playerId) {
          return player;
        }
      }
    }
    return undefined;
  }

  playerAtPosition(cell: Internal.Cell): Player | undefined {
    for (var team of this.teams) {
      for (var player of team.players) {
        if ((player.cell.x) === (cell.x) && (player.cell.y) === (cell.y)) {
          return player;
        }
      }
    }
    return undefined;
  }
}

interface RollArgs<Dice> {
  initialBoardState: BoardState,
  finalBoardState: BoardState,
  skillsInEffect: BB2.SkillInfo[],
  rollStatus: ROLL_STATUS,
  activePlayer: Player | undefined,
  rollType: ROLL,
  dice: Dice[]
  ignore: boolean,
  actionType: ACTION_TYPE,
  resultType: RESULT_TYPE,
  subResultType: SUB_RESULT_TYPE | undefined,
  startIndex: ReplayPosition,
  isReroll: boolean,
  gameLength: number,
  rolls?: Roll<any>[],
}

interface RollXML<A, R, S = BB2.ReplayStep> {
  replay: BB2.Replay,
  initialBoard: BB2.BoardState,
  action: A,
  actionIndex: number,
  boardActionResult: R,
  resultIndex: number,
  replayStep: S,
  stepIndex: number,
  gameLength: number,
}

interface PlayerRoll {
  activePlayer: Player,
}

export class Roll<D> {
  _futurePlayerValue: Record<number, number | Distribution>;
  actionType: ACTION_TYPE;
  resultType: RESULT_TYPE;
  subResultType: SUB_RESULT_TYPE | undefined;
  activePlayer: Player | undefined;
  armorRollCache: Record<string, ArmorRoll>;
  dependent?: {roll: Roll<any>, index: number};
  dependentRolls: Roll<any>[];
  dice: D[];
  finalBoardState: BoardState;
  gameLength: number;
  initialBoardState: BoardState;
  isReroll: boolean;
  onTeamValues: Record<number, Distribution>;
  rollIndex?: number;
  rolls?: Roll<any>[];
  rollStatus: ROLL_STATUS;
  rollType: ROLL;
  skillsInEffect: BB2.SkillInfo[];
  startIndex: ReplayPosition;
  endIndex?: ReplayPosition;
  ignore: boolean;

  get rollName() { return `Unnamed Roll ${this.constructor.name}`; }
  get handledSkills(): SKILL[] {return [];}
  get diceSeparator() { return ', '; }
  static hideDependents = false;
  get dependentConditions(): DependentCondition[] {return [];}

  get unhandledSkills(): BB2.SkillInfo[] {
    let unhandledSkills = this.skillsInEffect.filter(
      (skillInfo: BB2.SkillInfo) => !this.handledSkills.includes(skillInfo.SkillId)
    );
    Object.defineProperty(this, 'unhandledSkills', { value: unhandledSkills });
    return this.unhandledSkills;
  }

  constructor(attrs: RollArgs<D>) {
    this.initialBoardState = attrs.initialBoardState;
    this.finalBoardState = attrs.finalBoardState;
    this.skillsInEffect = attrs.skillsInEffect;
    this.rollStatus = attrs.rollStatus;
    this.activePlayer = attrs.activePlayer;
    this.rollType = attrs.rollType;
    this.dice = attrs.dice;
    this.ignore = attrs.ignore;
    this.actionType = attrs.actionType;
    this.resultType = attrs.resultType;
    this.subResultType = attrs.subResultType;
    this.startIndex = attrs.startIndex;
    this.isReroll = attrs.isReroll;
    this.gameLength = attrs.gameLength;
    this.rolls = attrs.rolls;

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

  static argsFromXml(xml: RollXML<BB2.RulesEventBoardAction, any>): RollArgs<any> {

    const initialBoardState = new BoardState(BoardState.argsFromXml(xml.initialBoard));
    const finalBoardState = 'BoardState' in xml.replayStep ? new BoardState(BoardState.argsFromXml(xml.replayStep.BoardState)) : initialBoardState;
    const activePlayerId = 'PlayerId' in xml.action ? xml.action.PlayerId : undefined;

    const skillsInEffect = xml.boardActionResult.CoachChoices.ListSkills != "" ? ensureList(
      xml.boardActionResult.CoachChoices.ListSkills.SkillInfo
    ): [];
    let rollStatus, rollType;
    if ('RollStatus' in xml.boardActionResult) {
      rollStatus = xml.boardActionResult.RollStatus;
      rollType = xml.boardActionResult.RollType;
    }

    return {
      initialBoardState,
      skillsInEffect,
      rollStatus,
      finalBoardState,
      activePlayer: activePlayerId !== undefined ? initialBoardState.playerById(activePlayerId) || undefined : undefined,
      rollType,
      dice: this.dice(xml.boardActionResult),
      ignore: this.ignore(xml),
      actionType: 'ActionType' in xml.action ? xml.action.ActionType : ACTION_TYPE.Move,
      resultType: 'ResultType' in xml.boardActionResult ? xml.boardActionResult.ResultType : undefined,
      subResultType: 'SubResultType' in xml.boardActionResult ? xml.boardActionResult.SubResultType : undefined,
      startIndex: {
        end: false,
        step: xml.stepIndex,
        subStep: REPLAY_SUB_STEP.BoardAction,
        action: xml.actionIndex,
        result: xml.resultIndex
      },
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
    } else if (this.dependent) {
      return this.dependent.roll.dependentRolls[this.dependent.index + 1];
    }
  }

  get improbability() {
    return 0;
  }

  get activeTeam(): Team | undefined {
    return this.finalBoardState?.activeTeam;
  }

  get teams(): Team[] | undefined {
    return this.finalBoardState?.teams;
  }

  get turn() {
    return this.finalBoardState?.turn;
  }

  get jointDescription() {
    return [this.description].concat(this.dependentRolls.map(roll => roll.shortDescription || roll.description)).join(" \u2192 ");
  }

  get description() {
    if (this.activePlayer) {
      var activeSkills =
        this.activePlayer.skills.length > 0
          ? ` (${this.activePlayer.skillNames.join(', ')})`
          : '';
      return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name}${activeSkills} - ${this.dice.join(this.diceSeparator)}`;
    } else {
      return `${this.rollName}: ${this.dice.join(this.diceSeparator)}`;
    }
  }

  get shortDescription() {
    if (this.activePlayer) {
      return `${this.rollName}: ${this.activePlayer.name} - ${this.dice.join(this.diceSeparator)}`;
    } else {
      return `${this.rollName}: ${this.dice.join(this.diceSeparator)}`;
    }
  }

  isDependentRoll(roll: Roll<any>): boolean {
    return this.dependentConditions.some(cond => cond(this, roll));
  }

  value(dice?: D[], expected?: boolean): Distribution | number {
    throw 'value must be defined by subclass';
  }
  get expectedValue() {
    return this.possibleOutcomes.expectedValue;
  }
  get _possibleOutcomes(): Distribution {
    throw `_possibleOutcomes must be defined by subclass ${this.constructor.name}`;
  }

  get possibleOutcomes(): Distribution {
    Object.defineProperty(this, 'possibleOutcomes', { value: this._possibleOutcomes });
    return this.possibleOutcomes;
  }

  simulateDice() {
    throw 'simulateDice must be defined by subclass';
  }

  static ignore(xml: RollXML<BB2.RulesEventBoardAction, any>) {
    if (xml.boardActionResult.RollStatus == ROLL_STATUS.RerollNotTaken) {
      return true; // Didn't take an offered reroll, so ignore this roll in favor of the previous one
    }

    if (xml.boardActionResult.CoachChoices.ListDices === undefined) {
      return true;
    }

    return false;
  }

  static dice(boardActionResult: BB2.DiceRollResult<ROLL, any>): number[] {
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
  simulated(iteration: number) {
    return this.dataPoint(
      iteration,
      POINT.Simulated,
    );
  }

  dataPoint(iteration: number, type: POINT) {
    let outcomeValue: number;
    switch (type) {
      case POINT.Actual:
        outcomeValue = this.valueWithDependents.singularValue;
        break;
      case POINT.Simulated:
        outcomeValue = this.possibleOutcomes.sample();
        break;
    }
    return {
      iteration: iteration,
      turn: this.turn,
      activeTeamId: this.activeTeam?.id,
      activeTeamName: this.activeTeam?.name,
      teamId: this.activePlayer
        ? this.activePlayer.team.id
        : this.activeTeam?.id,
      teamName: this.activePlayer
        ? this.activePlayer.team.name
        : this.activeTeam?.name,
      outcomeValue,
      type,
      expectedValue: this.expectedValue,
      netValue: outcomeValue - this.expectedValue,
      rollIndex: this.rollIndex,
    };
  }

  static fromReplayStep(replay: BB2.Replay, initialBoard: BB2.BoardState, stepIndex: number, replayStep: BB2.ReplayStep): (Roll<any> | UnknownRoll)[] {
    let gameLength = Math.max(16, ...replay.ReplayStep.flatMap(
      step => {
        if (!('BoardState' in step)) {
          return [];
        } else {
          return [
            step.BoardState.ListTeams.TeamState[0].GameTurn || 0,
            step.BoardState.ListTeams.TeamState[1].GameTurn || 0
          ];
        }
      }
    ));

    if ('RulesEventSetUpAction' in replayStep) {
      return [new SetupAction(SetupAction.argsFromXml({
        gameLength,
        initialBoard,
        stepIndex,
        replayStep,
        setupAction: replayStep['RulesEventSetUpAction'],
      }))]
    }
    var rolls = [];

    if ('RulesEventKickOffTable' in replayStep) {
      let kickoff = replayStep.RulesEventKickOffTable!;
      let kickoffRolls = Roll.fromKickoffEvent(replay, initialBoard, stepIndex, replayStep, kickoff, gameLength);
      rolls.push(...kickoffRolls);
    }

    var actions = 'RulesEventBoardAction' in replayStep ? ensureList(replayStep.RulesEventBoardAction!) : [];
    actions.flatMap((action, actionIndex) => {
      rolls.push(
        ...Roll.fromAction(replay, initialBoard, stepIndex, replayStep, actionIndex, action)
      );
    });
    return rolls;
  }

  static fromAction(replay: BB2.Replay, initialBoard: BB2.BoardState, stepIndex: number, replayStep: BB2.ReplayStep, actionIndex: number, action: BB2.RulesEventBoardAction) {
    var results: BB2.DiceRollResult<ROLL, any>[] = ensureKeyedList('BoardActionResult', action.Results as BB2.KeyedMList<'BoardActionResult', any>);
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
    replay: BB2.Replay,
    initialBoard: BB2.BoardState,
    stepIndex: number,
    replayStep: BB2.ReplayStep,
    actionIndex: number,
    action: BB2.RulesEventBoardAction,
    resultIndex: number,
    boardActionResult: BB2.DiceRollResult<ROLL, any>,
  ) {
    if (boardActionResult.RollType === undefined) {
      if (!('actionType' in action)) {
        return new MoveAction(
          MoveAction.argsFromXml({
            replay,
            gameLength: Math.max(16, ...replay.ReplayStep.flatMap(
              step => {
                if (!('BoardState' in step)) {
                  console.log(step);
                  return [];
                }
                return [
                  step.BoardState.ListTeams.TeamState[0].GameTurn || 0, 
                  step.BoardState.ListTeams.TeamState[1].GameTurn || 0
                ];
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
      } else {
        return undefined;
      }
    }

    let rollClass = ROLL_TYPES[boardActionResult.RollType];
    if (rollClass === undefined) {
      return undefined;
    } else if (!rollClass) {
      return new UnknownRoll(`Unknown Roll ${boardActionResult.RollType}`, replayStep);
    } else if (typeof rollClass === "string") {
      return new UnknownRoll(rollClass, replayStep);
    } else {
      return new MoveAction(
        MoveAction.argsFromXml({
          replay,
          gameLength: Math.max(16, ...replay.ReplayStep.flatMap(
            step => {
              if (!('BoardState' in step)) {
                console.log(step);
                return [];
              }
              return [
                step.BoardState.ListTeams.TeamState[0].GameTurn || 0,
                step.BoardState.ListTeams.TeamState[1].GameTurn || 0
              ];
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
    replayStep: BB2.GameTurnStep,
    kickoff: BB2.RulesEventKickOffTable,
    gameLength: number,
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
    let diceSum: KICKOFF_RESULT = dice[0] + dice[1];
    let rollClass = KICKOFF_RESULT_TYPES[diceSum];
    let rolls: (Roll<any> | UnknownRoll)[] = [kickoffRoll];
    if (typeof rollClass === 'string') {
      rolls.push(new UnknownRoll(rollClass, replayStep));
    } else if (kickoff.EventResults) {
      let eventClass: typeof KickoffEventRoll = rollClass;
      rolls.push(...ensureList(kickoff.EventResults.StringMessage).map(msg => {
        let messageData = parser.parse(he.decode(msg.MessageData), {
          ignoreAttributes: true,
        }) as BB2.KickoffEventMessageData;
        return new eventClass(
          eventClass.argsFromXml({
            initialBoard,
            stepIndex,
            replayStep,
            messageData,
            gameLength,
          })
        );
      }));
    }
    return rolls;
  }

  onActiveTeam(player: Player) {
    return player.team.id === this.activeTeam?.id;
  }

  playerValue(player: Player) {
    let ballCell = this.initialBoardState?.ballCell;
    if (!ballCell || (ballCell.x) < 0 || (ballCell.y) < 0) {
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

  rawPlayerValue(player: Player) {
    return new SingleValue(`TV(${player.name})`, player.tv);
  }

  teamValue(team: Team, situations: SITUATION[], includingPlayer: Player) {
    return new SumDistribution(
      team.players
        .filter((player) => situations.includes(player.situation || SITUATION.Active) || player.id == includingPlayer.id)
        .map((player) => this.playerValue(player)),
      `TV(${team.name})`
    );
  }

  get halfTurnsInGame() {
    // Return the number of half-turns left in the game
    if (!this.teams) {
      return 32;
    }
    var halfTurns = this.teams.map((team) => {
      if (this.turn || 0 <= 16) {
        return 16 - team.turn;
      } else {
        return Math.min(24, this.gameLength || 16) - team.turn;
      }
    });
    return halfTurns[0] + halfTurns[1];
  }

  get halfTurnsInHalf(): number {
    if (!this.teams) {
      return 16;
    }
    // Return the number of half-turns left in the game
    var halfTurns = this.teams.map((team) => {
      if (this.turn || 0 <= 8) {
        return 8 - team.turn;
      } else if (this.turn || 0 <= 16) {
        return 16 - team.turn;
      } else {
        return Math.min(24, this.gameLength || 16) - team.turn;
      }
    });
    return halfTurns[0] + halfTurns[1] + 1;
  }

  stunTurns(player: Player) {
    return Math.min(
      this.onActiveTeam(player) ? 4 : 3,
      this.halfTurnsInHalf
    );
  }

  kdTurns(player: Player) {
    return Math.min(
      this.onActiveTeam(player) ? 2 : 1,
      this.halfTurnsInHalf
    );
  }

  onTeamValue(player: Player): Distribution {
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

  armorRoll(player: Player, damageBonusActive?: boolean) {
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
        target: 0,
        skillsInEffect: [],
        rollStatus: ROLL_STATUS.NoStatus,
        rollType: ROLL.Armor,
        dice: [1, 1],
        ignore: false,
        actionType: ACTION_TYPE.TakeDamage,
        resultType: RESULT_TYPE.Passed,
        subResultType: SUB_RESULT_TYPE.ArmorNoBreak,
        startIndex: this.startIndex,
        isReroll: false,
        gameLength: this.gameLength,
        rolls: this.rolls,
      }))
    );
  }

  knockdownValue(player: Player, includeExpectedValues = false, damageBonusActive = false) {
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

  stunValue(player: Player) {
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

  koValue(player: Player) {
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

  casValue(player: Player) {
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

  get dependentMoveValues(): Distribution | undefined {
    const dependentMoves = this.dependentRolls.filter(
      roll => roll instanceof MoveAction
    );
    if (dependentMoves.length > 0) {
      return new SumDistribution(
        dependentMoves.map(roll => roll.value()),
        "Following Moves"
      );
    } else {
      return undefined;
    }
  }

  get unactivatedPlayers(): Player[] {
    let unactivatedPlayers = this.activeTeam ? this.activeTeam.players.filter((player) => player.canAct) : [];
    Object.defineProperty(this, 'unactivatedPlayers', {
      value: unactivatedPlayers
    });
    return this.unactivatedPlayers;
  }

  futurePlayerValue(player: Player): number | Distribution {
    let cachedValue = this._futurePlayerValue[player.id];
    if (cachedValue) {
      return cachedValue;
    }

    let futureActions = (this.rolls || []).filter(
      roll => (
        after(roll.startIndex, this.startIndex) &&
        roll.activePlayer &&
        roll.activePlayer.id == player.id &&
        roll.turn == this.turn
      )
    );

    let result;
    if (futureActions.length) {
      result = futureActions.reduce((sum, roll) => sum + roll.expectedValue, 0);
    } else {
      result = this.onTeamValue(player).expectedValue;
    }
    this._futurePlayerValue[player.id] = result;
    return new SingleValue(`Remaining Turn ${this.turn} value for ${player.name}`, result);
  }

  get turnoverValue(): Distribution {
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


type DependentCondition = (roll: Roll<any>, dependente: Roll<any>) => boolean;

function pushOrFollow(roll: Roll<any>, dependent: Roll<any>): boolean {
  return [PushChoice, FollowUpChoice].some(type => dependent instanceof type);
}

function nonFoulDamage(roll: Roll<any>, dependent: Roll<any>) {
  if (![ArmorRoll, InjuryRoll, CasualtyRoll].some(rollType => dependent instanceof rollType)) {
    return false;
  }
  return (
    !(dependent as ArmorRoll | InjuryRoll | CasualtyRoll).isFoul
  );
}

function foulDamage(roll: Roll<any>, dependent: Roll<any>) {
  let thisIsFoul = (roll instanceof InjuryRoll || roll instanceof ArmorRoll || roll instanceof CasualtyRoll) && roll.isFoul;
  let dependentIsFoul = ((dependent instanceof InjuryRoll || dependent instanceof ArmorRoll || dependent instanceof CasualtyRoll) && dependent.isFoul);
  let dependentIsFoulPenalty = dependent instanceof FoulPenaltyRoll;

  return thisIsFoul && (
    (dependentIsFoul && dependent.activePlayer?.id == roll.activePlayer?.id) || dependentIsFoulPenalty
    );
}

function reroll(roll: Roll<any>, dependent: Roll<any>) {
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

function sameTeamMove(roll: Roll<any>, dependent: Roll<any>) {
  return (
    dependent instanceof MoveAction && roll.activeTeam?.id == dependent.activeTeam?.id
  )
}

function setup(roll: Roll<any>, dependent: Roll<any>) {
  return (
    dependent instanceof SetupAction
  )
}

function samePlayerMove(roll: Roll<any>, dependent: Roll<any>) {
  return (
    dependent instanceof MoveAction && roll.activePlayer?.id == dependent.activePlayer?.id
  )
}

function catchOrInterception(roll: Roll<any>, dependent: Roll<any>) {
  return dependent instanceof CatchRoll || dependent instanceof InterceptionRoll;
}

interface BlockRollArgs extends RollArgs<BLOCK> {
  activePlayer: Player,
  isRedDice: boolean,
  attacker: Player,
  defender: Player,
  isBlitz: boolean,
}

export class BlockRoll extends Roll<BLOCK> {
  activePlayer: Player;
  isRedDice: boolean;
  attacker: Player;
  defender: Player;
  isBlitz: boolean;
  get rollName() { return "Block"; }
  get handledSkills(): SKILL[] {return [
    SKILL.Tackle,
    SKILL.Dodge,
    SKILL.Block,
    SKILL.Guard,
    SKILL.Horns,
    SKILL.StandFirm,
    SKILL.Wrestle,
    SKILL.TakeRoot
  ]};
  get diceSeparator() { return '/'; }
  get dependentConditions(): DependentCondition[] { return [pushOrFollow, nonFoulDamage, reroll, samePlayerMove]; }

  constructor(attrs: BlockRollArgs) {
    super(attrs);
    this.activePlayer = attrs.activePlayer;
    this.isRedDice = attrs.isRedDice;
    this.attacker = attrs.attacker;
    this.defender = attrs.defender;
    this.isBlitz = attrs.isBlitz;
  }

  static argsFromXml(xml: RollXML<BB2.BlockAction, BB2.BlockResult>): BlockRollArgs {
    let args = super.argsFromXml(xml);
    let isRedDice = false;
    if ('Requirement' in xml.boardActionResult) {
      isRedDice = (xml.boardActionResult.Requirement || 0) < 0;
    }
    return {
      ...args,
      dice: args.dice.slice(0, args.dice.length / 2).map(face => BLOCK_DIE[face]),
      activePlayer: args.activePlayer!,
      isRedDice,
      attacker: args.activePlayer!,
      defender: (args.finalBoardState.playerAtPosition(
        convertCell(xml.action.Order.CellTo.Cell)
      ))!,
      isBlitz: args.activePlayer!.team.blitzerId == args.activePlayer!.id,
    }
  }

  get description() {
    var uphill = this.isRedDice ? ' uphill' : '';
    var attackerSkills =
      this.attacker.skills.length > 0
        ? ` (${this.attacker.skillNames.join(', ')})`
        : '';
    var defenderSkills =
      this.defender && this.defender.skills.length > 0
        ? ` (${this.defender.skillNames.join(', ')})`
        : '';
    return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name
      }${attackerSkills} against ${this.defender.name
      }${defenderSkills} - ${this.dice.join(this.diceSeparator)}${uphill}`;
  }

  static ignore(xml: RollXML<BB2.RulesEventBoardAction, any>) {
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

  dieValue(result: BLOCK, expected: boolean) {
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
          ).add(expected ? this.dependentMoveValues : undefined);
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
          const blockBlock = new SingleValue('Block/Block', 0).add(expected ? this.dependentMoveValues : undefined);
          base = blockBlock;
        } else if (aBlock) {
          const defDown = this.knockdownValue(defender, expected, attackerSkills.includes(SKILL.MightyBlow)).add(expected ? this.dependentMoveValues : undefined);
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
        ).add(expected ? this.dependentMoveValues : 0);
      case BLOCK.DefenderStumbles:
        if (
          defenderSkills.includes(SKILL.Dodge) &&
          !attackerSkills.includes(SKILL.Tackle)
        ) {
          return (
            defenderSkills.includes(SKILL.StandFirm)
              ? new SingleValue('Stand Firm', 0)
              : this.knockdownValue(defender, false).product(new SingleValue('Push', 0.33)).named(`Push(${defender.name})`)
          ).add(expected ? this.dependentMoveValues : undefined);
        } else {
          return this.knockdownValue(defender, expected, attackerSkills.includes(SKILL.MightyBlow)).add(expected ? this.dependentMoveValues : undefined);
        }
      case BLOCK.DefenderDown:
        return this.knockdownValue(defender, expected, attackerSkills.includes(SKILL.MightyBlow)).add(expected ? this.dependentMoveValues : undefined);
    }
  }

  value(dice: BLOCK[], expected: boolean): Distribution {
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
  get rerollSkill(): undefined | SKILL { return undefined; }
  get rerollCancelSkill(): undefined | SKILL { return undefined; }
  get dependentConditions(): DependentCondition[] { return [reroll, samePlayerMove]; }

  constructor(args: ModifiedD6SumRollArgs) {
    super(args);
    this.target = args.target;
    this.modifier = args.modifier;

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

  static argsFromXml(xml: RollXML<any, BB2.DiceRollResult<ROLL, BB2.Skills, BB2.Cells> | BB2.RollResult<ROLL> & BB2.Choices<BB2.Skills, BB2.Cells>>): ModifiedD6SumRollArgs {
    let superArgs = super.argsFromXml(xml);
    return {
      ...superArgs,
      activePlayer: superArgs.activePlayer!,
      modifier: (
        xml.boardActionResult.ListModifiers == ""
        ? []
        : ensureList(xml.boardActionResult.ListModifiers.DiceModifier || [])
      ).map((value: BB2.DiceModifier) => (value.Value || 0))
        .reduce((a, b) => a + b, 0) || 0,
      target: xml.boardActionResult.Requirement || 0,
    }
  }

  get description() {
    if (this.activePlayer) {
      var activeSkills =
        this.activePlayer.skills.length > 0
          ? ` (${this.activePlayer.skillNames})`
          : '';
      return `${this.rollName}: [${this.activePlayer.team.shortName}] ${this.activePlayer.name}${activeSkills} - ${this.dice} (${this.modifiedTarget})`;
    } else {
      return `${this.rollName}: ${this.dice} (${this.modifiedTarget})`;
    }
  }

  get shortDescription() {
    if (this.activePlayer) {
      return `${this.rollName}: ${this.activePlayer.name} - ${this.dice.reduce((a, b) => a + b)} (${this.modifiedTarget})`;
    } else {
      return `${this.rollName}: ${this.dice.reduce((a, b) => a + b)} (${this.modifiedTarget})`
    }
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

  value(dice: number[], expected: boolean): Distribution {
    let rollTotal = dice.reduce((a, b) => a + b, 0);
    if (rollTotal >= this.modifiedTarget) {
      return this.passValue(expected, rollTotal, this.modifiedTarget).add(expected ? this.dependentMoveValues : undefined);
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
    var sumsByOutcome = this.diceSums.reduce((acc: {min: number, max: number, count: number, value: Distribution}[], sum) => {
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
  get reroll(): ModifiedD6SumRoll {
    const reroll = new (this.constructor as any)({
      ...this,
      rollStatus: ROLL_STATUS.RerollWithSkill
    });
    Object.defineProperty(this, 'reroll', { value: reroll });
    return this.reroll;

  }
  get hasSkillReroll() {
    return this.rerollSkill && this.activePlayer && this.activePlayer.skills.includes(this.rerollSkill) &&
      (this.rerollCancelSkill && !this.skillsInEffect.map(info => info.SkillId).includes(this.rerollCancelSkill)) &&
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

class PlayerD6Roll extends ModifiedD6SumRoll {
  activePlayer: Player;

  constructor(args: ModifiedD6SumRollArgs) {
    super(args);
    this.activePlayer = args.activePlayer!;
  }
}

class PickupRoll extends ModifiedD6SumRoll {
  get rollName() { return "Pickup"; }
  get rerollSkill(): undefined | SKILL { return SKILL.SureHands; }
  get handledSkills(): SKILL[] {return [SKILL.SureHands, SKILL.BigHand, SKILL.ExtraArms]};
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.turnoverValue;
  }
}

class BoneHeadRoll extends PlayerD6Roll {
  get rollName() { return "Bone Head"; }
  get handledSkills(): SKILL[] {return [SKILL.BoneHead]};
  get dependentConditions(): DependentCondition[] { return [reroll, samePlayerMove]; }
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class ReallyStupidRoll extends PlayerD6Roll {
  get rollName() { return "Really Stupid"; }
  get handledSkills(): SKILL[] {return [SKILL.ReallyStupid]};
  get dependentConditions(): DependentCondition[] { return [reroll, samePlayerMove]; }
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class FoulAppearanceRoll extends PlayerD6Roll {
  get rollName() { return "Foul Appearance"; }
  get handledSkills(): SKILL[] {return [SKILL.FoulAppearance]};
  get dependentConditions(): DependentCondition[] { return [reroll, samePlayerMove]; }
  failValue() {
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

class ArmorRoll extends PlayerD6Roll {
  foulingPlayer?: Player;
  pilingOnPlayer?: Player;
  canPileOn: boolean;
  isFoul: boolean;
  isPileOn: boolean;
  injuryRollCache: Map<string, InjuryRoll>;
  damageBonusActive: boolean;

  get numDice() { return 2; }
  get handledSkills(): SKILL[] {return [SKILL.Claw, SKILL.MightyBlow, SKILL.DirtyPlayer, SKILL.PilingOn]};
  get dependentConditions(): DependentCondition[] { return [foulDamage]; }

  constructor(attrs: ArmorRollArgs) {
    super(attrs);
    this.canPileOn = attrs.canPileOn;
    this.isFoul = attrs.isFoul;
    this.isPileOn = attrs.isPileOn;
    this.damageBonusActive = attrs.damageBonusActive;
    this.injuryRollCache = new Map();
  }

  static argsFromXml(xml: RollXML<BB2.TakeDamageAction | BB2.FoulAction, BB2.ArmorResult, BB2.GameTurnStep>): ArmorRollArgs {
    const args = super.argsFromXml(xml);

    let canPileOn = false, isPileOn = false, isFoul = false, foulingPlayer, pilingOnPlayer, damageBonusActive = false;

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
        xml.action.Results && ensureList(xml.action.Results.BoardActionResult)[xml.resultIndex - 1];
      if (previousResult && 'RollType' in previousResult) {
        isPileOn = previousResult.RollType == 59;
        if (isPileOn) {
          var previousSkills = ensureKeyedList("SkillInfo", previousResult.CoachChoices.ListSkills);
          pilingOnPlayer = args.finalBoardState.playerById(
            previousSkills.filter((skill) => skill.SkillId == SKILL.PilingOn)[0]
              .PlayerId
          );
        }
      }
    }
    isFoul = xml.action.ActionType == ACTION_TYPE.Foul;
    if (isFoul) {
      // @ts-ignore
      foulingPlayer = args.finalBoardState.playerById(ensureList(xml.replayStep.RulesEventBoardAction!)[0].PlayerId)!;
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
        this.foulingPlayer && this.foulingPlayer.skills.length > 0
          ? ` (${this.foulingPlayer.skillNames.join(', ')})` : '';
      var fouledSkills =
        this.activePlayer.skills.length > 0
          ? ` (${this.activePlayer.skillNames.join(', ')})`
          : '';
      return `${this.rollName}: [${this.foulingPlayer!.team.shortName}] ${this.foulingPlayer!.name
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

  injuryRoll(damageBonusAvailable: boolean, canPileOn: boolean, isFoul: boolean): InjuryRoll {
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
        rollStatus: ROLL_STATUS.NoStatus,
        rollType: ROLL.Injury,
        dice: [],
        ignore: false,
        actionType: this.actionType,
        resultType: RESULT_TYPE.Passed,
        subResultType: SUB_RESULT_TYPE.CASResult,
        startIndex: this.startIndex,
        isReroll: false,
        gameLength: this.gameLength,
        rolls: this.rolls,
      })).get(key));
    return result!;
  }

  value(dice: number[], expected: boolean): Distribution {
    var value = super.value(dice, expected);
    if (this.isFoul && dice[0] == dice[1]) {
      value = value.add(this.casValue(this.foulingPlayer!).named('Sent Off'), this.turnoverValue);
    }
    return value;
  }

  passValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    let damageBonusAvailable = this.damageBonusActive;
    if (this.damageBonusActive && rollTotal == modifiedTarget) {
      damageBonusAvailable = false;
    }
    var injuredPlayerValue = this.stunValue(this.activePlayer).subtract(this.knockdownValue(this.activePlayer)); // Player is at least stunned = out for 2 turns
    if (expected) {
      injuredPlayerValue = injuredPlayerValue.add(this.injuryRoll(damageBonusAvailable, this.canPileOn && !this.isPileOn, this.isFoul).possibleOutcomes.named('Injury Roll'));
    }
    if (this.isPileOn) {
      const pileOnCost = this.knockdownValue(this.pilingOnPlayer!, false);
      return injuredPlayerValue.add(pileOnCost);
    } else {
      return injuredPlayerValue;
    }
  }

  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    var value = new SingleValue('No Break', 0);
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      return value.add(this.knockdownValue(this.pilingOnPlayer!, false));
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

class WildAnimalRoll extends PlayerD6Roll {
  get rollName() { return "Wild Animal"; }
  get handledSkills(): SKILL[] {return [SKILL.WildAnimal]};
  get dependentConditions(): DependentCondition[] { return [reroll, samePlayerMove]; }
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    // Failing Wild Animal means that this player is effectiFvely unavailable
    // for the rest of your turn, but is active on your opponents turn
    return this.onTeamValue(this.activePlayer).product(-1);
  }
}

class DauntlessRoll extends ModifiedD6SumRoll {
  get rollName() { return "Dauntless"; }
  get handledSkills(): SKILL[] {return [SKILL.Dauntless]};
}

interface MoveRollArgs extends ModifiedD6SumRollArgs {
  cellFrom: Internal.Cell,
  cellTo: Internal.Cell,
}

class DodgeRoll extends PlayerD6Roll {
  cellFrom: Internal.Cell;
  cellTo: Internal.Cell;

  get rollName() { return "Dodge"; }
  get handledSkills(): SKILL[] {return [SKILL.BreakTackle, SKILL.Stunty, SKILL.TwoHeads, SKILL.Dodge, SKILL.Tackle, SKILL.PrehensileTail, SKILL.DivingTackle]};
  get rerollSkill(): undefined | SKILL { return SKILL.Dodge; }
  get rerollCancelSkill() { return SKILL.Tackle; }
  get dependentConditions(): DependentCondition[] { return [reroll, samePlayerMove, nonFoulDamage]; }

  constructor(args: MoveRollArgs) {
    super(args);
    this.cellTo = args.cellTo;
    this.cellFrom = args.cellFrom;
  }

  static argsFromXml(xml: RollXML<BB2.MoveAction, BB2.DodgeResult>): MoveRollArgs {
    let args = super.argsFromXml(xml);
    let target = 0, modifier = 0;
    if (
      xml.boardActionResult.SubResultType && [
        SUB_RESULT_TYPE.ChoiceUseDodgeTackle,
        SUB_RESULT_TYPE.ChoiceUseDodgeSkill
      ].includes(xml.boardActionResult.SubResultType)
    ) {
      // A dodge that fails in tackle and prompts for a team reroll doesn't have the requirement attached, so
      // pull them from the later roll
      let nextStep = xml.replay.ReplayStep[xml.stepIndex + 1];
      let nextActions = 'RulesEventBoardAction' in nextStep && nextStep.RulesEventBoardAction ? ensureList(nextStep.RulesEventBoardAction) : [];
      let nextResult = ensureList(nextActions[0].Results && nextActions[0].Results.BoardActionResult)[0] as BB2.DodgeResult;
      target = nextResult.Requirement || 0;
      modifier = (nextResult.ListModifiers == "" ? [] : ensureList(nextResult.ListModifiers.DiceModifier || []))
        .map((modifier) => modifier.Value || 0)
        .reduce((a, b) => a + b, 0) || 0;
    }
    return {
      ...args,
      cellFrom: convertCell(xml.action.Order.CellFrom),
      cellTo: convertCell(xml.action.Order.CellTo.Cell),
      target,
      modifier
    }
  }
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.knockdownValue(this.activePlayer, expected).add(this.turnoverValue);
  }
  passValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    if (this.activePlayer && this.activePlayer.isBallCarrier) {
      return ballPositionValue(this.activePlayer.team, this.cellTo).subtract(
        ballPositionValue(this.activePlayer.team, this.cellFrom)
      );
    } else {
      return new SingleValue("Dodge", 0);
    }
  }
}

class JumpUpRoll extends PlayerD6Roll {
  get rollName() { return "Jump-Up"; }
  get handledSkills(): SKILL[] {return [SKILL.JumpUp]};
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    // Jump Up failure means the block fails to activate, so the player is no longer
    // available for this turn.
    return this.onTeamValue(this.activePlayer).product(-1);
  }
}

class LeapRoll extends PlayerD6Roll {
  cellFrom: Internal.Cell;
  cellTo: Internal.Cell;
  get rollName() { return "Leap"; }
  get dependentConditions(): DependentCondition[] { return [reroll, samePlayerMove, nonFoulDamage]; }

  constructor(args: MoveRollArgs) {
    super(args);
    this.cellFrom = args.cellFrom;
    this.cellTo = args.cellTo;
  }
  static argsFromXml(xml: RollXML<BB2.LeapAction, BB2.LeapResult>): MoveRollArgs {
    return {
      ...super.argsFromXml(xml),
      cellFrom: convertCell(xml.action.Order.CellFrom),
      cellTo: convertCell(xml.action.Order.CellTo.Cell),
    };
  }
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.knockdownValue(this.activePlayer).add(this.turnoverValue);
  }
  passValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
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
  get rerollSkill(): undefined | SKILL { return SKILL.Pass; }
  get handledSkills(): SKILL[] {return [SKILL.Pass, SKILL.StrongArm, SKILL.Accurate]};
  get dependentConditions(): DependentCondition[] { return [catchOrInterception, samePlayerMove, reroll]; }
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    // TODO: Failed pass doesn't turn over, it causes the ball to scatter. If it scatters to another
    // player, then it's not a turnover.
    // TODO: Account for fumbles.
    return this.turnoverValue;
  }
}

class ThrowTeammateRoll extends ModifiedD6SumRoll {
  get rollName() { return "Throw Teammate"; }
  get handledSkills(): SKILL[] {return [SKILL.ThrowTeamMate]};
  get dependentConditions(): DependentCondition[] { return [samePlayerMove, reroll]; }
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    // TODO: Throw teammate only turns over if the thrown player has the ball, and even then, only
    // TODO: Failed pass doesn't turn over, it causes the ball to scatter. If it scatters to another
    // player, then it's not a turnover.
    // TODO: Account for fumbles.
    return new SingleValue("Fail", 0);
  }

}

class InterceptionRoll extends ModifiedD6SumRoll {
  get rollName() { return "Intercept"; }
  get handledSkills(): SKILL[] {return [SKILL.ExtraArms]};
  // Interception rolls on the thrower, not the interceptee. If it "passes",
  // then the ball is caught
  passValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.turnoverValue;
  }
}

class WakeUpRoll extends PlayerD6Roll {
  get rollName() { return "Wake Up"; }
  constructor(attrs: ModifiedD6SumRollArgs) {
    super(attrs);
    this.finalBoardState.activeTeam = this.activePlayer?.team;
  }
  passValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
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

class GFIRoll extends PlayerD6Roll {
  cellFrom: Internal.Cell;
  cellTo: Internal.Cell;
  get rollName() { return "GFI"; }
  get handledSkills(): SKILL[] {return [SKILL.SureFeet]};
  get rerollSkill(): undefined | SKILL { return SKILL.SureFeet; }
  get dependentConditions(): DependentCondition[] { return [nonFoulDamage, reroll, samePlayerMove]; }

  constructor(args: MoveRollArgs) {
    super(args);
    this.cellFrom = args.cellFrom;
    this.cellTo = args.cellTo;
  }
  static argsFromXml(xml: RollXML<BB2.MoveAction, BB2.GFIResult>): MoveRollArgs {
    return {
      ...super.argsFromXml(xml),
      cellFrom: convertCell(xml.action.Order.CellFrom),
      cellTo: convertCell(xml.action.Order.CellTo.Cell),
    };
  }

  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.knockdownValue(this.activePlayer, expected).add(this.turnoverValue);
  }
  passValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
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
  get handledSkills(): SKILL[] {return [SKILL.DisturbingPresence, SKILL.Catch, SKILL.ExtraArms]};
  get rerollSkill(): undefined | SKILL { return SKILL.Catch; }

  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.turnoverValue;
  }
}

class StandUpRoll extends PlayerD6Roll {
  get rollName() { return "Stand Up"; }
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class TakeRootRoll extends PlayerD6Roll {
  get rollName() { return "Take Root"; }
  get handledSkills(): SKILL[] {return [SKILL.TakeRoot]};
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.knockdownValue(this.activePlayer, false);
  }
}

class LandingRoll extends PlayerD6Roll {
  get rollName() { return "Landing"; }
  get dependentConditions(): DependentCondition[] { return [reroll, samePlayerMove, nonFoulDamage]; }
  failValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    // TODO: Handle a turnover if the thrown player has the ball
    return this.knockdownValue(this.activePlayer, expected);
  }
}

class FireballRoll extends PlayerD6Roll {
  get rollName() { return "Fireball"; }
  get dependentConditions(): DependentCondition[] { return [nonFoulDamage]; }
  passValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.knockdownValue(this.activePlayer, expected);
  }
}

class LightningBoltRoll extends PlayerD6Roll {
  get rollName() { return "Lightning Bolt"; }
  get dependentConditions(): DependentCondition[] { return [reroll, samePlayerMove, nonFoulDamage]; }
  static argsFromXml(xml: RollXML<BB2.WizardLightningAction, BB2.LightningBoltResult>): ModifiedD6SumRollArgs {
    const args = super.argsFromXml(xml);
    args.activePlayer = args.initialBoardState.playerAtPosition(convertCell(xml.action.Order.CellTo.Cell))!;
    return args;
  }
  passValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
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
  activePlayer: Player;

  constructor(args: InjuryRollArgs) {
    super(args);
    this.canPileOn = args.canPileOn;
    this.isPileOn = args.isPileOn;
    this.pilingOnPlayer = args.pilingOnPlayer;
    this.isFoul = args.isFoul;
    this.foulingPlayer = args.foulingPlayer;
    this.modifier = args.modifier;
    this.activePlayer = args.activePlayer!;
    console.assert(
      this.isFoul === !(this.foulingPlayer === undefined),
      { msg: "Must have a fouling player for a foul", roll: this }
    )
  }

  get handledSkills(): SKILL[] {return [SKILL.MightyBlow, SKILL.DirtyPlayer, SKILL.Stunty]};
  get diceSeparator() { return '+'; }
  get dependentConditions(): DependentCondition[] { return [reroll]; }

  static argsFromXml(xml: RollXML<any, any>): InjuryRollArgs {
    const args = super.argsFromXml(xml);
    let canPileOn = false, isPileOn = false, pilingOnPlayer, isFoul = false, foulingPlayer, modifier = 0;

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
      let actions = 'RulesEventBoardAction' in xml.replayStep ? ensureList(xml.replayStep.RulesEventBoardAction) : [];
      let foulAction = actions[0] as BB2.FoulAction;
      foulingPlayer = args.finalBoardState.playerById(foulAction.PlayerId!);
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
  injuryValue(total: number) {
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
    let { pass, fail } = this.diceCombinations.reduce((acc: {pass: number, fail: number}, dice: number[]) => {
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

  get diceCombinations(): number[][] {
    var combinations = [];
    for (var first = 1; first <= 6; first++) {
      for (var second = 1; second <= 6; second++) {
        combinations.push([first, second]);
      }
    }
    Object.defineProperty(this, 'diceCombinations', { value: combinations });
    return this.diceCombinations;
  }

  value(dice: number[], expected: boolean): Distribution {
    if (this.canPileOn) {
      return new SingleValue(`Pile On Decision Pending`, 0);
    }
    var total = dice[0] + dice[1] + this.modifier;
    var value = this.injuryValue(total);
    if (this.isPileOn) {
      // Using Piling On means the piling on player is out for a whole turn;
      value = value.subtract(this.onTeamValue(this.pilingOnPlayer!));
    }
    if (this.isFoul && dice[0] == dice[1]) {
      value = value.add(this.casValue(this.foulingPlayer!).named('Sent Off'), this.turnoverValue);
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
  get handledSkills(): SKILL[] {return [SKILL.NurglesRot, SKILL.Decay]};
  // TODO: Handle skills
  // TODO: Selecting the Apo result seems to read as a separate roll
  get diceSeparator() { return ''; }

  constructor(args: CasualtyRollArgs) {
    super(args);
    this.isFoul = args.isFoul;
  }
  static argsFromXml(xml: RollXML<BB2.BlockAction | BB2.FoulAction, BB2.CasualtyResult>): CasualtyRollArgs {
    let args = super.argsFromXml(xml);
    return {
      ...args,
      // Casualty dice are also doubled up, and also both rolls appear when an apoc is used (so the last one is the valid one)
      dice: args.dice.slice(0, args.dice.length/2).slice(-1),
      isFoul: xml.action.ActionType == ACTION_TYPE.Foul,
    };
  }

  casName(dice: number[]): string {
    if (dice[0] < 4) {
      return "Badly Hurt";
    } else if (dice[0] < 5) {
      return "Miss Next Game";
    } else if (dice[0] == 5 && dice[1] <= 2) {
      return "Niggling Injury";
    } else if (dice[0] == 5 && dice[1] <= 4) {
      return "-MA";
    } else if (dice[0] == 5 && dice[1] <= 6) {
      return "-AV";
    } else if (dice[0] == 5 && dice[1] == 7) {
      return "-AG";
    } else if (dice[0] == 5 && dice[1] == 8) {
      return "-ST";
    } else if (dice[0] == 6) {
      return "Dead!";
    }
    return `Unknown Injury ${dice}`
  }
  value(dice: number[], expected: boolean): Distribution {
    return new SingleValue("CAS", 0); // Need to figure out how to grade losing player value for multiple matches
  }
  get _possibleOutcomes() {
    var outcomes = [];
    for (var type = 1; type <= 6; type++) {
      for (var subtype = 1; subtype <= 8; subtype++) {
        outcomes.unshift({
          name: `${type}${subtype}`,
          value: this.value([type, subtype], true),
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

class RegenerationRoll extends PlayerD6Roll {
  get rollName() { return "Regeneration"; }
  get handledSkills(): SKILL[] {return [SKILL.Regeneration]};

  passValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
    return this.koValue(this.activePlayer).product(-0.5).named('Regeneration');
  }
}

interface MoveActionArgs extends RollArgs<undefined> {
  cellFrom: Internal.Cell,
  cellTo: Internal.Cell,
  activePlayer: Player,
}

export class MoveAction extends Roll<undefined> {
  cellFrom: Internal.Cell;
  cellTo: Internal.Cell;
  activePlayer: Player;
  get rollName() { return "Move"; }
  get dependentConditions(): DependentCondition[] { return [sameTeamMove]; }
  get handledSkills(): SKILL[] {return [SKILL.JumpUp]};

  static ignore() {
    return false;
  }

  constructor (attrs: MoveActionArgs) {
    super(attrs);
    this.activePlayer = attrs.activePlayer;
    this.cellFrom = attrs.cellFrom;
    this.cellTo = attrs.cellTo;
  }

  static argsFromXml(xml: RollXML<any, any>): MoveActionArgs {
    let args = super.argsFromXml(xml);
    return {
      ...args,
      activePlayer: args.activePlayer!,
      cellFrom: xml.action.Order.CellFrom,
      cellTo: xml.action.Order.CellTo.Cell,
    };
  }
  get description() {
    const from = this.cellFrom;
    const to = this.cellTo;
    return `Move: [${this.activePlayer.team.shortName}] ${this.activePlayer.name} - (${from.x}, ${from.y}) \u2192 (${to.x}, ${to.y})`;
  }

  get shortDescription() {
    const from = this.cellFrom;
    const to = this.cellTo;
    return `Move: ${this.activePlayer.name} - (${from.x}, ${from.y}) \u2192 (${to.x}, ${to.y})`;
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

class NoValueRoll<D> extends Roll<D> {
  static ignore(xml: RollXML<BB2.RulesEventBoardAction, any>) {
    return true;
  }
  value() {
    return new SingleValue("No Value", 0);
  }
  get expectedValue() {
    return 0;
  }
  simulateDice() {
    return undefined;
  }
  get _possibleOutcomes() {
    return new SingleValue("No Value", 0);
  }
}

function isKickoffRoll(roll: Roll<any>, dependent: Roll<any>) {
  return dependent instanceof KickoffEventRoll;
}

interface KickoffRollArgs extends RollArgs<number> {
  diceSum: KICKOFF_RESULT,
  kickoffTeam: SIDE,
}

export class KickoffRoll extends Roll<number> {
  kickoffTeam: number;
  diceSum: KICKOFF_RESULT;
  constructor(args: KickoffRollArgs) {
    super(args);
    this.kickoffTeam = args.kickoffTeam;
    this.diceSum = args.diceSum;
  }

  get rollName() { return "Kickoff"; }
  get dependentConditions(): DependentCondition[] { return [isKickoffRoll]; }
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
      startIndex: {end: false, step: xml.stepIndex, subStep: REPLAY_SUB_STEP.Kickoff},
      kickoffTeam: xml.replayStep.BoardState.KickOffTeam || 0,
      skillsInEffect: [],
      rollStatus: ROLL_STATUS.NoStatus,
      activePlayer: undefined,
      rollType: ROLL.KickoffEvent,
      ignore: false,
      actionType: ACTION_TYPE.Kickoff,
      resultType: RESULT_TYPE.Passed,
      subResultType: undefined,
      isReroll: false,
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
  kickoffValue(total: KICKOFF_RESULT): Distribution {
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

  get improbability(): number {
    let { pass, fail } = this.diceCombinations.reduce((acc: {pass: number, fail: number}, dice: KICKOFF_RESULT[]) => {
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


    let total: KICKOFF_RESULT = this.dice[0] + this.dice[1];
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

  get diceCombinations(): [KICKOFF_RESULT, KICKOFF_RESULT][] {
    var combinations = [];
    for (var first = 1; first <= 6; first++) {
      for (var second = 1; second <= 6; second++) {
        combinations.push([first, second]);
      }
    }
    Object.defineProperty(this, 'diceCombinations', { value: combinations });
    return this.diceCombinations;
  }

  value(dice: KICKOFF_RESULT[]): Distribution {
    var total = dice[0] + dice[1];
    var value = this.kickoffValue(total);
    return value;
  }

  get _possibleOutcomes() {
    var outcomesByName: Record<string, {name: string, value: Distribution}[]> = {};
    for (var combination of this.diceCombinations) {
      var outcomeList = outcomesByName[this.value(combination).name];
      if (!outcomeList) {
        outcomeList = outcomesByName[this.value(combination).name] = [];
      }
      outcomeList.unshift({
        name: (combination[0] + combination[1]).toString(),
        value: this.value(combination)
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

interface KickoffEventRollXML {
  initialBoard: BB2.BoardState,
  replayStep: BB2.GameTurnStep,
  stepIndex: number,
  messageData: BB2.KickoffEventMessageData,
  gameLength: number,
}
 // @ts-ignore
class KickoffEventRoll extends ModifiedD6SumRoll {
  kickoffTeam: SIDE;
  messageData: any;

  constructor(args: KickoffEventRollArgs) {
    super(args);
    this.kickoffTeam = args.kickoffTeam;
    this.messageData = args.messageData;
  }

  get activeTeam() {
    return this.finalBoardState.teams[this.kickoffTeam];
  }
  static argsFromXml(xml: KickoffEventRollXML): KickoffEventRollArgs {
    let finalBoardState = undefined;
    let kickoffTeam = SIDE.home;
    finalBoardState = new BoardState(BoardState.argsFromXml(xml.replayStep.BoardState));
    kickoffTeam = xml.replayStep.BoardState.KickOffTeam || SIDE.home;

    return {
      initialBoardState: new BoardState(BoardState.argsFromXml(xml.initialBoard)),
      finalBoardState,
      startIndex: {end: false, step: xml.stepIndex, subStep: REPLAY_SUB_STEP.Kickoff},
      messageData: xml.messageData,
      kickoffTeam,
      target: 0,
      modifier: 0,
      skillsInEffect: [],
      rollStatus: ROLL_STATUS.NoStatus,
      rollType: ROLL.KickoffEvent,
      actionType: ACTION_TYPE.Kickoff,
      activePlayer: undefined,
      dice: [],
      ignore: false,
      resultType: RESULT_TYPE.Passed,
      subResultType: undefined,
      isReroll: false,
      gameLength: xml.gameLength,
    };
  }
}

export class PitchInvasionRoll extends KickoffEventRoll {
  messageData: BB2.PitchInvasionMessage;
  stunned: boolean;
  activePlayer: Player;

  get rollName() { return "Pitch Invasion"; }
  constructor(args: KickoffEventRollArgs) {
    super(args);
    this.messageData = args.messageData;
    this.activePlayer = this.finalBoardState.playerById(this.messageData.RulesEventPlayerInvaded.PlayerId)!;
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

  passValue(expected: boolean, rollTotal: number, modifiedTarget: number) {
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



export class SetupAction extends NoValueRoll<undefined> {
  get rollName() { return "Setup"; }
  get dependentConditions(): DependentCondition[] { return [setup]; }
  static hideDependents = true;
  static ignore(xml: RollXML<BB2.RulesEventBoardAction, any>) {
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
  static argsFromXml(xml: any): RollArgs<undefined> {
    return {
      initialBoardState: new BoardState(BoardState.argsFromXml(xml.initialBoard)),
      finalBoardState: new BoardState(BoardState.argsFromXml(xml.replayStep.BoardState)),
      ignore: this.ignore(xml),
      startIndex: {end: false, step: xml.stepIndex, subStep: REPLAY_SUB_STEP.SetupAction},
      gameLength: xml.gameLength,
      skillsInEffect: [],
      rollStatus: ROLL_STATUS.NoStatus,
      activePlayer: undefined,
      rollType: ROLL.Leap, // TODO: This is wrong!
      dice: [],
      actionType: ACTION_TYPE.Leap, // TODO: This is wrong too!
      resultType: RESULT_TYPE.Passed,
      subResultType: undefined,
      isReroll: false,
    };
  }
}

class PushChoice extends NoValueRoll<number> {
  get rollName() { return "Push"; }
  get handledSkills(): SKILL[] {return [SKILL.SideStep]};
}

class FollowUpChoice extends NoValueRoll<number> {
  get rollName() { return "Follow Up"; }
  get handledSkills(): SKILL[] {return [SKILL.Frenzy]};
}

class FoulPenaltyRoll extends NoValueRoll<number> { }

export class UnknownRoll {
  name: string;
  xml: any;
  ignore: boolean;
  rolls?: (Roll<any> | UnknownRoll)[];

  constructor(name: string, xml: any) {
    this.name = name;
    this.xml = xml;
    this.ignore = true;
  }
}

const ROLL_TYPES: Record<ROLL, unknown> = {
  [ROLL.AlwaysHungry]: "Always Hungry",
  [ROLL.Animosity]: "Animosity",
  [ROLL.Armor]: ArmorRoll,
  [ROLL.BallAndChain]: "Ball And Chain",
  [ROLL.Bite]: "Bite",
  [ROLL.Block]: BlockRoll,
  [ROLL.Bloodlust]: "Bloodlust",
  [ROLL.BombKD]: "Bomb KD",
  [ROLL.BoneHead]: BoneHeadRoll,
  [ROLL.Bribe]: "Bribe",
  [ROLL.Casualty]: CasualtyRoll,
  [ROLL.Catch]: CatchRoll,
  [ROLL.ChainsawArmor]: "Chainsaw Armor",
  [ROLL.ChainsawKickback]: "Chainsaw (Kickback?)",
  [ROLL.Dauntless]: DauntlessRoll,
  [ROLL.DivingTackle]: "Diving Tackle",
  [ROLL.Dodge]: DodgeRoll,
  [ROLL.Dodge]: undefined, // Choic to use Dodge
  [ROLL.DodgePick]: "Dogde Pick",
  [ROLL.EatTeammate]: "Eat Teammate",
  [ROLL.Fans]: undefined, // Fans
  [ROLL.Fireball]: FireballRoll,
  [ROLL.FollowUp]: undefined, //FollowUpChoice,
  [ROLL.FoulAppearance]: FoulAppearanceRoll,
  [ROLL.FoulPenalty]: FoulPenaltyRoll,
  [ROLL.GFI]: GFIRoll,
  [ROLL.HailMaryPass]: "Hail Mary Pass",
  [ROLL.HalflingChef]: "Halfling Chef",
  [ROLL.HypnoticGaze]: "Hypnotic Gaze",
  [ROLL.InaccuratePassScatter]: undefined, // Inaccurate Pass Scatter
  [ROLL.Injury]: InjuryRoll,
  [ROLL.Interception]: InterceptionRoll,
  [ROLL.Juggernaut]: undefined, // Juggernaut
  [ROLL.JumpUp]: JumpUpRoll,
  [ROLL.KickoffEvent]: KickoffRoll,
  [ROLL.KickoffGust]: undefined, // Kickoff Gust
  [ROLL.KickoffScatter]: undefined, // Kickoff Scatter
  [ROLL.Landing]: LandingRoll,
  [ROLL.Leap]: LeapRoll,
  [ROLL.LightningBolt]: LightningBoltRoll,
  [ROLL.Loner]: "Loner",
  [ROLL.Multiblock]: "Multiblock",
  [ROLL.Pass]: PassRoll,
  [ROLL.Pickup]: PickupRoll,
  [ROLL.PileOnArmorRoll]: ArmorRoll, // Armor Roll with Pile On. If followed by a RollType 59 w/ IsOrderCompleted, then PO happened. Otherwise, no PO
  [ROLL.PileOnInjuryRoll]: InjuryRoll, // Injury Roll with Pile On. If followed by a RollType 60 w/ IsOrderCompleted, then PO happened, otherwise, no PO?
  [ROLL.Pro]: "Pro",
  [ROLL.Push]: undefined, //PushChoice,
  [ROLL.RaiseDead]: "Raise Dead",
  [ROLL.ReallyStupid]: ReallyStupidRoll,
  [ROLL.Regeneration]: RegenerationRoll,
  [ROLL.SafeThrow]: "Safe Throw",
  [ROLL.Shadowing]: "Shadowing",
  [ROLL.Stab]: "Stab",
  [ROLL.StandFirm]: undefined, // Choice to use Stand Firm
  [ROLL.StandFirm2]: "Stand Firm 2",
  [ROLL.StandUp]: StandUpRoll,
  [ROLL.SwealteringHeat]: "Swealtering Heat",
  [ROLL.TakeRoot]: TakeRootRoll,
  [ROLL.Tentacles]: "Tentacles",
  [ROLL.ThrowIn]: undefined, // Throw-in Roll
  [ROLL.ThrowTeammate]: ThrowTeammateRoll,
  [ROLL.TouchBack]: undefined, // Touch Back
  [ROLL.WakeUp]: WakeUpRoll,
  [ROLL.Weather]: undefined, // Weather
  [ROLL.WildAnimal]: WildAnimalRoll,
  [ROLL.Wrestle2]: undefined, // Some sort of wrestle roll that doesn't do anything
};

const KICKOFF_RESULT_TYPES: Record<KICKOFF_RESULT, typeof KickoffEventRoll | string> = {
  [KICKOFF_RESULT.PitchInvasion]: PitchInvasionRoll,
  [KICKOFF_RESULT.Blitz]: "Blitz",
  [KICKOFF_RESULT.BrilliantCoaching]: "Brilliant Coaching",
  [KICKOFF_RESULT.ChangingWeather]: "Changing Weather",
  [KICKOFF_RESULT.CheeringFans]: "Cheering Fans",
  [KICKOFF_RESULT.GetTheRef]: "Get The Ref",
  [KICKOFF_RESULT.HighKick]: "High Kick",
  [KICKOFF_RESULT.PerfectDefence]: "Perfect Defense",
  [KICKOFF_RESULT.QuickSnap]: "Quick Snap",
  [KICKOFF_RESULT.Riot]: "Riot",
  [KICKOFF_RESULT.ThrowARock]: "Throw A Rock",
};
