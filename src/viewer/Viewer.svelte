<script>
	import { quintOut, sineInOut } from 'svelte/easing';
  import { crossfade, fade } from "svelte/transition";
  import HomeDugout from "./HomeDugout.svelte";
  import AwayDugout from "./AwayDugout.svelte";
  import Pitch from "./Pitch.svelte";
  import {
    SITUATION,
    getPlayerType,
    RACE_SLUG,
    ACTION_TYPE,
    Casualties,
    ROLL,
    WEATHER,
RESULT_TYPE,
  } from "../../js/constants.js";
  import { onMount, tick } from "svelte";
  import FixedRatio from "./FixedRatio.svelte";
  import Banner from "./Banner.svelte";
  import {timing} from '../stores.js';
  export let replaySteps, replayStepIndex = 0, replayStart, replayEnd;
  let queue,
    lastChainPush,
    races = [],
    homeTeam = {},
    awayTeam = {},
    pitch = {},
    blitzerId,
    banner,
    weather;

  const DUGOUT_POSITIONS = {
    [SITUATION.Reserves]: "reserve",
    [SITUATION.KO]: "ko",
    [SITUATION.Casualty]: "cas",
    [SITUATION.SentOff]: "cas",
  };

	const [send, receive] = crossfade({
    duration: $timing * .5,
    easing: sineInOut,

		fallback(node, params) {
			const style = getComputedStyle(node);
			const transform = style.transform === 'none' ? '' : style.transform;

			return {
				duration: $timing * .5,
				easing: sineInOut,
				css: t => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`
			};
		}
	});
  
  // pass as arguments to force queue to reset when any arguments change
  $: (() => {
    queue = [];
    console.log("About to reset queue", { replayStart, replayEnd });
    replayStart = replayStart || 0;
    replayEnd = Math.max(replayEnd || replaySteps.length, replayStart + 1);
    console.log("Resetting queue", {
      replayStart,
      replayEnd,
      queue: replaySteps.slice(replayStart, replayEnd),
    });
  })(replaySteps, replayStart, replayEnd);

  onMount(() => {
    console.log("Viewer onMount start");
    processQueue();
    console.log("Viewer onMount queue started");
    return () => console.log("destroyed");
  });

  async function initQueue(replaySteps, replayStart, replayEnd) {
    queue = replaySteps.slice(replayStart, replayEnd);
    if (replayStart > 0) {
      await resetFromBoardState(replaySteps[replayStart - 1].BoardState);
    } else {
      lastChainPush = null;
      races = [];
      homeTeam = {};
      awayTeam = {};
      pitch = {};
      weather = WEATHER.Nice;
    }
    await step(3);
  }

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
    races = boardState.ListTeams.TeamState.map(
      (team) => RACE_SLUG[team.Data.IdRace]
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
      if (square.player && square.player.id == id) {
        pitch[idx] = square;
        player = square.player;
      }
    });
    return player;
  }
  function getPitchSquare(x, y) {
    return pitch[`${x}-${y}`] || {};
  }

  function clearPitch() {
    pitch = {};
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
    let player = getPlayerType(p.Id, p.Data.IdPlayerTypes);
    player.id = p.Id;
    player.team = team;

    switch (p.Status) {
      case 1: //Prone
        player.prone = true;
        break;
      case 2: //Stunned
        player.stunned = true;
        break;
    }

    if (p.disabled) {
      if (p.usedSkills.indexOf(20) > -1) {
        //take root
        player.disabled = "Rooted";
      } else if (p.usedSkills.indexOf(31) > -1) {
        //bonehead
        player.disabled = "BoneHeaded";
      } else if (p.usedSkills.indexOf(51) > -1) {
        //really stupid
        player.disabled = "Stupid";
      }
    }

    if (p.Situation >= SITUATION.Casualty) {
      if (p.Situation === SITUATION.Casualty) {
        player.cas =
          Casualties[
            Math.max(...translateStringNumberList(p.ListCasualties))
          ].icon;
      } else {
        player.cas = "Expelled";
      }
    }

    switch (p.Situation) {
      case SITUATION.Active:
        player.done = p.CanAct != 1;
        setPitchSquare(p.Cell).player = player;
        break;
      default:
        if (team == "home") {
          homeTeam.dugout[DUGOUT_POSITIONS[p.Situation]].push(player);
        } else {
          awayTeam.dugout[DUGOUT_POSITIONS[p.Situation]].push(player);
        }
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

  function ensureList(objOrList) {
    if (objOrList && objOrList.length) {
      return objOrList;
    } else if (objOrList) {
      return [objOrList];
    } else {
      return [];
    }
  }

  function translateStringNumberList(str) {
    if (!str) return [];

    var stripped = str.substring(1, str.length - 1);
    var textList = stripped.split(",");

    var numberList = [];
    for (var i = 0; i < textList.length; i++) {
      numberList.push(parseInt(textList[i]));
    }
    return numberList;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function step(ticks) {
    await tick();
    let sleepTime = $timing * (ticks || 1);
    if (replayStepIndex < replayStart || replayStepIndex > replayEnd) {
      sleepTime *= .1;
    }
    await sleep(sleepTime);
  }

  async function processQueue() {
    while (true) {
      if (queue.length === 0) {
        await initQueue(replaySteps, replayStart, replayEnd);
      }

      const replayStep = queue.shift();
      replayStepIndex = replayStep.index;

      for (const boardAction of ensureList(replayStep.RulesEventBoardAction)) {
        if (boardAction.ActionType !== ACTION_TYPE.Block) lastChainPush = null; // chain pushes fall under block results

        for (const boardActionResult of ensureList(boardAction.Results.BoardActionResult)) {

          const action = actions[boardAction.ActionType || 0];

          try {
            await action(boardAction, boardActionResult);
            await step();
          } catch (error) {
            await step();
            console.error("Action failed", { error, boardAction });
            throw error;
          }
        }
      }
      if (replayStep.RulesEventEndTurn) {
        handleEndTurn(replayStep.RulesEventEndTurn);
      }
      if (replayStep.BoardState) {
        await resetFromBoardState(replayStep.BoardState);
      }
    }
  }
  // wget http://rebblvision.rebbl.net/images/players/{human,dwarf,skaven,orc,lizardman,goblin,woodelf,chaos,darkelf,undead,norse,amazon,proelf,highelf,khemri,necromantic,nurgle,vampire,chaosdwarf,underworld,bretonnian,kislev,chaospact}/{home,away}.png -nH -x

  // Copied from rebbl.net on 2021-01-15 4:45pm EST

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

  function selectPlayer(e) {
    const playerId = Number(e.originalTarget.id.replace("player_", ""));
    const team =
      playerId > 30 ? this.boardState.awayTeam : this.boardState.homeTeam;

    const player = team.players.find((p) => p.id === playerId);

    let target = document.getElementById("skills");
    let elements = target.getElementsByClassName("skill");
    while (elements.length > 0) {
      elements[0].remove();
    }

    player.skills.map((skill) => {
      const d = document.createElement("div");
      d.classList.add("skill");
      d.classList.add(GetCssSkill(skill));
      target.append(d);
    });

    target = document.getElementById("selectPlayer-MV");
    target.innerHTML = player.ma;
    target = document.getElementById("selectPlayer-ST");
    target.innerHTML = player.st;
    target = document.getElementById("selectPlayer-AG");
    target.innerHTML = player.ag;
    target = document.getElementById("selectPlayer-AV");
    target.innerHTML = player.av;
    target = document.getElementById("selectedPlayerName");
    target.innerHTML = player.name;

    target = document.getElementById("selectedPlayerCAS");
    elements = target.getElementsByClassName("cas");
    while (elements.length > 0) {
      elements[0].remove();
    }

    player.existingCasualties.map((cas) => {
      const d = new Image(20, 20);
      d.classList.add("cas");
      d.src = `https://cdn2.rebbl.net/images/skills/${Casualties[cas].icon}.png`;
      target.appendChild(d);
    });
    player.sustainedCasualties.map((cas) => {
      const d = new Image(20, 20);
      d.classList.add("cas");
      d.src = `https://cdn2.rebbl.net/images/skills/${Casualties[cas].icon}.png`;
      target.appendChild(d);
    });
    target = document.getElementById("selectedPlayerData");
    target.style.setProperty("display", "block");
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
    const dice = translateStringNumberList(
      actionResult.CoachChoices.ListDices
    );
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
        if (square.player.id == action.ActivePlayerId) {
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
          translateStringNumberList(
            actionResult.CoachChoices.ListDices
          )[0],
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
        ensureList(
          actionResult.CoachChoices.ListCells.Cell
        ).forEach((cell) => {
          let square = setPitchSquare(cell);
          square.cell = square.cell || {};
          square.cell.pushbackChoice = true;

          if (cell.x < 0 || cell.x > 25 || cell.y < 0 || cell.y > 14) {
            throw "Unexpected surf as a choice";
            //surf
            const target = this.getAvailableGridItem(
              action.ActivePlayerId,
              1,
              action.ActivePlayerId < 21 ? "home" : "away"
            );
            target.appendChild(sprite);
          }
        });
      }
    }
    if (actionResult.RollType === ROLL.FollowUp) {
      //follow up
      if (actionResult.IsOrderCompleted) {
        const from = action.Order.CellFrom;
        const target = ensureList(
          actionResult.CoachChoices.ListCells.Cell
        )[0];
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

  function handleLeap(action) {
    handleMove(action);
  }

  function handleMove(action, actionResult) {
    let player = setPlayer(action.PlayerId);
    let squareFrom = setPitchSquare(action.Order.CellFrom);
    let squareTo = setPitchSquare(action.Order.CellTo.Cell);

    player.prone = false;
    player.moving = true;
    if (
      actionResult.IsOrderCompleted &&
      squareTo != squareFrom
    ) {
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
      [ROLL.Dodge, ROLL.GFI, ROLL.Leap].includes(
        actionResult.RollType
      )
    ) {
      //Dodge, GFI, Leap
      squareTo.cell = squareTo.cell || {};
      squareTo.cell.plus = actionResult.Requirement;
    }

    if (player.id == blitzerId) {
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
      square.player.stupidity =
        STUPID_TYPES[actionResult.RollType];
    }
  }

  async function handlePass(action, actionResult) {
    if (!actionResult.IsOrderCompleted) {
      return;
    }

    let from = setPitchSquare(action.Order.CellFrom);
    from.ball.held = false;
    await step();

    if (actionResult.ResultType === RESULT_TYPE.Passed) {
      //success
      let target = setPitchSquare(action.Order.CellTo.Cell);
      target.ball = from.ball;
      from.ball = null;
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
      if (square.player && square.player.id == action.PlayerId) {
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
          player.prone = true;
        }
        break;
      case 4: //injury
        if (actionResult.SubResultType === 2) {
          //stunned
          player.stunned = true;
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
</svelte:head>

<FixedRatio width={1335} height={1061}>
  <div class="pitch">
    <HomeDugout {homeTeam} {weather} {send} {receive}/>
    <Pitch {pitch} {homeTeam} {awayTeam} {send} {receive}/>
    <AwayDugout {awayTeam} {send} {receive}/>
  </div>
  {#if banner}
    <Banner {banner} />
  {/if}
</FixedRatio>

<style>
  .pitch {
    background-image: url("/images/pitch.png");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    width: 100%;
    height: 100%;
    position: relative;
  }
  @font-face {
    font-family: "trump_town_proregular";
    src: url("Trump_Town_Pro-webfont.woff") format("woff");
    font-weight: normal;
    font-style: normal;
  }
</style>
