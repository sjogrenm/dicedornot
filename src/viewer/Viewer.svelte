<script>
  import { onMount, tick } from "svelte";
  import { sineInOut } from "svelte/easing";
  import { crossfade } from "svelte/transition";
  import { Row, Col, ButtonToolbar, Button, Icon } from "sveltestrap";
  import HomeDugout from "./HomeDugout.svelte";
  import AwayDugout from "./AwayDugout.svelte";
  import Pitch from "./Pitch.svelte";
  import {
    getPlayerType,
    SITUATION,
    ROLL,
    WEATHER,
    RESULT_TYPE,
    ACTION_TYPE,
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
  } from "../replay-utils.js";
  import { replay, replayCurrent, replayTarget, timing, error } from "../stores.js";
  let lastChainPush,
    races = [],
    homeTeam = {},
    awayTeam = {},
    pitch = {},
    blitzerId,
    banner,
    weather,
    playing = false,
    skipping = false;

  const DUGOUT_POSITIONS = {
    [SITUATION.Reserves]: "reserve",
    [SITUATION.KO]: "ko",
    [SITUATION.Casualty]: "cas",
    [SITUATION.SentOff]: "cas",
  };

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
    let params = new URLSearchParams(window.location.search);
    $timing = params.get("timing") || 300;
    startPlayer();
    return () => console.log("destroyed");
  });

  async function resetFromBoardState(boardState) {
    blitzerId = boardState.BlitzerId;
    homeTeam = processTeam(
      boardState.ListTeams.TeamState[0],
      boardState.ActiveTeam != 1
    );
    awayTeam = processTeam(
      boardState.ListTeams.TeamState[1],
      boardState.ActiveTeam == 1
    );
    races = boardState.ListTeams.TeamState.flatMap(
      (team) => team.ListPitchPlayers.PlayerState.map(player => {
        const { race } = getPlayerType(player.Id, player.Data.IdPlayerTypes);
        return race;
      })
    ).filter((v, i, a) => a.indexOf(v) === i);
    setPlayerStates(boardState);
    setBallPosition(boardState);
    await step();
  }

  function processTeam(team, active) {
    return {
      logo: team.Data.Logo.toLowerCase(),
      dugout: {
        cas: [],
        ko: [],
        reserve: [],
      },
      score: team.Touchdown || 0,
      name: team.Data.Name,
      turn: team.GameTurn || 1,
      active,
      //rerolls
      //inducements
    };
  }

  function setPitchSquare(cell) {
    let square = (pitch[`${cell.x || 0}-${cell.y || 0}`] =
      pitch[`${cell.x || 0}-${cell.y || 0}`] || {});
    return square;
  }
  function setPlayer(id) {
    let player;
    Object.entries(pitch).forEach(([idx, square]) => {
      if (square.player && square.player.data.Id == id) {
        pitch[idx] = square;
        player = square.player;
      }
    });
    return player;
  }

  function setPlayerStates(boardState) {
    Object.values(pitch).forEach((square) => {
      if (square.player) {
        square.player = null;
      }
    });
    boardState.ListTeams.TeamState[0].ListPitchPlayers.PlayerState.map((p) =>
      placePlayer(p, "home")
    );
    boardState.ListTeams.TeamState[1].ListPitchPlayers.PlayerState.map((p) =>
      placePlayer(p, "away")
    );
  }

  function placePlayer(p, team) {
    switch (p.Situation) {
      case SITUATION.Active:
        setPitchSquare(p.Cell).player = { data: p };
        break;
      default:
        (team == "home" ? homeTeam : awayTeam).dugout[
          DUGOUT_POSITIONS[p.Situation]
        ].push({ data: p });
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

  let actions = [
    handleMove /*Move = 0*/,
    handleBlock /*Block = 1*/,
    handleBlock /*Blitz = 2*/,
    handlePass /*Pass = 3*/,
    handleHandoff /*HandOff = 4*/,
    handleFoul /*Foul = 5*/,
    handleTakeDamage /*TakeDamage = 6*/,
    handleKickoff /*KickOff = 7*/,
    handleBall /*Ball = 8*/,
    handleCatch /*Catch = 9*/,
    handleTouchdown /*Touchdown = 10*/,
    handleFrontToBack /*FrontToBack = 11*/,
    handle /*WakeUp = 12*/,
    handle /*EventPitchInv = 13*/,
    handlePickup /*PickUp = 14*/,
    handleNegaTraits /*Stupidity = 15*/,
    handle /*Land = 16*/,
    handle /*EatTeamMate = 17*/,
    handle /*Shadow = 18*/,
    handle /*Stab = 19*/,
    handle /*FrenzyStab = 20*/,
    handleLeap /*Leap = 21*/,
    handle /*Chainsaw = 22*/,
    handle /*BallAndChain = 23*/,
    handle /*HailMaryPass = 24*/,
    handle /*PilingOn = 25*/,
    handle /*MultipleBlock = 26*/,
    handle /*HypnoticGaze = 27*/,
    handle /*KickOffReturn = 28*/,
    handle /*PassBlock = 29*/,
    handle /*HalflingChef = 30*/,
    handle /*FireballLaunch = 31*/,
    handle /*FireBallHit = 32*/,
    handle /*LightningBolt = 33*/,
    handle /*DeceiveReferee = 34*/,
    handle /*ScatterPlayer = 35*/,
    handle /*QuickSnap = 36*/,
    handle /*HighKick = 37*/,
    handle /*DumpOff = 38*/,
    handle /*DivingTackle = 39*/,
    handle /*ThrowTeamMate = 40*/,
    handle /*MultipleStab = 41*/,
    handleActivate /*Activate = 42*/,
    handle /*PassBlockMoveLeap = 43*/,
    handle /*PassBlockLeapMove = 44*/,
    handle /*PassBlockLeap = 45*/,
    handle /*FansNumber = 46*/,
    handleWeather /*InitialWeather = 47*/,
    handle /*SwelteringHeat = 48*/,
    handle /*Feed = 49*/,
    handle /*BombExplosionGenerator = 50*/,
    handle /*BombExplosionHit = 51*/,
    handle /*PassBomb = 52*/,
    handle /*CatchBomb = 53*/,
    handle /*ScatterBomb = 54*/,
    handle /*ForcedPassBomb = 55*/,
    handle /*HailMaryBomb = 56*/,
    handleEndTurn /*Turnover = 58*/,
  ];

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function step(ticks) {
    if (skipping) {
      return;
    }
    await tick();
    let sleepTime = $timing * (ticks || 1);
    await sleep(sleepTime);
  }

  async function handleSetupAction(setup) {}

  async function handleBoardAction(boardAction, boardActionResult) {
    const action = actions[boardAction.ActionType || 0];
    try {
      await action(boardAction, boardActionResult);
      await step();
    } catch (error) {
      await step();
      console.error("Action failed", { error, boardAction, boardActionResult });
      throw error;
    }
  }

  async function handleBoardState(boardState) {
    await resetFromBoardState(boardState);
  }

  async function handleReplay() {
    try {
      if ($replayCurrent == END) {
        playing = false;
        return;
      }
      const step = $replay.fullReplay.ReplayStep[$replayCurrent.step];
      if ($replayTarget) {
        const target = $replayTarget;
        $replayTarget = null;
        await jumpToPosition(target);
        return;
      }
      const subStep = step[REPLAY_KEY[$replayCurrent.subStep]];
      switch ($replayCurrent.subStep) {
        case REPLAY_SUB_STEP.SetupAction:
          await handleSetupAction(subStep);
          break;
        case REPLAY_SUB_STEP.BoardAction:
          let action = ensureList(subStep)[$replayCurrent.action];
          if (!action) {
            console.error("No action found", {
              subStep,
              replayCurrent: $replayCurrent,
              step,
            });
          }
          let result = ensureList(action.Results.BoardActionResult)[
            $replayCurrent.result
          ];
          await handleBoardAction(action, result);
          break;
        case REPLAY_SUB_STEP.EndTurn:
          await handleEndTurn(subStep);
          break;
        case REPLAY_SUB_STEP.BoardState:
          await handleBoardState(subStep);
          break;
      }
      $replayCurrent = $replayCurrent.toNextPosition($replay.fullReplay);
    } catch (err) {
      playing = false;
      $error = err;
      console.error(err);
    }
  }

  async function jumpToPosition(position) {
    clearTemporaryState();
    $replayCurrent = new ReplayPosition(
      position.step - 1,
      REPLAY_SUB_STEP.BoardState
    );
    skipping = true;
    while (position.after($replayCurrent)) {
      await handleReplay();
    }
    skipping = false;
  }

  function jumpToPreviousActivation() {
    for (var stepI = $replayCurrent.step; stepI--; stepI > 0) {
      const step = $replay.fullReplay.ReplayStep[stepI];
      const actions = ensureList(step.RulesEventBoardAction);
      const actionTypes = actions.map((action) => action.ActionType || 0);
      if (actionTypes.includes(ACTION_TYPE.ActivatePlayer)) {
        jumpToPosition(new ReplayPosition(stepI));
        return;
      }
    }
  }

  function jumpToPreviousTurn() {
    for (var stepI = $replayCurrent.step; stepI--; stepI > 0) {
      const step = $replay.fullReplay.ReplayStep[stepI];
      if (step.RulesEventEndTurn) {
        jumpToPosition(new ReplayPosition(stepI + 1));
        return;
      }
    }
  }
  function jumpToPreviousStep() {
    jumpToPosition(new ReplayPosition($replayCurrent.step - 1));
  }
  function jumpToNextActivation() {
    for (
      var stepI = $replayCurrent.step;
      stepI++;
      stepI < $replay.fullReplay.ReplayStep.length
    ) {
      const step = $replay.fullReplay.ReplayStep[stepI];
      const actions = ensureList(step.RulesEventBoardAction);
      const actionTypes = actions.map((action) => action.ActionType || 0);
      if (actionTypes.includes(ACTION_TYPE.ActivatePlayer)) {
        jumpToPosition(new ReplayPosition(stepI));
        return;
      }
    }
  }
  function jumpToNextTurn() {
    for (
      var stepI = $replayCurrent.step;
      stepI++;
      stepI < $replay.fullReplay.ReplayStep.length
    ) {
      const step = $replay.fullReplay.ReplayStep[stepI];
      if (step.RulesEventEndTurn) {
        jumpToPosition(new ReplayPosition(stepI + 1));
        return;
      }
    }
  }

  async function startPlayer() {
    playing = true;
    while (playing) {
      await handleReplay();
    }
  }

  function checkRerolls() {
    let elements = document.getElementsByClassName("reroll");
    while (elements.length > 0) {
      elements[0].remove();
    }

    let target = document.getElementById("homeData");
    for (let x = 0; x < this.boardState.homeTeam.rerolls; x++) {
      let d = document.createElement("div");
      d.classList.add("reroll");
      target.childNodes[12 + x].append(d);
    }
    for (
      let x = this.boardState.homeTeam.rerolls;
      this.boardState.homeTeam.rerollsAvailable < x;
      x--
    ) {
      target.childNodes[12 + x - 1].childNodes[0].classList.add("used");
    }

    target = document.getElementById("awayData");
    for (let x = 0; x < this.boardState.awayTeam.rerolls; x++) {
      let d = document.createElement("div");
      d.classList.add("reroll");
      target.childNodes[target.childElementCount - 13 - x].append(d);
    }
    for (
      let x = this.boardState.awayTeam.rerolls;
      this.boardState.awayTeam.rerollsAvailable < x;
      x--
    ) {
      target.childNodes[
        target.childElementCount - x - 12
      ].childNodes[0].classList.add("used");
    }
  }
  function checkInducements() {
    let elements = document.getElementsByClassName("inducement");
    while (elements.length > 0) {
      elements[0].remove();
    }

    let target = document.getElementById("homeData");
    let n = 0;
    for (let x = 0; x < this.boardState.homeTeam.babes; x++) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("babe");
      target.childNodes[n++].append(d);
    }

    if (this.boardState.homeTeam.chef) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("chef");
      target.childNodes[n++].append(d);
    }

    if (this.boardState.homeTeam.wizard) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("wizard");
      target.childNodes[n++].append(d);
    }

    for (let x = 0; x < this.boardState.homeTeam.bribes; x++) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("bribe");
      target.childNodes[n++].append(d);
    }

    for (let x = 0; x < this.boardState.homeTeam.igors; x++) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("igor");
      target.childNodes[n++].append(d);
    }

    for (let x = 0; x < this.boardState.homeTeam.apothecaryNumber; x++) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("apo");
      target.childNodes[n++].append(d);
    }

    if (
      this.boardState.homeTeam.apothecaryNumber === 0 &&
      this.boardState.homeTeam.teamHasApothecary
    ) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("apo");
      d.classList.add("used");
      target.childNodes[n++].append(d);
    }

    target = document.getElementById("awayData");
    n = 0;
    for (let x = 0; x < this.boardState.awayTeam.babes; x++) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("babe");
      target.childNodes[target.childElementCount - 1 - n++].append(d);
    }

    if (this.boardState.awayTeam.chef) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("chef");
      target.childNodes[target.childElementCount - 1 - n++].append(d);
    }

    if (this.boardState.awayTeam.wizard) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("wizard");
      target.childNodes[target.childElementCount - 1 - n++].append(d);
    }

    for (let x = 0; x < this.boardState.awayTeam.bribes; x++) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("bribe");
      target.childNodes[target.childElementCount - 1 - n++].append(d);
    }

    for (let x = 0; x < this.boardState.awayTeam.igors; x++) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("igor");
      target.childNodes[target.childElementCount - 1 - n++].append(d);
    }

    for (let x = 0; x < this.boardState.awayTeam.apothecaryNumber; x++) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("apo");
      target.childNodes[target.childElementCount - 1 - n++].append(d);
    }

    if (
      this.boardState.awayTeam.apothecaryNumber === 0 &&
      this.boardState.awayTeam.teamHasApothecary
    ) {
      let d = document.createElement("div");
      d.classList.add("inducement");
      d.classList.add("apo");
      d.classList.add("used");
      target.childNodes[target.childElementCount - 1 - n++].append(d);
    }
  }

  function handle(state) {
    //not implemented
  }

  function clearTemporaryState() {
    Object.entries(pitch).forEach(([idx, square]) => {
      square.dice = null;
      square.cell = null;
      square.foul = false;
      if (square.player) {
        square.player.moving = false;
      }
      pitch[idx] = square;
    });
  }

  function handleWeather(action, actionResult) {
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
    Object.entries(pitch).forEach(([idx, square]) => {
      if (square.cell) {
        square.cell.active = false;
      }
      if (square.player) {
        if (square.player.data.Id == action.ActivePlayerId) {
          if (!square.cell) {
            square.cell = {};
          }
          square.cell.active = true;
          square.player.prone = false;
        }
        pitch[idx] = square;
      }
    });
  }

  function handleBall(action) {
    setPitchSquare(action.Order.CellFrom).ball = null;
    let to = action.Order.CellTo.Cell;
    setPitchSquare(to).ball = {
      held: false,
    };
  }

  async function handleBlock(action, actionResult) {
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
            let team = toPlayer.team;
            let dugout = team == "home" ? homeTeam.dugout : awayTeam.dugout;
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

  function handleCatch(action, actionResult) {
    if (!actionResult.IsOrderCompleted) return;
    if (actionResult.ResultType !== 0) return;

    Object.values(pitch).forEach((cell) => (cell["ball"] = null));
    setPitchSquare(action.Order.CellTo.Cell).ball = { held: true };
  }

  async function handleEndTurn(endTurn) {
    if (endTurn.Turnover) {
      banner = "turnover";
      clearTemporaryState();
      await step(5);
      banner = null;
      await step();
    }
  }

  async function handleFoul(action) {
    const targetSquare = setPitchSquare(action.Order.CellTo.Cell);

    targetSquare.foul = true;
    await step();
  }
  function handleFrontToBack(action) {
    let player = setPlayer(action.PlayerId);
    player.stunned = false;
    player.prone = true;
  }

  function handleHandoff(action) {
    let from = setPitchSquare(action.Order.CellFrom);
    let to = setPitchSquare(action.Order.CellTo.Cell);
    to.ball = from.ball;
    from.ball = null;
  }

  function handleKickoff(action) {
    let square = (setPitchSquare(action.Order.CellTo.Cell).ball = {
      held: false,
    });
  }

  function handleLeap(action, actionResult) {
    handleMove(action, actionResult);
  }

  function handleMove(action, actionResult) {
    let player = setPlayer(action.PlayerId);
    let squareFrom = setPitchSquare(action.Order.CellFrom);
    let squareTo = setPitchSquare(action.Order.CellTo.Cell);

    player.prone = false;
    player.moving = true;
    if (actionResult.IsOrderCompleted && squareTo != squareFrom) {
      squareFrom.player = null;
      squareTo.player = player;
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
      squareTo.cell.plus = actionResult.Requirement;
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

  function handleNegaTraits(action, actionResult) {
    /* rolltypes
      BoneHead = 20,
      ReallyStupid = 21,
      WildAnimal = 22,
      Loner = 23
      TakeRoot = 40,
      Bloodlust = 50,

    */
    let square = setPitchSquare(action.Order.CellTo.Cell);

    if (actionResult.ResultType === RESULT_TYPE.Passed) {
      //success
      square.player.stupidity = null;
    } else {
      //failure
      const STUPID_TYPES = {
        [ROLL.BoneHead]: "BoneHeaded",
        [ROLL.ReallyStupid]: "Stupid",
        [ROLL.TakeRoot]: "Rooted",
      };
      square.player.stupidity = STUPID_TYPES[actionResult.RollType];
    }
  }

  async function handlePass(action, actionResult) {
    if (!actionResult.IsOrderCompleted) {
      return;
    }

    let from = setPitchSquare(action.Order.CellFrom);
    if (from.ball) {
      from.ball.held = false;
    }
    await step(.5);

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

  function handlePickup(action, actionResult) {
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

  function handleTakeDamage(action, actionResult) {
    if (!actionResult.IsOrderCompleted) return;

    let player, playerSquareIndex;

    Object.entries(pitch).forEach(([idx, square]) => {
      if (square.cell) {
        square.cell.target = null;
      }
      if (square.player && square.player.data.Id == action.PlayerId) {
        player = square.player;
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
          let dugout = team == "home" ? homeTeam.dugout : awayTeam.dugout;
          dugout.ko.push(player);
          pitch[playerSquareIndex].player = null;
        }
        break;
      case 8: //casualty
        //knocked out
        let team = player.team;
        let dugout = team == "home" ? homeTeam.dugout : awayTeam.dugout;
        dugout.cas.push(player);
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

<div class="controls">
  <Row class="justify-content-center align-items-center">
    <Col xs="auto">
      <ButtonToolbar>
        <Button
          title="Slower"
          on:click={() => {
            $timing *= 1.2;
          }}>{"-"}</Button
        >
        <Button title="Previous Turn" on:click={jumpToPreviousTurn}
          >{"<<<"}</Button
        >
        <Button
          title="Previous Activation"
          on:click={jumpToPreviousActivation}>{"<<"}</Button
        >
        <Button
          title="Previous Replay Step"
          on:click={jumpToPreviousStep}>{"<"}</Button
        >
        {#if playing}
          <Button
            title="Pause"
            on:click={() => {
              playing = false;
            }}><Icon name="pause-fill" /></Button
          >
        {:else}
          <Button title="Play" on:click={() => startPlayer()}
            ><Icon name="play-fill" /></Button
          >
        {/if}
        <Button title="Next Replay Step" on:click={handleReplay}
          >{">"}</Button
        >
        <Button
          title="Next Activation"
          on:click={jumpToNextActivation}>{">>"}</Button
        >
        <Button title="Next Turn" on:click={jumpToNextTurn}
          >{">>>"}</Button
        >
        <Button
          title="Faster"
          on:click={() => {
            $timing /= 1.2;
          }}>{"+"}</Button
        >
      </ButtonToolbar>
    </Col>
  </Row>
</div>
<div class="pitch-container">
  <div class="pitch-scroll">
    <FixedRatio width={1335} height={1061}>
      <div class="pitch">
        <HomeDugout {homeTeam} {weather} {send} {receive} />
        <Pitch {pitch} {homeTeam} {awayTeam} {send} {receive} />
        <AwayDugout {awayTeam} {send} {receive} />
      </div>
      {#if banner}
        <Banner {banner} />
      {/if}
    </FixedRatio>
  </div>
</div>

<style>
  .pitch-container {
    width: 100%;
    overflow-x: auto;
  }

  @media (min-width: 768px) {
    .pitch-container {
      max-height: 100%;
      height: 100%;
      overflow-x: hidden;
    }
  }
  .pitch-scroll {
    min-width: 738px;
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
</style>
