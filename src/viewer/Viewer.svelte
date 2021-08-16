<script lang="ts">
  import type {
    Team,
    PitchCellProps,
    PlayerProps,
    Preview,
    WakeConditions,
    Dugout,
  } from "./types.js";
  import { onMount, tick } from "svelte";
  import { sineInOut } from "svelte/easing";
  import { crossfade } from "svelte/transition";
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
  } from "../constants.js";
  import FixedRatio from "./FixedRatio.svelte";
  import Banner from "./Banner.svelte";
  import type {
    ReplayPosition,
    ReplayPreview,
  } from "../replay-utils.js";
  import {
    linearReplay,
  } from "../replay-utils.js";
  import {
    translateStringNumberList,
    ensureList,
    REPLAY_SUB_STEP,
    period,
    ensureKeyedList,
  } from "../replay-utils.js";
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
  import type * as Internal from "../replay/Internal.js";
  import { convertCell } from "../replay/BB2toInternal.js";

  export let playing = false;

  let lastChainPush: BB2.PlayerId | undefined,
    races: string[] = [],
    homeTeam: Team = emptyTeam(),
    awayTeam: Team = emptyTeam(),
    pitch: Record<string, PitchCellProps> = {},
    players: Record<Internal.PlayerNumber, PlayerProps> = {},
    blitzerId: Internal.PlayerNumber,
    banner: string | undefined = undefined,
    weather = WEATHER.Nice,
    skipping = false,
    underPreview: Preview | undefined = undefined,
    previewing: ReplayPreview | undefined = undefined,
    shouldWake: WakeConditions | undefined,
    abort = new AbortController(),
    current: number = 0,
    positions: ReplayPosition[] = [];

  function emptyTeam(): Team {
    return {
      logo: "",
      dugout: {
        cas: [],
        ko: [],
        reserve: [],
      },
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

  const DUGOUT_POSITIONS: Record<
    Exclude<SITUATION, SITUATION.Active>,
    keyof Dugout
  > = {
    [SITUATION.Reserves]: "reserve",
    [SITUATION.KO]: "ko",
    [SITUATION.Casualty]: "cas",
    [SITUATION.SentOff]: "cas",
  };

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

  const [send, receive] = crossfade({
    duration: $timing * 0.5,
    easing: sineInOut,

    fallback(node) {
      const style = getComputedStyle(node);
      const transform = style.transform === "none" ? "" : style.transform;

      return {
        duration: $timing * 0.5,
        easing: sineInOut,
        css: (t) => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`,
      };
    },
  });

  onMount(() => {
    let url = new URL(window.location.href);
    $timing = parseInt(url.searchParams.get("timing") || "300");
    if (url.searchParams.get("st")) {
      playing = false;
    } else {
      playing = true;
    }
    playerLoop();
    return () => console.log("destroyed");
  });

  async function resetFromBoardState(boardState: BB2.BoardState) {
    homeTeam = processTeam(
      SIDE.home,
      boardState.ListTeams.TeamState[0],
      boardState.ActiveTeam != 1
    );
    awayTeam = processTeam(
      SIDE.away,
      boardState.ListTeams.TeamState[1],
      boardState.ActiveTeam == 1
    );
    races = boardState.ListTeams.TeamState.flatMap((team) =>
      ensureKeyedList("PlayerState", team.ListPitchPlayers).map((player) => {
        const { race } = getPlayerSprite(player.Id, player.Data.IdPlayerTypes);
        return race;
      })
    ).filter((v, i, a) => a.indexOf(v) === i);
    setPlayerStates(boardState);
    setBallPosition(boardState);
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
    let maxApos = $replay!.fullReplay.unhandledSteps.reduce((acc: number, step: BB2.ReplayStep) => {
      if (!("BoardState" in step)) {
        return acc;
      }
      let stepTeam = step.BoardState.ListTeams.TeamState[side];
      return Math.max(acc, stepTeam.ApothecaryNumber || 0);
    }, 0);
    return {
      logo: team.Data.Logo.toLowerCase(),
      dugout: {
        cas: [],
        ko: [],
        reserve: [],
      },
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

  function setPitchSquare(cell: Internal.Cell): PitchCellProps {
    let square = pitch[`${cell.x}-${cell.y}`] || {};
    pitch[`${cell.x}-${cell.y}`] = square;
    return square;
  }
  function setPlayer(id: Internal.PlayerNumber) {
    let player = players[id];
    players[id] = player;
    return player;
  }

  function setPlayerStates(boardState: BB2.BoardState) {
    Object.values(pitch).forEach((square) => {
      if (square.player) {
        square.player = undefined;
      }
    });
    players = {};
    ensureKeyedList(
      "PlayerState",
      boardState.ListTeams.TeamState[0].ListPitchPlayers
    ).map((p) => placePlayer(p, SIDE.home));
    ensureKeyedList(
      "PlayerState",
      boardState.ListTeams.TeamState[1].ListPitchPlayers
    ).map((p) => placePlayer(p, SIDE.away));
    if (boardState.ListTeams.TeamState[0].BlitzerId >= 0) {
      setPlayer(boardState.ListTeams.TeamState[0].BlitzerId).blitz = true;
    }
    if (boardState.ListTeams.TeamState[1].BlitzerId >= 0) {
      setPlayer(boardState.ListTeams.TeamState[1].BlitzerId).blitz = true;
    }
  }

  function placePlayer(p: BB2.PitchPlayer, team: SIDE) {
    players[p.Id] = { data: p, team };
    let situation = p.Situation || SITUATION.Active;
    switch (situation) {
      case SITUATION.Active:
        setPitchSquare(convertCell(p.Cell)).player = p.Id;
        break;
      default:
        (team == SIDE.home ? homeTeam : awayTeam).dugout[
          DUGOUT_POSITIONS[situation]
        ].push(p.Id);
        break;
    }
  }

  function setBallPosition(boardState: BB2.BoardState) {
    let { x, y } = convertCell(boardState.Ball.Cell);
    Object.values(pitch).forEach((square) => {
      square.ball = undefined;
    });

    if (x != -1 && y != -1) {
      setPitchSquare({ x, y }).ball = {
        held: boardState.Ball.IsHeld == 1,
      };
    }
  }

  function badAction(action: never): never;
  function badAction(action: BB2.RulesEventBoardAction) {
    console.error(`Unexpected action ${JSON.stringify(action)}`);
  }

  function dispatchAction(
    action: BB2.RulesEventBoardAction,
    result: BB2.ActionResult<BB2.RulesEventBoardAction>,
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
        return handleTakeDamage(action, result as BB2.ActionResult<typeof action>);
      case ACTION_TYPE.Kickoff:
        return handleKickoff(action);
      case ACTION_TYPE.Scatter:
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
        return handleActivationTest(action, result as BB2.ActionResult<typeof action>);
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

  async function handleSetupAction() {}

  async function handleBoardAction(
    boardAction: BB2.RulesEventBoardAction,
    result: BB2.ActionResult<BB2.RulesEventBoardAction>,
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

    if ('stepIdx' in currentPosition) {
      switch (currentPosition.subStep) {
        case REPLAY_SUB_STEP.SetupAction:
          await handleSetupAction();
          break;
        case REPLAY_SUB_STEP.BoardAction:
          await handleBoardAction(currentPosition.action, currentPosition.result);
          break;
        case REPLAY_SUB_STEP.EndTurn:
          await handleTurnover(currentPosition.endTurn);
          break;
        case REPLAY_SUB_STEP.BoardState:
          await handleBoardState(currentPosition.boardState);
          break;
      }
    } else {

    }
    if (updateUrl) {
      if (!skipping) {
        $replayCurrent = current;
      }
      let url = new URL(window.location.href);
      url.searchParams.set("st", current.toString());
      window.history.replaceState({}, "", url.href);
    }
    current++;
  }

  async function jumpToPosition(position: number, updateUrl = true) {
    clearTemporaryState();
    // Walk back through the replay to find the most recent step with
    // the board state
    for (current = position; current >= 0; current--) {
      let currentPosition = positions[current];
      if ('subStep' in currentPosition && currentPosition.subStep == REPLAY_SUB_STEP.BoardState) {
        break;
      }
      if ('driveIdx' in currentPosition) {
        break;
      }
    }
    skipping = true;
    while (current < position) {
      await stepReplay(updateUrl);
    }
    skipping = false;
    pitch = pitch;
    players = players;
    await step();
    if (updateUrl) {
      $replayCurrent = current;
    }
  }

  async function playerLoop() {
    while (true) {
      try {
        if (underPreview && !$replayPreview) {
          homeTeam = underPreview.homeTeam;
          awayTeam = underPreview.awayTeam;
          pitch = underPreview.pitch;
          players = underPreview.players;
          playing = underPreview.playing;
          current = underPreview.current;
          previewing = undefined;
          underPreview = undefined;
        } else if (
          underPreview &&
          $replayPreview &&
          previewing != $replayPreview
        ) {
          previewing = $replayPreview;
          homeTeam = emptyTeam();
          awayTeam = emptyTeam();
          pitch = {};
          players = {};
          jumpToPosition($replayPreview.start, false);
          // resetFromBoardState($replay.fullReplay.unhandledSteps[$replayPreview.start.step - 1].BoardState, true);
        } else if (!underPreview && $replayPreview) {
          underPreview = {
            homeTeam,
            awayTeam,
            pitch,
            players,
            playing,
            current,
          };
          playing = false;
          previewing = $replayPreview;
          homeTeam = emptyTeam();
          awayTeam = emptyTeam();
          pitch = {};
          players = {};
          jumpToPosition($replayPreview.start, false);
          // resetFromBoardState($replay.fullReplay.unhandledSteps[$replayPreview.start.step - 1].BoardState, true);
        }
        if (
          underPreview &&
          $replayPreview &&
          $replayTarget == $replayPreview.start
        ) {
          underPreview = {
            homeTeam,
            awayTeam,
            pitch,
            players,
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
      } catch (err) {
        playing = false;
        $error = err;
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
        'activationIdx' in targetPosition &&
        (
          ('activationIdx' in startingPosition && targetPosition.activationIdx < startingPosition.activationIdx) ||
          ('turnIdx' in startingPosition && targetPosition.turnIdx < startingPosition.turnIdx) ||
          ('driveIdx' in startingPosition && targetPosition.driveIdx < startingPosition.driveIdx) ||
          // All internal-format replay positions are before BB2 format replay positions
          !('driveIdx' in startingPosition)
        ) &&
        targetPosition.actionStepIdx == 0
      ) {
        $replayTarget = target;
        return;
      }
      if (
        'action' in targetPosition &&
        'ActionType' in targetPosition.action &&
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
        'activationIdx' in targetPosition &&
        (
          ('turnIdx' in startingPosition && targetPosition.turnIdx < startingPosition.turnIdx) ||
          ('driveIdx' in startingPosition && targetPosition.driveIdx < startingPosition.driveIdx) ||
          // All internal-format replay positions are before BB2 format replay positions
          !('driveIdx' in startingPosition)
        ) &&
        targetPosition.activationIdx == 0
      ) {
        $replayTarget = target;
        return;
      }
      if (
        'subStep' in targetPosition &&
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
    if (current <= positions.length) {
      current = positions.length - 1;
    }
    let startingPosition = positions[current];
    for (let target = current + 1; target < positions.length; target++) {
      let targetPosition = positions[target];
      if (
        'activationIdx' in targetPosition &&
        (
          ('activationIdx' in startingPosition && targetPosition.activationIdx > startingPosition.activationIdx) ||
          ('turnIdx' in startingPosition && targetPosition.turnIdx > startingPosition.turnIdx) ||
          ('driveIdx' in startingPosition && targetPosition.driveIdx > startingPosition.driveIdx)
        ) &&
        targetPosition.actionStepIdx == 0
      ) {
        $replayTarget = target;
        return;
      }
      if (
        'action' in targetPosition &&
        'ActionType' in targetPosition.action &&
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
        'activationIdx' in targetPosition &&
        (
          ('turnIdx' in startingPosition && targetPosition.turnIdx > startingPosition.turnIdx) ||
          ('driveIdx' in startingPosition && targetPosition.driveIdx > startingPosition.driveIdx) ||
          // All internal-format replay positions are before BB2 format replay positions
          !('driveIdx' in startingPosition)
        ) &&
        targetPosition.activationIdx == 0
      ) {
        $replayTarget = target;
        return;
      }
      if (
        'subStep' in targetPosition &&
        targetPosition.subStep == REPLAY_SUB_STEP.EndTurn
      ) {
        $replayTarget = target + 1;
        return;
      }
    }
  }

  function clearTemporaryState() {
    Object.entries(pitch).forEach(([idx, square]) => {
      square.dice = undefined;
      square.cell = undefined;
      square.foul = false;
      if (square.player) {
        setPlayer(square.player).moving = false;
      }
      pitch[idx] = square;
    });
  }

  function handleWeather(action: BB2.WeatherAction, result: BB2.ActionResult<BB2.WeatherAction>) {
    const dice = translateStringNumberList(result.CoachChoices.ListDices);
    const diceSums: Record<number, WEATHER | undefined> = {
      2: WEATHER.SwelteringHeat,
      3: WEATHER.VerySunny,
      11: WEATHER.PouringRain,
      12: WEATHER.Blizzard,
    };
    weather = diceSums[dice[0] + dice[1]] || WEATHER.Nice;
  }

  function handleActivate(action: BB2.ActivatePlayerAction) {
    clearTemporaryState();
    setPlayer(action.PlayerId || 0).prone = false;
    Object.entries(pitch).forEach(([idx, square]) => {
      if (square.cell) {
        square.cell.active = false;
      }
      if (square.player) {
        if (square.player == action.PlayerId) {
          if (!square.cell) {
            square.cell = {
              active: false,
              target: false,
              pushbackChoice: false,
              moved: false,
            };
          }
          square.cell.active = true;
        }
        pitch[idx] = square;
      }
    });
  }

  function handleScatter(action: BB2.ScatterAction) {
    setPitchSquare(convertCell(action.Order.CellFrom)).ball = undefined;
    let to = convertCell(action.Order.CellTo.Cell);
    setPitchSquare(to).ball = {
      held: false,
    };
  }

  async function handleBlock(
    action: BB2.BlockAction | BB2.BlitzAction,
    result: BB2.ActionResult<BB2.BlockAction | BB2.BlitzAction>,
  ) {
    let from = convertCell(action.Order.CellFrom);
    let fromSquare = setPitchSquare(from);
    (fromSquare.cell = fromSquare.cell || {
      active: false,
      target: false,
      pushbackChoice: false,
      moved: false,
    }).active = true;

    let to = convertCell(action.Order.CellTo.Cell);
    let toSquare = setPitchSquare(to);
    let toPlayer = toSquare.player;

    Object.values(pitch).forEach((square) => {
      square.dice = undefined;
    });

    if ("RollType" in result && result.RollType === ROLL.Block) {
      let target = setPitchSquare(convertCell(action.Order.CellTo.Cell));
      if (!target.cell) {
        target.cell = {
          active: false,
          target: false,
          pushbackChoice: false,
          moved: false,
        };
      }
      target.cell.target = true;

      if (result.IsOrderCompleted) {
        target["dice"] = [
          translateStringNumberList(result.CoachChoices.ListDices)[0],
        ];
      } else {
        let dice = translateStringNumberList(
          result.CoachChoices.ListDices
        );
        target.dice = dice.slice(0, dice.length / 2);
      }
      await step(4);
    }
    if ("RollType" in result && result.RollType === ROLL.Push) {
      //pushback
      if (result.IsOrderCompleted) {
        Object.values(pitch).forEach((square) => {
          if (square.cell) {
            square.cell.pushbackChoice = false;
            square.cell.target = false;
          }
        });

        let pushTarget = convertCell(ensureKeyedList(
          "Cell",
          result.CoachChoices.ListCells
        )[0]);
        let targetSquare = setPitchSquare(pushTarget);
        if (lastChainPush) {
          toPlayer = lastChainPush;
        }

        if (targetSquare.player) {
          lastChainPush = targetSquare.player;
        } else {
          lastChainPush = undefined;
        }

        targetSquare.player = toPlayer;
        toSquare.player = undefined;
      } else {
        ensureKeyedList('Cell', result.CoachChoices.ListCells).map(convertCell).forEach((cell) => {
          let square = setPitchSquare(cell);
          square.cell = square.cell || {
            active: false,
            target: false,
            pushbackChoice: false,
            moved: false,
          };
          square.cell.pushbackChoice = true;

          if (toPlayer && (cell.x < 0 || cell.x > 25 || cell.y < 0 || cell.y > 14)) {
            //surf
            let team = players[toPlayer].team;
            let dugout = team == SIDE.home ? homeTeam.dugout : awayTeam.dugout;
            dugout.reserve.push(toPlayer);
            toSquare.player = undefined;
          }
        });
      }
    }
    if ("RollType" in result && result.RollType === ROLL.FollowUp) {
      //follow up
      if (result.IsOrderCompleted) {
        const from = convertCell(action.Order.CellFrom);
        const target = convertCell(
          ensureKeyedList("Cell", result.CoachChoices.ListCells)[0]
        );
        if (from.x != target.x || from.y != target.y) {
          const fromSquare = setPitchSquare(from);
          setPitchSquare(target).player = fromSquare.player;
          fromSquare.player = undefined;
        }
      }
    }
  }

  function handleCatch(action: BB2.CatchAction, result: BB2.ActionResult<BB2.CatchAction>) {
    if (!result.IsOrderCompleted) return;
    if (result.ResultType !== 0) return;

    Object.values(pitch).forEach((cell) => (cell["ball"] = undefined));
    setPitchSquare(convertCell(action.Order.CellTo.Cell)).ball = { held: true };
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
    const targetSquare = setPitchSquare(convertCell(action.Order.CellTo.Cell));

    targetSquare.foul = true;
    await step();
  }
  function handleStunWake(action: BB2.StunWakeAction) {
    let player = setPlayer(action.PlayerId || 0);
    player.stunned = false;
    player.prone = true;
  }

  function handleHandoff(action: BB2.HandoffAction) {
    let from = setPitchSquare(convertCell(action.Order.CellFrom));
    let to = setPitchSquare(convertCell(action.Order.CellTo.Cell));
    to.ball = from.ball;
    from.ball = undefined;
  }

  function handleKickoff(action: BB2.KickoffAction) {
    setPitchSquare(convertCell(action.Order.CellTo.Cell)).ball = {
      held: false,
    };
  }

  function handleMove(action: BB2.MoveAction | BB2.LeapAction, result: BB2.ActionResult<BB2.MoveAction | BB2.LeapAction>) {
    let player = setPlayer(action.PlayerId || 0);
    let squareFrom = setPitchSquare(convertCell(action.Order.CellFrom));
    let squareTo = setPitchSquare(convertCell(action.Order.CellTo.Cell));

    player.prone = false;
    player.moving = true;
    if (result.IsOrderCompleted && squareTo != squareFrom) {
      squareFrom.player = undefined;
      squareTo.player = action.PlayerId;
    }

    squareFrom.cell = squareFrom.cell || {
      active: false,
      target: false,
      pushbackChoice: false,
      moved: false,
    };
    squareFrom.cell.moved = true;
    squareFrom.cell.active = false;

    if (result.IsOrderCompleted) {
      squareTo.cell = squareTo.cell || {
        active: false,
        target: false,
        pushbackChoice: false,
        moved: false,
      };
      squareTo.cell.active = true;
    }

    if (
      'RollType' in result &&
      result.RollType &&
      [ROLL.Dodge, ROLL.GFI, ROLL.Leap].includes(result.RollType)
    ) {
      //Dodge, GFI, Leap
      squareTo.cell = squareTo.cell || {
        active: false,
        target: false,
        pushbackChoice: false,
        moved: false,
      };
      let modifier =
        (
          (result.ListModifiers &&
            ensureList(result.ListModifiers.DiceModifier)) ||
          []
        )
          .map((modifier) => modifier.Value || 0)
          .reduce((a, b) => a + b, 0) || 0;
      squareTo.cell.plus = (result.Requirement || 0) - modifier;
    }

    if (player.data.Id == blitzerId) {
      player.blitz = true;
    }
    if (squareFrom.ball) {
      let ball = squareFrom.ball;
      squareFrom.ball = undefined;
      squareTo.ball = ball;
    }
  }

  function handleActivationTest(
    action: BB2.ActivationTestAction,
    result: BB2.ActionResult<BB2.ActivationTestAction>,
  ) {
    /* rolltypes
      BoneHead = 20,
      ReallyStupid = 21,
      WildAnimal = 22,
      Loner = 23
      TakeRoot = 40,
      Bloodlust = 50,

    */
    let square = setPitchSquare(convertCell(action.Order.CellTo.Cell));

    if (square.player) {
      if (result.ResultType === RESULT_TYPE.Passed) {
        //success
        setPlayer(square.player).stupidity = undefined;
      } else {
        //failure
        const STUPID_TYPES: Record<BB2.ActivationTestResult["RollType"] | BB2.LonerResult["RollType"], string> = {
          [ROLL.BoneHead]: "BoneHeaded",
          [ROLL.ReallyStupid]: "Stupid",
          [ROLL.TakeRoot]: "Rooted",
          [ROLL.WildAnimal]: "WildAnimal",
          [ROLL.Loner]: "Loner",
        };
        setPlayer(square.player).stupidity = STUPID_TYPES[result.RollType];
      }
    }
  }

  async function handlePass(action: BB2.PassAction, result: BB2.ActionResult<BB2.PassAction>) {
    if (!result.IsOrderCompleted) {
      return;
    }

    let from = setPitchSquare(convertCell(action.Order.CellFrom));
    if (from.ball) {
      from.ball.held = false;
    }
    await step(0.5);

    if (result.ResultType === RESULT_TYPE.Passed) {
      //success
      let target = setPitchSquare(convertCell(ensureList(action.Order.CellTo.Cell)[0]));
      if (from.ball) {
        target.ball = from.ball;
        from.ball = undefined;
      }
      await step();
    }
  }

  function handlePickup(action: BB2.PickupAction, result: BB2.ActionResult<BB2.PickupAction>) {
    if (
      result.IsOrderCompleted &&
      result.ResultType === RESULT_TYPE.Passed
    )
      Object.values(pitch).forEach((square) => {
        if (square["ball"]) {
          //successful pickup
          square["ball"]["held"] = true;
        }
      });
  }

  function handleTakeDamage(action: BB2.TakeDamageAction, result: BB2.ActionResult<BB2.TakeDamageAction>) {
    if (!result.IsOrderCompleted) return;

    let player = setPlayer(action.PlayerId || 0),
      playerSquareIndex: string | undefined;

    Object.entries(pitch).forEach(([idx, square]) => {
      if (square.cell) {
        square.cell.target = false;
      }
      if (square.player && square.player == action.PlayerId) {
        pitch[idx] = square; // Force svelte to update
        playerSquareIndex = idx;
      }
    });

    switch (result.RollType) {
      case 3: //armor
        if (result.ResultType === 1) {
          // armor failed
          //knocked down
          if (player) {
            player.prone = true;
          }
        }
        break;
      case 4: //injury
        if (result.SubResultType === 2) {
          //stunned
          if (player) {
            player.stunned = true;
          }
        } else if (result.SubResultType === 3 && playerSquareIndex) {
          //knocked out
          let team = player.team;
          let dugout = team == SIDE.home ? homeTeam.dugout : awayTeam.dugout;
          let curPlayer = pitch[playerSquareIndex].player;
          if (curPlayer) {
            dugout.ko.push(curPlayer);
          }
          pitch[playerSquareIndex].player = undefined;
        }
        break;
      case 8: //casualty
        //knocked out
        let team = player.team;
        let dugout = team == SIDE.home ? homeTeam.dugout : awayTeam.dugout;
        if (playerSquareIndex) {
          let curPlayer = pitch[playerSquareIndex].player;
          if (curPlayer) {
            dugout.cas.push(curPlayer);
          }
          pitch[playerSquareIndex].player = undefined;
          pitch[playerSquareIndex].blood = {
            blood: Math.floor(4 * Math.random() + 1),
          };
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
            pitchPlayers={players}
            team={homeTeam}
            {weather}
            {send}
            {receive}
          />
          {#if $selectedPlayer || $hoveredPlayer}
            <div class="selected" class:enlarged={!!$hoveredPlayer}>
              <SelectedPlayer
                {players}
                player={$hoveredPlayer || $selectedPlayer || 0}
              />
            </div>
          {/if}
          <Pitch
            pitchPlayers={players}
            {pitch}
            {homeTeam}
            {awayTeam}
            {send}
            {receive}
          />
          <AwayDugout pitchPlayers={players} team={awayTeam} {send} {receive} />
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
