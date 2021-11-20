<script lang="ts">
  import type {
    Team,
    PitchSquareProps,
    Preview,
    WakeConditions,
    Dugout,
    BallProps,
  } from "./types.js";
  import { onMount, tick } from "svelte";
  import { Row, Col, ButtonToolbar, Button, Icon, Alert } from "sveltestrap";
  import HomeDugout from "./HomeDugout.svelte";
  import AwayDugout from "./AwayDugout.svelte";
  import Pitch from "./Pitch.svelte";
  import SelectedPlayer from "./SelectedPlayer.svelte";
  import {
    SITUATION,
    ROLL,
    WEATHER,
    RESULT_TYPE,
    ACTION_TYPE,
    getPlayerSprite,
    SIDE,
    weatherTable,
    STATUS,
KICKOFF_RESULT,
  } from "../constants.js";
  import FixedRatio from "./FixedRatio.svelte";
  import Banner from "./Banner.svelte";
  import type { ReplayPosition, ReplayPreview } from "../replay-utils.js";
  import { linearReplay } from "../replay-utils.js";
  import {
    period,
  } from "../replay-utils.js";
  import {
    translateStringNumberList,
    ensureList,
    REPLAY_SUB_STEP,
    ensureKeyedList,
  } from "../replay/BB2.js";
  
  import {
    replay,
    replayCurrent,
    replayTarget,
    timing,
    error,
    selectedPlayer,
    hoveredPlayer,
    replayPreview,
  } from "../stores.js";
  import he from "he";
  import type * as BB2 from "../replay/BB2.js";
  import * as Internal from "../replay/Internal.js";
  import {
    convertCell,
    playerNumberToSide,
    captureCheckpoint,
  } from "../replay/BB2toInternal.js";
  import { cellEq, cellString } from "../replay/Internal.js";
  import _ from "underscore";
  import type { DeepReadonly } from "ts-essentials";
  import type { PlayerDefinitions, PlayerProperties } from "./types.js";
  import type * as T from "./types.js";
  import type { PlayerStates } from "../replay/Internal.js";

  export let playing = false;

  let lastChainPush: BB2.PlayerId | undefined,
    races: string[] = [],
    teams: Internal.ByTeam<Team> = { home: emptyTeam(), away: emptyTeam() },
    pitch: T.Pitch = {},
    ball: BallProps | undefined,
    blitzerId: Internal.PlayerNumber,
    banner: string | undefined = undefined,
    weather = WEATHER.Nice,
    skipping = false,
    underPreview: Preview | undefined = undefined,
    previewing: ReplayPreview | undefined = undefined,
    shouldWake: WakeConditions | undefined,
    abort = new AbortController(),
    current: number = 0,
    positions: ReplayPosition[] = [],
    playerStates: PlayerStates = {},
    playerDefs: PlayerDefinitions = {},
    playerProperties: PlayerProperties = {},
    playerPositions = {};

  function emptyTeam(): Team {
    return {
      logo: "",
      score: 0,
      name: "",
      turn: 1,
      active: false,
      rerolls: {
        available: 0,
        total: 0,
      },
      inducements: {
        wizard: false,
        babes: 0,
        apo: {
          available: 0,
          total: 0,
        },
        chef: false,
        bribes: {
          available: 0,
          total: 0,
        },
        igor: false,
      },
    };
  }

  $: {
    if (!shouldWake) {
      shouldWake = {
        replayPreview: $replayPreview,
        playing: playing,
        replayTarget: $replayTarget,
        replay: $replay,
      };
    }
    if (
      shouldWake.replayPreview != $replayPreview ||
      shouldWake.playing != playing ||
      shouldWake.replayTarget != $replayTarget ||
      shouldWake.replay != $replay
    ) {
      shouldWake.replayPreview = $replayPreview;
      shouldWake.playing = playing;
      shouldWake.replayTarget = $replayTarget;
      shouldWake.replay = $replay;
      abort.abort();
    }
    positions = $replay ? linearReplay($replay!.fullReplay) : [];
  }
  $: playerPositions = calcPlayerPositions(playerStates);

  onMount(() => {
    let url = new URL(window.location.href);
    $timing = parseInt(url.searchParams.get("timing") || $timing.toString());
    if (url.searchParams.get("st")) {
      playing = false;
    } else {
      playing = true;
    }
    handleGameMetadata($replay!.fullReplay);
    playerLoop();
    return () => console.log("destroyed");
  });

  function calcPlayerPositions(
    playerStates: Internal.PlayerStates
  ): Record<string, Internal.PlayerNumber> {
    const positions: Record<string, Internal.PlayerNumber> = {};
    const boxCounts: Record<Internal.Side, Record<keyof Dugout, number>> = {
      home: {
        cas: 0,
        ko: 0,
        reserve: 0,
      },
      away: {
        cas: 0,
        ko: 0,
        reserve: 0,
      },
    };
    const sitBoxes: Record<
      Exclude<SITUATION, SITUATION.Active>,
      keyof Dugout
    > = {
      [SITUATION.Casualty]: "cas",
      [SITUATION.SentOff]: "cas",
      [SITUATION.KO]: "ko",
      [SITUATION.Reserves]: "reserve",
    };
    Object.entries(playerStates).forEach(([sid, player]) => {
      if (player.pitchCell && !offPitch(player.pitchCell)) {
        positions[cellString(player.pitchCell)] = parseInt(sid);
      } else if (player.situation != SITUATION.Active) {
        const box = sitBoxes[player.situation];
        const side = playerNumberToSide(parseInt(sid));
        const count = boxCounts[side][box]++;
        positions[`${side}-${box}-${count}`] = parseInt(sid);
      }
    });
    return positions;
  }

  async function resetFromBoardState(boardState: BB2.BoardState) {
    resetToCheckpoint(captureCheckpoint(boardState));
    teams.home = processTeam(
      SIDE.home,
      boardState.ListTeams.TeamState[0],
      boardState.ActiveTeam != 1
    );
    teams.away = processTeam(
      SIDE.away,
      boardState.ListTeams.TeamState[1],
      boardState.ActiveTeam == 1
    );
    await step();
  }

  function processTeam(side: SIDE, team: BB2.TeamState, active: boolean): Team {
    let maxRerollsThisPeriod = $replay!.fullReplay.unhandledSteps.reduce(
      (acc: number, step: BB2.ReplayStep) => {
        if (!("BoardState" in step)) {
          return acc;
        }
        let stepTeam = step.BoardState.ListTeams.TeamState[side];
        let stepPeriod = period(stepTeam.GameTurn || 1);
        if (stepPeriod == period(team.GameTurn || 1)) {
          acc = Math.max(acc, stepTeam.RerollNumber || 0);
        }
        return acc;
      },
      0
    );
    let maxApos = $replay!.fullReplay.unhandledSteps.reduce(
      (acc: number, step: BB2.ReplayStep) => {
        if (!("BoardState" in step)) {
          return acc;
        }
        let stepTeam = step.BoardState.ListTeams.TeamState[side];
        return Math.max(acc, stepTeam.ApothecaryNumber || 0);
      },
      0
    );
    return {
      logo: team.Data.Logo.toLowerCase(),
      score: team.Touchdown || 0,
      name: he.decode(team.Data.Name.toString()),
      turn: team.GameTurn || 1,
      active,
      rerolls: {
        available: team.RerollNumber || 0,
        total: Math.max(maxRerollsThisPeriod, team.Data.Reroll || 0), // TODO: Max RerollNumber over course of half
      },
      inducements: {
        wizard: team.Wizard == 1,
        babes: team.Babes || 0,
        apo: {
          available: team.ApothecaryNumber || 0,
          total: Math.max(maxApos, team.Data.Apothecary || 0), // TODO: Max ApoNumber over course of game
        },
        chef: team.HalflingChef == 1,
        bribes: {
          available: team.BribeNumber || 0,
          total: team.Bribes || 0,
        },
        igor: team.Igor == 1,
      },
      //inducements
    };
  }

  function offPitch(cell: Internal.Cell): boolean {
    return cell.x == -1 && cell.y == -1;
  }

  function getPitchSquare(cell: Internal.Cell): PitchSquareProps {
    if (offPitch(cell)) {
      return {};
    }
    let key = cellString(cell);
    return pitch[key] || {};
  }
  function setPitchSquare(
    cell: Internal.Cell,
    props: PitchSquareProps
  ): PitchSquareProps {
    if (offPitch(cell)) {
      return {};
    }
    let key = cellString(cell);
    pitch[key] = props;
    return props;
  }

  function badAction(action: never): never;
  function badAction(action: BB2.RulesEventBoardAction) {
    console.error(`Unexpected action ${JSON.stringify(action)}`);
  }

  function unhandledReplayPosition(position: never): never;
  function unhandledReplayPosition(position: ReplayPosition) {
    console.error(`Unhandled replay position ${JSON.stringify(position)}`);
  }

  function dispatchAction(
    action: BB2.RulesEventBoardAction,
    result: BB2.ActionResult<BB2.RulesEventBoardAction>
  ) {
    if (!("ActionType" in action)) {
      return handleMove(action, result as BB2.ActionResult<typeof action>);
    }
    switch (action.ActionType) {
      case ACTION_TYPE.Block:
        return handleBlock(action, result as BB2.ActionResult<typeof action>);
      case ACTION_TYPE.Blitz:
        return handleBlock(action, result as BB2.ActionResult<typeof action>);
      case ACTION_TYPE.Pass:
        return handlePass(action, result as BB2.ActionResult<typeof action>);
      case ACTION_TYPE.Handoff:
        return handleHandoff(action);
      case ACTION_TYPE.Foul:
        return handleFoul(action);
      case ACTION_TYPE.TakeDamage:
        return handleTakeDamage(
          action,
          result as BB2.ActionResult<typeof action>
        );
      case ACTION_TYPE.KickoffTarget:
        return handleKickoff(action);
      case ACTION_TYPE.KickoffScatter:
        return handleScatter(action);
      case ACTION_TYPE.Catch:
        return handleCatch(action, result as BB2.ActionResult<typeof action>);
      case ACTION_TYPE.TouchDown:
        return handleTouchdown();
      case ACTION_TYPE.StunWake:
        return handleStunWake(action);
      case ACTION_TYPE.Pickup:
        return handlePickup(action, result as BB2.ActionResult<typeof action>);
      case ACTION_TYPE.ActivationTest:
        return handleActivationTest(
          action,
          result as BB2.ActionResult<typeof action>
        );
      case ACTION_TYPE.Leap:
        return handleMove(action, result as BB2.ActionResult<typeof action>);
      case ACTION_TYPE.ActivatePlayer:
        return handleActivate(action);
      case ACTION_TYPE.InitialWeather:
        return handleWeather(action, result as BB2.ActionResult<typeof action>);
      // case ACTION_TYPE.Turnover:
      //   return handleTurnover(action);
      case ACTION_TYPE.FansNumber:
      case ACTION_TYPE.WakeUp:
      case ACTION_TYPE.Landing:
      case ACTION_TYPE.EatTeamMate:
      case ACTION_TYPE.Shadowing:
      case ACTION_TYPE.Stab:
      case ACTION_TYPE.Chainsaw:
      case ACTION_TYPE.FrenzyStab:
      case ACTION_TYPE.BallChain:
      case ACTION_TYPE.HailMaryPass:
      case ACTION_TYPE.PilingOn:
      case ACTION_TYPE.MultiBlock:
      case ACTION_TYPE.HypnoticGaze:
      case ACTION_TYPE.KickOffReturn:
      case ACTION_TYPE.PassBlock:
      case ACTION_TYPE.HalflingChef:
      case ACTION_TYPE.WizardFireBallCast:
      case ACTION_TYPE.WizardFireball:
      case ACTION_TYPE.WizardLightning:
      case ACTION_TYPE.FoulRefCheck:
      case ACTION_TYPE.FreeMove:
      case ACTION_TYPE.DodgeAgDivingTackle:
      case ACTION_TYPE.SwelteringHeat:
        // TODO: Handle These
        console.warn(`Unhandled action ${JSON.stringify(action)}`);
        break;
      default:
        badAction(action);
    }
  }
  function sleep(ms: number) {
    let signal = abort.signal;
    return new Promise<void>((resolve) => {
      const listener = () => {
        clearTimeout(timer);
        abort = new AbortController();
        resolve();
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", listener);
        resolve();
      }, ms);
      if (signal?.aborted) {
        listener();
      }
      signal?.addEventListener("abort", listener);
    });
  }

  async function step(ticks = 1) {
    if (skipping) {
      return;
    }
    await tick();
    let sleepTime = $timing * ticks;
    await sleep(sleepTime);
  }

  async function handleBoardAction(
    boardAction: BB2.RulesEventBoardAction,
    result: BB2.ActionResult<BB2.RulesEventBoardAction>
  ) {
    try {
      await dispatchAction(boardAction, result);
      await step();
    } catch (err) {
      await step();
      console.error("Action failed", { err, boardAction, result });
      throw err;
    }
  }

  async function handleBoardState(boardState: BB2.BoardState) {
    await resetFromBoardState(boardState);
  }

  async function stepReplay(updateUrl = true) {
    if (current >= positions.length) {
      current = 0;
    }
    const currentPosition = positions[current];

    if ("stepIdx" in currentPosition) {
      switch (currentPosition.subStep) {
        case REPLAY_SUB_STEP.SetupAction:
          break;
        case REPLAY_SUB_STEP.BoardAction:
          await handleBoardAction(
            currentPosition.action,
            currentPosition.result
          );
          break;
        case REPLAY_SUB_STEP.EndTurn:
          await handleTurnover(currentPosition.endTurn);
          break;
        case REPLAY_SUB_STEP.BoardState:
          await handleBoardState(currentPosition.boardState);
          break;
      }
    } else if ("type" in currentPosition) {
      switch (currentPosition.type) {
        case "gameStart":
          await handleGameStart(currentPosition);
          break;
        case "driveStart":
          await handleDriveStart(currentPosition);
          break;
        case "wakeupRoll":
          await handleWakeupRoll(currentPosition);
          break;
        case "setupAction":
          await handleSetupAction(currentPosition);
          break;
        case "kickoffTarget":
          await handleKickoffTarget(currentPosition);
          break;
        case "kickoffScatter":
          await handleKickoffScatter(currentPosition);
          break;
        case "kickoffEvent":
          await handleKickoffEvent(currentPosition);
          break;
        case "kickoffLanding":
          await handleKickoffLanding(currentPosition);
          break;
        case "wizardRoll":
          throw {
            msg: "Haven't implemented wizardRoll handling",
            currentPosition,
          };
        case "actionStep":
          throw {
            msg: "Haven't implemented actionStep handling",
            currentPosition,
          };
        case "gameOver":
          break;
        default:
          unhandledReplayPosition(currentPosition);
      }
    }
    if (updateUrl) {
      if (!skipping) {
        replayCurrent.set(current);
      }
      let url = new URL(window.location.href);
      url.searchParams.set("st", current.toString());
      window.history.replaceState({}, "", url.href);
    }
    current++;
  }

  async function jumpToPosition(position: number, updateUrl = true) {
    console.log("Jumping to position", {position})
    clearTemporaryState();
    // Walk back through the replay to find the most recent step with
    // the board state
    for (current = position; current >= 0; current--) {
      let currentPosition = positions[current];
      if (
        "subStep" in currentPosition &&
        currentPosition.subStep == REPLAY_SUB_STEP.BoardState
      ) {
        break;
      }
      if ("gameState" in currentPosition) {
        break;
      }
    }
    skipping = true;
    while (current < position) {
      await stepReplay(updateUrl);
    }
    skipping = false;
    await step();
    if (updateUrl) {
      replayCurrent.set(current);
    }
  }

  async function playerLoop() {
    while (true) {
      try {
        if (underPreview && !$replayPreview) {
          ({ teams, pitch, playing, current } = underPreview);
          playerStates = underPreview.playerStates;
          previewing = undefined;
          underPreview = undefined;
        } else if (
          underPreview &&
          $replayPreview &&
          previewing != $replayPreview
        ) {
          previewing = $replayPreview;
          teams = { home: emptyTeam(), away: emptyTeam() };
          pitch = {};
          playerStates = {};
          jumpToPosition($replayPreview.start, false);
          // resetFromBoardState($replay.fullReplay.unhandledSteps[$replayPreview.start.step - 1].BoardState, true);
        } else if (!underPreview && $replayPreview) {
          underPreview = {
            teams,
            pitch,
            playerStates,
            playerProperties,
            playing,
            current,
          };
          playing = false;
          previewing = $replayPreview;
          teams = { home: emptyTeam(), away: emptyTeam() };
          pitch = {};
          playerStates = {};
          jumpToPosition($replayPreview.start, false);
        }
        if (
          underPreview &&
          $replayPreview &&
          $replayTarget == $replayPreview.start
        ) {
          underPreview = {
            teams,
            pitch,
            playerStates,
            playerProperties,
            playing,
            current,
          };
          $replayTarget = undefined;
          jumpToPosition($replayPreview.start);
        }
        if (current >= positions.length) {
          current = 0;
          continue;
        }
        if ($replayTarget) {
          const target = $replayTarget;
          $replayTarget = undefined;
          await jumpToPosition(target);
        }
        if ($replay && $replay.fullReplay && playing) {
          await stepReplay();
        } else {
          await sleep(1000);
        }
      } catch (err: any) {
        playing = false;
        error.set(err);
        console.error(err);
      }
    }
  }

  function jumpToPreviousActivation() {
    if (!$replay) {
      return;
    }
    if (current >= positions.length) {
      current = positions.length - 1;
    }
    let startingPosition = positions[current];
    for (let target = current - 1; target >= 0; target--) {
      let targetPosition = positions[target];
      if (
        "activationIdx" in targetPosition &&
        (("activationIdx" in startingPosition &&
          targetPosition.activationIdx < startingPosition.activationIdx) ||
          ("turnIdx" in startingPosition &&
            targetPosition.turnIdx < startingPosition.turnIdx) ||
          ("driveIdx" in startingPosition &&
            targetPosition.driveIdx < startingPosition.driveIdx) ||
          // All internal-format replay positions are before BB2 format replay positions
          !("driveIdx" in startingPosition)) &&
        targetPosition.actionStepIdx == 0
      ) {
        $replayTarget = target;
        return;
      }
      if (
        "action" in targetPosition &&
        "ActionType" in targetPosition.action &&
        targetPosition.action.ActionType == ACTION_TYPE.ActivatePlayer
      ) {
        $replayTarget = target;
        return;
      }
    }
  }

  function jumpToPreviousTurn() {
    if (!$replay) {
      return;
    }
    if (current >= positions.length) {
      current = positions.length - 1;
    }
    let startingPosition = positions[current];
    for (let target = current - 1; target >= 0; target--) {
      let targetPosition = positions[target];
      if (
        "activationIdx" in targetPosition &&
        (("turnIdx" in startingPosition &&
          targetPosition.turnIdx < startingPosition.turnIdx) ||
          ("driveIdx" in startingPosition &&
            targetPosition.driveIdx < startingPosition.driveIdx) ||
          // All internal-format replay positions are before BB2 format replay positions
          !("driveIdx" in startingPosition)) &&
        targetPosition.activationIdx == 0
      ) {
        $replayTarget = target;
        return;
      }
      if (
        "subStep" in targetPosition &&
        targetPosition.subStep == REPLAY_SUB_STEP.EndTurn
      ) {
        $replayTarget = target + 2;
        return;
      }
    }
  }
  function jumpToPreviousStep() {
    $replayTarget = current - 1;
  }
  function jumpToNextActivation() {
    if (!$replay) {
      return;
    }
    current = Math.min(current, positions.length - 1);
    let startingPosition = positions[current];
    for (let target = current + 1; target < positions.length; target++) {
      let targetPosition = positions[target];
      if (
        "activationIdx" in targetPosition &&
        (("activationIdx" in startingPosition &&
          targetPosition.activationIdx > startingPosition.activationIdx) ||
          ("turnIdx" in startingPosition &&
            targetPosition.turnIdx > startingPosition.turnIdx) ||
          ("driveIdx" in startingPosition &&
            targetPosition.driveIdx > startingPosition.driveIdx)) &&
        targetPosition.actionStepIdx == 0
      ) {
        $replayTarget = target;
        return;
      }
      if (
        "action" in targetPosition &&
        "ActionType" in targetPosition.action &&
        targetPosition.action.ActionType == ACTION_TYPE.ActivatePlayer
      ) {
        $replayTarget = target;
        return;
      }
    }
  }
  function jumpToNextTurn() {
    if (!$replay) {
      return;
    }
    if (current >= positions.length) {
      current = positions.length - 1;
    }
    let startingPosition = positions[current];
    for (let target = current + 1; target < positions.length; target++) {
      let targetPosition = positions[target];
      if (
        "activationIdx" in targetPosition &&
        (("turnIdx" in startingPosition &&
          targetPosition.turnIdx > startingPosition.turnIdx) ||
          ("driveIdx" in startingPosition &&
            targetPosition.driveIdx > startingPosition.driveIdx) ||
          // All internal-format replay positions are before BB2 format replay positions
          !("driveIdx" in startingPosition)) &&
        targetPosition.activationIdx == 0
      ) {
        $replayTarget = target;
        return;
      }
      if (
        "subStep" in targetPosition &&
        targetPosition.subStep == REPLAY_SUB_STEP.EndTurn
      ) {
        $replayTarget = target + 1;
        return;
      }
    }
  }

  function clearTemporaryState() {
    pitch = Object.fromEntries(
      Object.entries(pitch).map(([id, square]) => {
        if (square.dice || square.cell || square.foul) {
          return [
            id,
            { ...square, dice: undefined, cell: undefined, foul: undefined },
          ];
        } else {
          return [id, square];
        }
      })
    );
    playerProperties = Object.fromEntries(
      Object.entries(playerProperties).map(([id, props]) => {
        if (props.moving) {
          return [id, { ...props, moving: false }];
        } else {
          return [id, props];
        }
      })
    );
  }

  function handleGameMetadata(replay: Internal.Replay) {
    for (const side of ["home", "away"] as Internal.Side[]) {
      teams[side].logo = replay.gameDefinition.teams[side].logo;
      teams[side].name = replay.gameDefinition.teams[side].name;
      for (const [playerNumber, player] of replay.gameDefinition.teams[
        side
      ].players.entries()) {
        playerDefs[playerNumber] = player;
      }
    }

    races = Array.from(Object.values(playerDefs))
      .map((player) => {
        const { race } = getPlayerSprite(player.id.number, player.type);
        return race;
      })
      .filter((v, i, a) => a.indexOf(v) === i);
    playerDefs = playerDefs;
  }

  function validateCheckpoint(gameState: Internal.GameState) {
    console.assert(gameState, "Expected gameState");
    if (!gameState) {
      return;
    }
    let reset = false;
    Object.entries(gameState.players).forEach(([sid, state]) => {
      const id = parseInt(sid);
      const matches = _.isEqual(playerStates[id], state);
      console.assert(matches, "Player state didn't match gameState", {
        current,
        id,
        playerStates,
        gameStateState: state,
      });
      reset = reset || !matches;
    });
    if (weather != gameState.weather) {
      console.assert(false, "Weather didn't match gameState", {
        weather,
        gameStateWeather: gameState.weather,
      });
      reset = true;
    }
    if (reset) {
      resetToCheckpoint(gameState);
    }
  }

  function resetToCheckpoint(gameState: Internal.GameState) {
    playerStates = gameState.players;
    weather = gameState.weather;
  }

  async function handleGameStart(position: {
    type: "gameStart";
    replay: Internal.Replay;
  }) {
    weather = position.replay.initialWeather;
  }

  async function handleDriveStart(
    position: DeepReadonly<{
      type: "driveStart";
      driveIdx: number;
      drive: Internal.Drive;
    }>
  ) {
    resetToCheckpoint(position.drive.gameState);
    teams.home.score = position.drive.initialScore.home;
    teams.away.score = position.drive.initialScore.away;
  }

  async function handleWakeupRoll(
    position: DeepReadonly<{
      type: "wakeupRoll";
      roll: Internal.WakeupRoll;
      wakeupSide: Internal.Side;
    }>
  ) {
    if (position.roll.roll[0] >= position.roll.target) {
      let player = position.roll.player.number;
      playerStates[player] = {
        ...playerStates[player],
        situation: SITUATION.Active,
      };
      await step();
    }
  }

  async function handleSetupAction(
    position: DeepReadonly<{
      type: "setupAction";
      setupSide: Internal.Side;
      action: Internal.SetupAction;
      gameState: Internal.GameState;
    }>
  ) {
    validateCheckpoint(position.gameState);
    for (let [sid, cell] of Object.entries(position.action.movedPlayers)) {
      let player = parseInt(sid);
      let situation = offPitch(cell) ? SITUATION.Reserves : SITUATION.Active;
      playerStates[player] = {
        ...playerStates[player],
        pitchCell: cell,
        situation,
      };
    }
    await step();
  }

  async function handleKickoffTarget(
    position: DeepReadonly<{
      type: "kickoffTarget";
      gameState: Internal.GameState;
      target: Internal.Drive["kickoff"]["target"];
    }>
  ) {
    validateCheckpoint(position.gameState);

    ball = {futurePositions: [position.target]};
    await step();
  }

  async function handleKickoffScatter(
    position: DeepReadonly<{
      type: "kickoffScatter";
      scatters: Internal.Drive["kickoff"]["scatters"];
    }>
  ) {
    for (const scatter of position.scatters) {
      ball = {futurePositions: [scatter]};
      await step();
    }
  }

  async function handleKickoffEvent(
    position: DeepReadonly<{
      type: "kickoffEvent";
      event: Internal.KickoffEvent;
    }>
  ) {
    if (position.event.cancelled) {
      return;
    }
    switch (position.event.total) {
      case KICKOFF_RESULT.PerfectDefence:
      case KICKOFF_RESULT.Blitz:
      case KICKOFF_RESULT.QuickSnap:
        // No visible effect
        break;
      case KICKOFF_RESULT.BrilliantCoaching:
      case KICKOFF_RESULT.CheeringFans:
        for (const side of Internal.sides) {
          teams[side].rerolls = {
            available: teams[side].rerolls.available + position.event.rerolls[side],
            total: teams[side].rerolls.total + position.event.rerolls[side],
          };
        }
        break;
      case KICKOFF_RESULT.ChangingWeather:
        weather = position.event.weather;
        break;
      case KICKOFF_RESULT.GetTheRef:
        for (const side of Internal.sides) {
          teams[side].inducements.bribes = {
            available: teams[side].inducements.bribes.available + 1,
            total: teams[side].inducements.bribes.total + 1,
          };
        }
        break;
      case KICKOFF_RESULT.HighKick:
        if (ball && 'futurePositions' in ball) {
          playerStates[position.event.receivingPlayer] = {
            ...playerStates[position.event.receivingPlayer],
            pitchCell: ball.futurePositions[0],
          }
        } else {
          console.warn("Unexpected High Kick with no ball defined");
        }
      case KICKOFF_RESULT.Riot:
      case KICKOFF_RESULT.PitchInvasion:
      case KICKOFF_RESULT.ThrowARock:
        // TODO: Finish
        break;
    }
  }

  async function handleKickoffLanding(
    position: DeepReadonly<{
      type: "kickoffLanding";
      touchbackTo?: Internal.Drive["kickoff"]["touchbackTo"]
      catch?: Internal.Drive["kickoff"]["catch"]
      bounce?: Internal.Drive["kickoff"]["bounce"];
    }>
  ) {
    if (position.touchbackTo) {
      ball = {heldBy: position.touchbackTo};
    }
    await step();
  }

  function handleWeather(
    _action: BB2.WeatherAction,
    result: BB2.ActionResult<BB2.WeatherAction>
  ) {
    const dice = translateStringNumberList(result.CoachChoices.ListDices);
    weather = weatherTable(dice[0] + dice[1]);
  }

  function handleActivate(action: BB2.ActivatePlayerAction) {
    clearTemporaryState();
    const player = action.PlayerId || 0;
    const playerState = playerStates[player];
    playerStates[player] = { ...playerState, status: STATUS.standing };
    pitch = Object.fromEntries(
      Object.entries(pitch).map(([idx, square]) => {
        if (square.cell && square.cell.active) {
          return [idx, { ...square, cell: { ...square.cell, active: false } }];
        } else {
          return [idx, square];
        }
      })
    );
    if (playerState.pitchCell) {
      const pitchSquare = getPitchSquare(playerState.pitchCell);
      let cell;
      if (!pitchSquare.cell) {
        cell = {
          active: true,
          target: false,
          pushbackChoice: false,
          moved: false,
        };
      } else {
        cell = { ...pitchSquare.cell, active: true };
      }
      setPitchSquare(playerState.pitchCell, { ...pitchSquare, cell: cell });
    }
  }

  function handleScatter(action: BB2.ScatterAction) {
    let to = convertCell(action.Order.CellTo.Cell);
    ball = {
      position: to,
    };
  }

  async function handleBlock(
    action: BB2.BlockAction | BB2.BlitzAction,
    result: BB2.ActionResult<BB2.BlockAction | BB2.BlitzAction>
  ) {
    let from = convertCell(action.Order.CellFrom);
    let fromSquare = getPitchSquare(from);
    setPitchSquare(from, {
      ...fromSquare,
      cell: { ...(fromSquare.cell || {}), active: true },
    });

    const to = convertCell(action.Order.CellTo.Cell);
    let [sToPlayer, _state] = Object.entries(playerStates).find(
      ([_id, state]) => state.pitchCell && cellEq(state.pitchCell, to)
    ) || [undefined, undefined];
    let toPlayer = sToPlayer && parseInt(sToPlayer);

    pitch = _.mapObject(pitch, (square) => ({
      ...square,
      dice: undefined,
    }));

    if ("RollType" in result && result.RollType === ROLL.Block) {
      const targetCell = convertCell(action.Order.CellTo.Cell);
      let target = getPitchSquare(targetCell);

      let dice;
      if (result.IsOrderCompleted) {
        dice = [translateStringNumberList(result.CoachChoices.ListDices)[0]];
      } else {
        dice = translateStringNumberList(result.CoachChoices.ListDices);
        dice = dice.slice(0, dice.length / 2);
      }
      setPitchSquare(targetCell, {
        ...target,
        cell: { ...(target.cell || {}), target: true },
        dice,
      });
      await step(2);
    }
    if ("RollType" in result && result.RollType === ROLL.Push) {
      //pushback
      if (result.IsOrderCompleted) {
        pitch = _.mapObject(pitch, (square) => {
          if (square.cell) {
            return {
              ...square,
              cell: { ...square.cell, pushbackChoice: false, target: false },
            };
          } else {
            return square;
          }
        });

        let pushTarget = convertCell(
          ensureKeyedList("Cell", result.CoachChoices.ListCells)[0]
        );
        if (lastChainPush) {
          toPlayer = lastChainPush;
        }

        const [sLastChainPush, _state] = Object.entries(playerStates).find(
          ([_id, state]) =>
            state.pitchCell && cellEq(state.pitchCell, pushTarget)
        ) || [undefined, undefined];
        lastChainPush =
          sLastChainPush != undefined ? parseInt(sLastChainPush) : undefined;

        if (toPlayer) {
          playerStates[toPlayer] = {
            ...playerStates[toPlayer],
            pitchCell: pushTarget,
          };
        }
      } else {
        ensureKeyedList("Cell", result.CoachChoices.ListCells)
          .map(convertCell)
          .forEach((cell) => {
            let square = getPitchSquare(cell);
            setPitchSquare(cell, {
              ...square,
              cell: { ...(square.cell || {}), pushbackChoice: true },
            });

            if (
              toPlayer &&
              (cell.x < 0 || cell.x > 25 || cell.y < 0 || cell.y > 14)
            ) {
              //surf
              playerStates[toPlayer] = {
                ...playerStates[toPlayer],
                pitchCell: undefined,
              };
            }
          });
      }
    }
    if ("RollType" in result && result.RollType === ROLL.FollowUp) {
      //follow up
      if (result.IsOrderCompleted) {
        const target = convertCell(
          ensureKeyedList("Cell", result.CoachChoices.ListCells)[0]
        );
        playerStates[action.PlayerId || 0] = {
          ...playerStates[action.PlayerId || 0],
          pitchCell: target,
        };
      }
    }
  }

  function handleCatch(
    action: BB2.CatchAction,
    result: BB2.ActionResult<BB2.CatchAction>
  ) {
    if (!result.IsOrderCompleted) return;
    if (result.ResultType !== 0) return;

    if (action.PlayerId) {
      ball = { heldBy: action.PlayerId };
    } else {
      ball = { position: convertCell(action.Order.CellTo.Cell) };
    }
  }

  async function handleTurnover(endTurn: BB2.RulesEventEndTurn) {
    if (endTurn.Turnover) {
      banner = "turnover";
      clearTemporaryState();
      await step(5);
      banner = undefined;
      await step();
    }
  }

  async function handleFoul(action: BB2.FoulAction) {
    const targetCell = convertCell(action.Order.CellTo.Cell);
    const targetSquare = getPitchSquare(targetCell);
    setPitchSquare(targetCell, { ...targetSquare, foul: true });
    await step();
  }
  function handleStunWake(action: BB2.StunWakeAction) {
    playerStates[action.PlayerId || 0] = {
      ...playerStates[action.PlayerId || 0],
      status: STATUS.prone,
    };
  }

  function handleHandoff(action: BB2.HandoffAction) {
    if (ball) {
      ball = { ...ball, position: convertCell(action.Order.CellTo.Cell) };
    }
  }

  function handleKickoff(action: BB2.KickoffAction) {
    ball = {
      position: convertCell(action.Order.CellTo.Cell),
    };
  }

  function handleMove(
    action: BB2.MoveAction | BB2.LeapAction,
    result: BB2.ActionResult<BB2.MoveAction | BB2.LeapAction>
  ) {
    const player = action.PlayerId || 0;
    let playerState = playerStates[player];
    let playerDef = playerDefs[player];
    let playerProps = playerProperties[player];
    let cellFrom = convertCell(action.Order.CellFrom);
    let cellTo = convertCell(action.Order.CellTo.Cell);
    let squareFrom = getPitchSquare(cellFrom);
    let squareTo = getPitchSquare(cellTo);

    playerStates[player] = {
      ...playerState,
      status: STATUS.standing,
      pitchCell: cellTo,
    };
    playerProperties[player] = {
      ...playerProps,
      moving: true,
    };

    squareFrom = setPitchSquare(cellFrom, {
      ...squareFrom,
      cell: {
        ...(squareFrom.cell || {}),
        moved: true,
        active: false,
      },
    });
    if (result.IsOrderCompleted) {
      setPitchSquare(cellTo, {
        ...squareTo,
        cell: {
          ...(squareTo.cell || {}),
          active: true,
        },
      });
    }

    if (
      "RollType" in result &&
      result.RollType &&
      [ROLL.Dodge, ROLL.GFI, ROLL.Leap].includes(result.RollType)
    ) {
      //Dodge, GFI, Leap
      let modifier =
        (
          (result.ListModifiers &&
            ensureList(result.ListModifiers.DiceModifier)) ||
          []
        )
          .map((modifier) => modifier.Value || 0)
          .reduce((a, b) => a + b, 0) || 0;

      squareTo = setPitchSquare(cellTo, {
        ...squareTo,
        cell: {
          ...(squareTo.cell || {}),
          plus: (result.Requirement || 0) - modifier,
        },
      });
    }

    if (playerDef.id.number == blitzerId) {
      playerStates[player] = { ...playerState, blitzer: true };
    }
  }

  function handleActivationTest(
    action: BB2.ActivationTestAction,
    result: BB2.ActionResult<BB2.ActivationTestAction>
  ) {
    /* rolltypes
      BoneHead = 20,
      ReallyStupid = 21,
      WildAnimal = 22,
      Loner = 23
      TakeRoot = 40,
      Bloodlust = 50,

    */
    let player = action.PlayerId || 0;

    if (result.ResultType === RESULT_TYPE.Passed) {
      //success
      playerProperties[player] = {
        ...playerProperties[player],
        stupidity: undefined,
      };
    } else {
      //failure
      const STUPID_TYPES: Record<
        BB2.ActivationTestResult["RollType"] | BB2.LonerResult["RollType"],
        string
      > = {
        [ROLL.BoneHead]: "BoneHeaded",
        [ROLL.ReallyStupid]: "Stupid",
        [ROLL.TakeRoot]: "Rooted",
        [ROLL.WildAnimal]: "WildAnimal",
        [ROLL.Loner]: "Loner",
      };
      playerProperties[player] = {
        ...playerProperties[player],
        stupidity: STUPID_TYPES[result.RollType],
      };
    }
  }

  async function handlePass(
    action: BB2.PassAction,
    result: BB2.ActionResult<BB2.PassAction>
  ) {
    if (!result.IsOrderCompleted) {
      return;
    }

    if (ball && "heldBy" in ball) {
      const position = playerStates[ball.heldBy].pitchCell;
      if (position) {
        ball = { position };
      } else {
        ball = undefined;
      }
    }
    await step(0.5);

    if (result.ResultType === RESULT_TYPE.Passed) {
      //success
      ball = {
        ...ball,
        position: convertCell(ensureList(action.Order.CellTo.Cell)[0]),
      };
      await step();
    }
  }

  function handlePickup(
    action: BB2.PickupAction,
    result: BB2.ActionResult<BB2.PickupAction>
  ) {
    if (result.IsOrderCompleted && result.ResultType === RESULT_TYPE.Passed) {
      if (action.PlayerId) {
        ball = { heldBy: action.PlayerId };
      }
    }
  }

  function handleTakeDamage(
    action: BB2.TakeDamageAction,
    result: BB2.ActionResult<BB2.TakeDamageAction>
  ) {
    if (!result.IsOrderCompleted) return;

    const player = action.PlayerId || 0,
      playerState = playerStates[player],
      playerSquareIndex =
        playerState.pitchCell &&
        `${playerState.pitchCell.x}-${playerState.pitchCell.y}`;

    pitch = _.mapObject(pitch, (square) => {
      if (square.cell?.target) {
        return { ...square, cell: { ...square.cell, target: false } };
      } else {
        return square;
      }
    });

    switch (result.RollType) {
      case 3: //armor
        if (result.ResultType === 1) {
          // armor failed
          //knocked down
          playerStates[player] = { ...playerState, status: STATUS.prone };
        }
        break;
      case 4: //injury
        if (result.SubResultType === 2) {
          //stunned
          if (playerState) {
            playerStates[player] = { ...playerState, status: STATUS.stunned };
          }
        } else if (result.SubResultType === 3 && playerSquareIndex) {
          //knocked out
          playerStates[player] = {
            ...playerState,
            pitchCell: undefined,
            situation: SITUATION.KO,
          };
        }
        break;
      case 8: //casualty
        //knocked out
        if (playerSquareIndex) {
          playerStates[player] = {
            ...playerState,
            pitchCell: undefined,
            situation: SITUATION.Casualty,
          };

          const cell = playerState.pitchCell;
          if (cell) {
            setPitchSquare(cell, {
              ...getPitchSquare(cell),
              blood: {
                blood: Math.floor(4 * Math.random() + 1),
              },
            });
          }
        }
        break;
      case 25: //regeneration
    }
  }

  async function handleTouchdown() {
    banner = "touchdown";
    clearTemporaryState();
    await step(5);
    banner = undefined;
    await step(0);
  }
</script>

<svelte:head>
  {#each races as race (race)}
    <link rel="stylesheet" href="/styles/{race}.css" />
  {/each}
  <link rel="stylesheet" href="/styles/sprite.css" />
  <link rel="stylesheet" href="/styles/skills.css" />
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.3.0/font/bootstrap-icons.css"
  />
</svelte:head>

<div id="viewer">
  <div class="controls">
    <Row class="justify-content-center align-items-center">
      <Col xs="auto">
        <ButtonToolbar>
          <Button
            title="Slower"
            on:click={() => {
              $timing *= 1.2;
            }}>{"<<"}</Button
          >
          <Button title="Previous Turn" on:click={() => jumpToPreviousTurn()}
            >{"|<<<"}</Button
          >
          <Button
            title="Previous Activation"
            on:click={() => jumpToPreviousActivation()}>{"|<<"}</Button
          >
          <Button
            title="Previous Replay Step"
            on:click={() => jumpToPreviousStep()}>{"|<"}</Button
          >
          {#if playing}
            <Button title="Pause" on:click={() => (playing = false)}
              ><Icon name="pause-fill" /></Button
            >
          {:else}
            <Button title="Play" on:click={() => (playing = true)}
              ><Icon name="play-fill" /></Button
            >
          {/if}
          <Button title="Next Replay Step" on:click={() => stepReplay()}
            >{">|"}</Button
          >
          <Button
            title="Next Activation"
            on:click={() => jumpToNextActivation()}>{">>|"}</Button
          >
          <Button title="Next Turn" on:click={() => jumpToNextTurn()}
            >{">>>|"}</Button
          >
          <Button
            title="Faster"
            on:click={() => {
              $timing /= 1.2;
            }}>{">>"}</Button
          >
        </ButtonToolbar>
      </Col>
    </Row>
  </div>
  <div class="pitch-container">
    <div class="pitch-scroll">
      <FixedRatio width={1335} height={1061}>
        <div class="pitch">
          <HomeDugout
            team={teams.home}
            {weather}
            {playerDefs}
            {playerStates}
            {playerProperties}
            {playerPositions}
          />
          {#if $selectedPlayer || $hoveredPlayer}
            <div class="selected" class:enlarged={!!$hoveredPlayer}>
              <SelectedPlayer
                playerDef={playerDefs[$hoveredPlayer || $selectedPlayer || 0]}
                playerState={playerStates[
                  $hoveredPlayer || $selectedPlayer || 0
                ]}
                playerProps={playerProperties[
                  $hoveredPlayer || $selectedPlayer || 0
                ]}
              />
            </div>
          {/if}
          <Pitch
            {pitch}
            {teams}
            {playerPositions}
            playerDefinitions={playerDefs}
            {playerProperties}
            {playerStates}
            {ball}
          />
          <AwayDugout
            team={teams.away}
            {playerDefs}
            {playerStates}
            {playerProperties}
            {playerPositions}
          />
        </div>
        {#if banner}
          <Banner {banner} />
        {/if}
      </FixedRatio>
    </div>
  </div>
  {#if $replay && $replay.unknownRolls.length > 0}
    <Alert warning>
      <details>
        <summary>
          The following rolls aren't able to be analyzed yet. Please <a
            href="https://github.com/cpennington/dicedornot/issues"
            >open an issue on GitHub</a
          > and attach this replay (or match link).
        </summary>
        <ul>
          {#each [...new Set($replay.unknownRolls.map((roll) => roll.name))] as name}
            <li>{name}</li>
          {/each}
        </ul>
      </details>
    </Alert>
  {/if}
</div>

<style>
  .selected {
    top: 0;
    width: 7.5%;
    right: 7%;
    position: absolute;
    z-index: 10;
  }
  .selected:hover,
  .selected.enlarged {
    width: 16%;
  }
  .pitch-container {
    width: 100%;
    overflow-x: auto;
  }

  @media (min-width: 768px) {
    .pitch-container {
      overflow-x: hidden;
    }
  }
  .pitch-scroll {
    overflow-y: hidden;
  }
  .pitch {
    background-image: url("/images/pitch.png");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    width: 100%;
    height: 100%;
    position: relative;
  }
  .controls {
    font-family: "Nuffle";
    z-index: 10;
    position: relative;
  }

  #viewer {
    width: calc(min(1335/1061 * (100vh - 7em), 1700px, 95vw));
  }
</style>
