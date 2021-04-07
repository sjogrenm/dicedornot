<script lang="ts" context="module">
  interface Team {
    dugout: {
      cas: BB2.PlayerId[],
      ko: BB2.PlayerId[],
      reserve: BB2.PlayerId[],
    }
  }
</script>

<script lang="ts">
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
  import {
    translateStringNumberList,
    ensureList,
    REPLAY_KEY,
    REPLAY_SUB_STEP,
    ReplayPosition,
    END,
    period,
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
  import type * as BB2 from "../BB2Replay.js";

  export let playing = false;

  interface BallProps {
    held: boolean
  }

  interface CellProps {
    active?: boolean,
    target?: boolean,
    pushbackChoice?: boolean,
    moved?: boolean,
    plus?: number,
  }

  interface BloodProps {
    blood: number
  }

  interface PitchCellProps {
    cell?: CellProps,
    dice?: number[],
    player?: BB2.PlayerId,
    ball?: BallProps,
    foul?: boolean,
    blood?: BloodProps,
  }

  interface PlayerProps {
    data: BB2.Player,
    blitz?: boolean,
    moving?: boolean,
    prone?: boolean,
    team?: SIDE,
    stunned?: boolean,
    stupidity?: string,
  }

  let lastChainPush: BB2.PlayerId,
    races = [],
    homeTeam: Team = {
      dugout: {
        cas: [],
        ko: [],
        reserve: [],
      },
    },
    awayTeam: Team = {
      dugout: {
        cas: [],
        ko: [],
        reserve: [],
      },
    },
    pitch: Record<string, PitchCellProps> = {},
    players: Record<string, PlayerProps> = {},
    blitzerId,
    banner,
    weather = WEATHER.Nice,
    skipping = false,
    underPreview,
    previewing,
    shouldWake,
    abort = new AbortController(),
    current = new ReplayPosition();

  const DUGOUT_POSITIONS = {
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
  }

  const [send, receive] = crossfade({
    duration: $timing * 0.5,
    easing: sineInOut,

    fallback(node, params) {
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
    $timing = parseInt(url.searchParams.get("timing")) || 300;
    if (url.searchParams.get("st")) {
      playing = false;
    } else {
      playing = true;
    }
    playerLoop();
    return () => console.log("destroyed");
  });

  async function resetFromBoardState(boardState) {
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
      team.ListPitchPlayers.PlayerState.map((player) => {
        const { race } = getPlayerSprite(player.Id, player.Data.IdPlayerTypes);
        return race;
      })
    ).filter((v, i, a) => a.indexOf(v) === i);
    setPlayerStates(boardState);
    setBallPosition(boardState);
    await step();
  }

  function processTeam(side, team, active) {
    let maxRerollsThisPeriod = $replay.fullReplay.ReplayStep.reduce(
      (acc: number, step: BB2.ReplayStep) => {
        if (!step.BoardState) {
          return acc;
        }
        let stepTeam = step.BoardState.ListTeams.TeamState[side];
        let stepPeriod = period(stepTeam.GameTurn);
        if (stepPeriod == period(team.GameTurn)) {
          acc = Math.max(acc, stepTeam.RerollNumber || 0);
        }
        return acc;
      },
      0
    );
    let maxApos = $replay.fullReplay.ReplayStep.reduce((acc, step) => {
      if (!step.BoardState) {
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
          total: team.Bribe || 0,
        },
        igor: team.Igor == 1,
      },
      //inducements
    };
  }

  function setPitchSquare(cell): PitchCellProps {
    let square = pitch[`${cell.x || 0}-${cell.y || 0}`] || {};
    pitch[`${cell.x || 0}-${cell.y || 0}`] = square;
    return square;
  }
  function setPlayer(id) {
    let player = players[id];
    players[id] = player;
    return player;
  }

  function setPlayerStates(boardState) {
    Object.values(pitch).forEach((square) => {
      if (square.player) {
        square.player = null;
      }
    });
    players = {};
    boardState.ListTeams.TeamState[0].ListPitchPlayers.PlayerState.map((p) =>
      placePlayer(p, SIDE.home)
    );
    boardState.ListTeams.TeamState[1].ListPitchPlayers.PlayerState.map((p) =>
      placePlayer(p, SIDE.away)
    );
    if (boardState.BlitzerId) {
      players[boardState.BlitzerId].blitz = true;
    }
  }

  function placePlayer(p, team: SIDE) {
    players[p.Id] = { data: p, team };
    switch (p.Situation) {
      case SITUATION.Active:
        setPitchSquare(p.Cell).player = p.Id;
        break;
      default:
        (team == SIDE.home ? homeTeam : awayTeam).dugout[
          DUGOUT_POSITIONS[p.Situation]
        ].push(p.Id);
        break;
    }
  }

  function setBallPosition(boardState) {
    let { x, y } = boardState.Ball.Cell;
    Object.values(pitch).forEach((square) => {
      square.ball = null;
    });

    if (x != -1 && y != -1) {
      setPitchSquare(boardState.Ball.Cell).ball = {
        held: boardState.Ball.IsHeld == 1,
      };
    }
  }
  function assertExhaustive(
    value: never,
    message: string = 'Reached unexpected case in exhaustive switch'
  ): never {
    throw new Error(message);
  }

  function dispatchAction(action: BB2.RulesEventBoardAction, resultIndex: number) {
    switch (action.ActionType) {
      case ACTION_TYPE.Block:
      case ACTION_TYPE.Blitz:
          return handleBlock(action, resultIndex);
      case ACTION_TYPE.Pass:
          return handlePass(action, resultIndex);
      case ACTION_TYPE.Handoff:
          return handleHandoff(action);
      case ACTION_TYPE.Foul:
          return handleFoul(action);
      case ACTION_TYPE.Move:
          return handleMove(action, resultIndex);
      case ACTION_TYPE.TakeDamage:
          return handleTakeDamage(action, resultIndex);
      case ACTION_TYPE.Kickoff:
          return handleKickoff(action);
      case ACTION_TYPE.Scatter:
          return handleScatter(action);
      case ACTION_TYPE.Catch:
          return handleCatch(action, resultIndex);
      case ACTION_TYPE.TouchDown:
          return handleTouchdown();
      case ACTION_TYPE.StunWake:
          return handleStunWake(action);
      case ACTION_TYPE.Pickup:
          return handlePickup(action, resultIndex);
      case ACTION_TYPE.ActivationTest:
          return handleActivationTest(action, resultIndex);
      case ACTION_TYPE.Leap:
          return handleLeap(action, resultIndex);
      case ACTION_TYPE.ActivatePlayer:
          return handleActivate(action);
      case ACTION_TYPE.InitialWeather:
          return handleWeather(action, resultIndex);
      case ACTION_TYPE.Turnover:
          return handleTurnover(action);
        default:
          assertExhaustive(action, "Unhandled Action Type");
    }
  }
  function sleep(ms) {
    let signal = abort.signal;
    return new Promise<void>((resolve, reject) => {
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

  async function step(ticks=1) {
    if (skipping) {
      return;
    }
    await tick();
    let sleepTime = $timing * ticks;
    await sleep(sleepTime);
  }

  async function handleSetupAction() {}

  async function handleBoardAction(boardAction: BB2.RulesEventBoardAction, resultIndex: number) {
    try {
      await dispatchAction(boardAction, resultIndex);
      await step();
    } catch (err) {
      await step();
      console.error("Action failed", { err, boardAction, resultIndex });
      throw err;
    }
  }

  async function handleBoardState(boardState) {
    await resetFromBoardState(boardState);
  }

  async function stepReplay(updateUrl = true) {
    const step = $replay.fullReplay.ReplayStep[current.step];
    const subStep = step[REPLAY_KEY.get(current.subStep)];
    switch (current.subStep) {
      case REPLAY_SUB_STEP.SetupAction:
        await handleSetupAction();
        break;
      case REPLAY_SUB_STEP.BoardAction:
        let action = ensureList(subStep)[current.action];
        if (!action) {
          console.error("No action found", {
            subStep,
            replayCurrent: current,
            step,
          });
        }
        await handleBoardAction(action, current.result);
        break;
      case REPLAY_SUB_STEP.EndTurn:
        await handleTurnover(subStep);
        break;
      case REPLAY_SUB_STEP.BoardState:
        await handleBoardState(subStep);
        break;
    }
    current = current.toNextPosition($replay.fullReplay);
    if (updateUrl) {
      if (!skipping) {
        $replayCurrent = current;
      }
      let url = new URL(window.location.href);
      url.searchParams.set("st", current.toParam());
      window.history.replaceState({}, "", url.href);
    }
  }

  async function jumpToPosition(position, updateUrl = true) {
    clearTemporaryState();
    current = new ReplayPosition(
      Math.max(0, position.step - 1),
      REPLAY_SUB_STEP.BoardState
    );
    skipping = true;
    while (position.atOrAfter(current)) {
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
          previewing = null;
          underPreview = null;
        } else if (underPreview && previewing != $replayPreview) {
          previewing = $replayPreview;
          homeTeam = {
            dugout: {
              cas: [],
              ko: [],
              reserve: [],
            },
          };
          awayTeam = {
            dugout: {
              cas: [],
              ko: [],
              reserve: [],
            },
          };
          pitch = {};
          players = {};
          jumpToPosition($replayPreview.start, false);
          // resetFromBoardState($replay.fullReplay.ReplayStep[$replayPreview.start.step - 1].BoardState, true);
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
          homeTeam = {
            dugout: {
              cas: [],
              ko: [],
              reserve: [],
            },
          };
          awayTeam = {
            dugout: {
              cas: [],
              ko: [],
              reserve: [],
            },
          };
          pitch = {};
          players = {};
          jumpToPosition($replayPreview.start, false);
          // resetFromBoardState($replay.fullReplay.ReplayStep[$replayPreview.start.step - 1].BoardState, true);
        }
        if (underPreview && $replayTarget == $replayPreview.start) {
          underPreview = {
            homeTeam,
            awayTeam,
            pitch,
            players,
            playing,
            current,
          };
          $replayTarget = null;
          jumpToPosition($replayPreview.start);
        }
        if (current == END) {
          current = new ReplayPosition();
          return;
        }
        if ($replayTarget) {
          const target = $replayTarget;
          $replayTarget = null;
          await jumpToPosition(target);
        }
        if ($replay.fullReplay && playing) {
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
    for (var stepI = current.step; stepI--; stepI > 0) {
      const step = $replay.fullReplay.ReplayStep[stepI];
      const actions = ensureList(step.RulesEventBoardAction);
      const actionTypes = actions.map((action) => action.ActionType || 0);
      if (actionTypes.includes(ACTION_TYPE.ActivatePlayer)) {
        $replayTarget = new ReplayPosition(stepI);
        return;
      }
    }
  }

  function jumpToPreviousTurn() {
    for (var stepI = current.step - 1; stepI--; stepI > 0) {
      const step = $replay.fullReplay.ReplayStep[stepI];
      if (step.RulesEventEndTurn) {
        $replayTarget = new ReplayPosition(stepI + 1);
        return;
      }
    }
  }
  function jumpToPreviousStep() {
    $replayTarget = new ReplayPosition(current.step - 1);
  }
  function jumpToNextActivation() {
    for (
      var stepI = current.step;
      stepI++;
      stepI < $replay.fullReplay.ReplayStep.length
    ) {
      const step = $replay.fullReplay.ReplayStep[stepI];
      const actions = ensureList(step.RulesEventBoardAction);
      const actionTypes = actions.map((action) => action.ActionType || 0);
      if (actionTypes.includes(ACTION_TYPE.ActivatePlayer)) {
        $replayTarget = new ReplayPosition(stepI);
        return;
      }
    }
  }
  function jumpToNextTurn() {
    for (
      var stepI = current.step;
      stepI++;
      stepI < $replay.fullReplay.ReplayStep.length
    ) {
      const step = $replay.fullReplay.ReplayStep[stepI];
      if (step.RulesEventEndTurn) {
        $replayTarget = new ReplayPosition(stepI + 1);
        return;
      }
    }
  }

  function handle() {
    //not implemented
  }

  function clearTemporaryState() {
    Object.entries(pitch).forEach(([idx, square]) => {
      square.dice = null;
      square.cell = null;
      square.foul = false;
      if (square.player) {
        players[square.player].moving = false;
      }
      pitch[idx] = square;
    });
  }

  function handleWeather(action: BB2.WeatherAction, resultIndex: number) {
    let actionResult = ensureList(action.Results.BoardActionResult)[resultIndex];
    const dice = translateStringNumberList(actionResult.CoachChoices.ListDices);
    const diceSums = {
      2: WEATHER.SwelteringHeat,
      3: WEATHER.VerySunny,
      11: WEATHER.PouringRain,
      12: WEATHER.Blizzard,
    };
    weather = diceSums[dice[0] + dice[1]] || WEATHER.Nice;
  }

  function handleActivate(action) {
    clearTemporaryState();
    players[action.PlayerId].prone = false;
    Object.entries(pitch).forEach(([idx, square]) => {
      if (square.cell) {
        square.cell.active = false;
      }
      if (square.player) {
        if (square.player == action.PlayerId) {
          if (!square.cell) {
            square.cell = {};
          }
          square.cell.active = true;
        }
        pitch[idx] = square;
      }
    });
  }

  function handleScatter(action) {
    setPitchSquare(action.Order.CellFrom).ball = null;
    let to = action.Order.CellTo.Cell;
    setPitchSquare(to).ball = {
      held: false,
    };
  }

  async function handleBlock(action: BB2.BlockAction, resultIndex: number) {
    let actionResult = ensureList(action.Results.BoardActionResult)[resultIndex];
    let from = action.Order.CellFrom;
    let fromSquare = setPitchSquare(from);
    (fromSquare.cell = fromSquare.cell || {}).active = true;

    let to = action.Order.CellTo.Cell;
    let toSquare = setPitchSquare(to);
    let toPlayer = toSquare.player;

    Object.values(pitch).forEach((square) => {
      square.dice = null;
    });

    if (actionResult.RollType === ROLL.Block) {
      let target = setPitchSquare(action.Order.CellTo.Cell);
      if (!target.cell) {
        target.cell = {};
      }
      target.cell.target = true;

      if (actionResult.IsOrderCompleted) {
        target["dice"] = [
          translateStringNumberList(actionResult.CoachChoices.ListDices)[0],
        ];
      } else {
        let dice = translateStringNumberList(
          actionResult.CoachChoices.ListDices
        );
        target.dice = dice.slice(0, dice.length / 2);
      }
      await step(4);
    }
    if (actionResult.RollType === ROLL.Push) {
      //pushback
      if (actionResult.IsOrderCompleted) {
        Object.values(pitch).forEach((square) => {
          if (square.cell) {
            square.cell.pushbackChoice = false;
            square.cell.target = false;
          }
        });

        let pushTarget = ensureList(
          actionResult.CoachChoices.ListCells.Cell
        )[0];
        let targetSquare = setPitchSquare(pushTarget);
        if (lastChainPush) {
          toPlayer = lastChainPush;
        }

        if (targetSquare.player) {
          lastChainPush = targetSquare.player;
        } else {
          lastChainPush = null;
        }

        targetSquare.player = toPlayer;
        toSquare.player = null;
      } else {
        ensureList(actionResult.CoachChoices.ListCells.Cell).forEach((cell) => {
          let square = setPitchSquare(cell);
          square.cell = square.cell || {};
          square.cell.pushbackChoice = true;

          if (cell.x < 0 || cell.x > 25 || cell.y < 0 || cell.y > 14) {
            //surf
            let team = players[toPlayer].team;
            let dugout = team == SIDE.home ? homeTeam.dugout : awayTeam.dugout;
            dugout.reserve.push(toPlayer);
            toSquare.player = null;
          }
        });
      }
    }
    if (actionResult.RollType === ROLL.FollowUp) {
      //follow up
      if (actionResult.IsOrderCompleted) {
        const from = action.Order.CellFrom;
        const target = ensureList(actionResult.CoachChoices.ListCells.Cell)[0];
        if (from.x != target.x || from.y != target.y) {
          const fromSquare = setPitchSquare(from);
          setPitchSquare(target).player = fromSquare.player;
          fromSquare.player = null;
        }
      }
    }
  }

  function handleCatch(action: BB2.CatchAction, resultIndex: number) {
    let actionResult = ensureList(action.Results.BoardActionResult)[resultIndex];
    if (!actionResult.IsOrderCompleted) return;
    if (actionResult.ResultType !== 0) return;

    Object.values(pitch).forEach((cell) => (cell["ball"] = null));
    setPitchSquare(action.Order.CellTo.Cell).ball = { held: true };
  }

  async function handleTurnover(endTurn: BB2.TurnoverAction) {
    if (endTurn.Turnover) {
      banner = "turnover";
      clearTemporaryState();
      await step(5);
      banner = null;
      await step();
    }
  }

  async function handleFoul(action: BB2.FoulAction) {
    const targetSquare = setPitchSquare(action.Order.CellTo.Cell);

    targetSquare.foul = true;
    await step();
  }
  function handleStunWake(action: BB2.StunWakeAction) {
    let player = setPlayer(action.PlayerId);
    player.stunned = false;
    player.prone = true;
  }

  function handleHandoff(action: BB2.HandoffAction) {
    let from = setPitchSquare(action.Order.CellFrom);
    let to = setPitchSquare(action.Order.CellTo.Cell);
    to.ball = from.ball;
    from.ball = null;
  }

  function handleKickoff(action: BB2.KickoffAction) {
    let square = (setPitchSquare(action.Order.CellTo.Cell).ball = {
      held: false,
    });
  }

  function handleLeap(action: BB2.LeapAction, resultIndex: number) {
    handleMove(action, resultIndex);
  }

  function handleMove(action: BB2.MoveAction, resultIndex: number) {
    let actionResult = ensureList(action.Results.BoardActionResult)[resultIndex];
    let player = setPlayer(action.PlayerId);
    let squareFrom = setPitchSquare(action.Order.CellFrom);
    let squareTo = setPitchSquare(action.Order.CellTo.Cell);

    player.prone = false;
    player.moving = true;
    if (actionResult.IsOrderCompleted && squareTo != squareFrom) {
      squareFrom.player = null;
      squareTo.player = action.PlayerId;
    }

    squareFrom.cell = squareFrom.cell || {};
    squareFrom.cell.moved = true;
    squareFrom.cell.active = false;

    if (actionResult.IsOrderCompleted) {
      squareTo.cell = squareTo.cell || {};
      squareTo.cell.active = true;
    }

    if (
      actionResult.RollType &&
      [ROLL.Dodge, ROLL.GFI, ROLL.Leap].includes(actionResult.RollType)
    ) {
      //Dodge, GFI, Leap
      squareTo.cell = squareTo.cell || {};
      let modifier =
        ensureList(actionResult.ListModifiers.DiceModifier || [])
          .map((modifier) => modifier.Value || 0)
          .reduce((a, b) => a + b, 0) || 0;
      squareTo.cell.plus = actionResult.Requirement - modifier;
    }

    if (player.data.Id == blitzerId) {
      player.blitz = true;
    }
    if (squareFrom.ball) {
      let ball = squareFrom.ball;
      squareFrom.ball = null;
      squareTo.ball = ball;
    }
  }

  function handleActivationTest(action: BB2.ActivationTestAction, resultIndex: number) {
    /* rolltypes
      BoneHead = 20,
      ReallyStupid = 21,
      WildAnimal = 22,
      Loner = 23
      TakeRoot = 40,
      Bloodlust = 50,

    */
    let actionResult = ensureList(action.Results.BoardActionResult)[resultIndex];
    let square = setPitchSquare(action.Order.CellTo.Cell);

    if (actionResult.ResultType === RESULT_TYPE.Passed) {
      //success
      players[square.player].stupidity = null;
    } else {
      //failure
      const STUPID_TYPES = {
        [ROLL.BoneHead]: "BoneHeaded",
        [ROLL.ReallyStupid]: "Stupid",
        [ROLL.TakeRoot]: "Rooted",
        [ROLL.WildAnimal]: "WildAnimal",
      };
      players[square.player].stupidity = STUPID_TYPES[actionResult.RollType];
    }
  }

  async function handlePass(action: BB2.PassAction, resultIndex: number) {
    let actionResult = ensureList(action.Results.BoardActionResult)[resultIndex];
    if (!actionResult.IsOrderCompleted) {
      return;
    }

    let from = setPitchSquare(action.Order.CellFrom);
    if (from.ball) {
      from.ball.held = false;
    }
    await step(0.5);

    if (actionResult.ResultType === RESULT_TYPE.Passed) {
      //success
      let target = setPitchSquare(action.Order.CellTo.Cell);
      if (from.ball) {
        target.ball = from.ball;
        from.ball = null;
      }
      await step();
    }
  }

  function handlePickup(action: BB2.PickupAction, resultIndex: number) {
    let actionResult = ensureList(action.Results.BoardActionResult)[resultIndex];
    if (
      actionResult.IsOrderCompleted &&
      actionResult.ResultType === RESULT_TYPE.Passed
    )
      Object.values(pitch).forEach((square) => {
        if (square["ball"]) {
          //successful pickup
          square["ball"]["held"] = true;
        }
      });
  }

  function handleTakeDamage(action: BB2.TakeDamageAction, resultIndex: number) {
    let actionResult = ensureList(action.Results.BoardActionResult)[resultIndex];
    if (!actionResult.IsOrderCompleted) return;

    let player = setPlayer(action.PlayerId),
      playerSquareIndex: string;

    Object.entries(pitch).forEach(([idx, square]) => {
      if (square.cell) {
        square.cell.target = null;
      }
      if (square.player && square.player == action.PlayerId) {
        pitch[idx] = square; // Force svelte to update
        playerSquareIndex = idx;
      }
    });

    switch (actionResult.RollType) {
      case 3: //armor
        if (actionResult.ResultType === 1) {
          // armor failed
          //knocked down
          if (player) {
            player.prone = true;
          }
        }
        break;
      case 4: //injury
        if (actionResult.SubResultType === 2) {
          //stunned
          if (player) {
            player.stunned = true;
          }
        } else if (actionResult.SubResultType === 3) {
          //knocked out
          let team = player.team;
          let dugout = team == SIDE.home ? homeTeam.dugout : awayTeam.dugout;
          dugout.ko.push(pitch[playerSquareIndex].player);
          pitch[playerSquareIndex].player = null;
        }
        break;
      case 8: //casualty
        //knocked out
        let team = player.team;
        let dugout = team == SIDE.home ? homeTeam.dugout : awayTeam.dugout;
        dugout.cas.push(pitch[playerSquareIndex].player);
        pitch[playerSquareIndex].player = null;
        pitch[playerSquareIndex].blood = {
          blood: Math.floor(4 * Math.random() + 1),
        };
        break;
      case 25: //regeneration
    }
  }

  async function handleTouchdown() {
    banner = "touchdown";
    clearTemporaryState();
    await step(5);
    banner = null;
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
          <Button title="Previous Replay Step" on:click={() => jumpToPreviousStep()}
            >{"|<"}</Button
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
          <Button title="Next Replay Step" on:click={() => stepReplay()}>{">|"}</Button>
          <Button title="Next Activation" on:click={() => jumpToNextActivation()}
            >{">>|"}</Button
          >
          <Button title="Next Turn" on:click={() => jumpToNextTurn()}>{">>>|"}</Button>
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
                player={$hoveredPlayer || $selectedPlayer}
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
{#if $replay.unknownRolls.length > 0}
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
