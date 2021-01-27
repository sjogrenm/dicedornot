<script>
  import DiceResult from "./DiceResult.svelte";
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
  } from "../../js/constants.js";
  import { replay } from "../../js/replay";
import { onMount, tick } from "svelte";
import { Roll } from "../../js/rolls";

  export let replaySteps;
  let queue;

  let lastPlayerId = 0;

  let lastChainPush = null;
  let races = [];
  let homeTeam = {}, awayTeam = {}, pitch = {};
  let blitzerId;

  let DUGOUT_POSITIONS = {
    [SITUATION.Reserves]: "reserve",
    [SITUATION.KO]: "ko",
    [SITUATION.Casualty]: "cas",
    [SITUATION.SentOff]: "cas",
  };

  $: queue = [...replaySteps];

  onMount(() => {
    processQueue();
    return () => console.log('destroyed');
  });

  function resetFromBoardState(boardState) {
    clearTemporaryState();
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
    console.log(boardState, pitch, homeTeam, awayTeam);
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
      turn: team.Data.GameTurn || 1,
      active,
      //rerolls
      //inducements
    };
  }

  function setPitchSquare(x, y) {
    let square = pitch[`${x}-${y}`] = pitch[`${x}-${y}`] || {};
    return square;
  }
  function getPitchSquare(x, y) {
    return pitch[`${x}-${y}`] || {};
  }

  function clearPitch() {
    pitch = {};
  }

  function setPlayerStates(boardState) {
    Object.values(pitch).forEach(square => {
      if (square.player) {
        delete square.player;
      }
    })
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
        player.cas = Casualties[Math.max(...p.sustainedCasualties)].icon;
      } else {
        player.cas = "Expelled";
      }
    }

    switch (p.Situation) {
      case SITUATION.Active:
        player.done = p.CanAct != 1;
        setPitchSquare(p.Cell.x, p.Cell.y).player = player;
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

    let {x, y} = boardState.Ball.Cell;
    Object.values(pitch).forEach(square => {
      delete square.ball;
    })

    if (x != -1 && y != -1) {
      setPitchSquare(x, y).ball = {held: boardState.Ball.IsHeld == 1};
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
    handle /*InitialWeather = 47*/,
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
    var textList = stripped.split(',');

    var numberList = [];
    for (var i = 0; i < textList.length; i++) {
      numberList.push(parseInt(textList[i]));
    }
    return numberList;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function processQueue() {
    while (true) {
      if (queue.length === 0) {
        return;
      }

      const replayStep = queue.shift();
      console.log(replayStep);

      for (const boardAction of ensureList(replayStep.RulesEventBoardAction)) {

        if (boardAction.ActionType !== ACTION_TYPE.Block) lastChainPush = null; // chain pushes fall under block results

        const action = actions[boardAction.ActionType || 0];
        let timing = 475;
        if (
          [ACTION_TYPE.Block, ACTION_TYPE.Blitz, ACTION_TYPE.Pass].includes(
            boardAction.ActionType
          )
        )
          timing *= 2;

        try {
          action(boardAction);
          await tick();
          console.log("Completed action", {action, boardAction});
        } catch (error) {
          await tick();
          console.error("Action failed", { error, boardAction });
          throw error;
        }

        await sleep(timing);
      }
      resetFromBoardState(replayStep.BoardState);
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

  function checkWeather() {
    const weather = document.getElementById("weather");
    ["heat", "sunny", "perfect", "rain", "blizzard"].map((x) =>
      this.cleanClass(x)
    );
    switch (this.boardState.weather) {
      case 0:
        weather.classList.add("perfect");
        weather.title = "perfect blood bowl weather";
        break;
      case 1:
        weather.classList.add("heat");
        weather.title = "sweltering heat!";
        break;
      case 2:
        weather.classList.add("sunny");
        weather.title = "very sunny";
        break;
      case 3:
        weather.classList.add("rain");
        weather.title = "pouring rain";
        break;
      case 4:
        weather.classList.add("blizzard");
        weather.title = "blizzard go brrrr";
        break;
    }
  }

  function checkBall() {
    const ball = this.boardState.ball;
    let sprite = document.getElementById("ball");
    if (!sprite) {
      sprite = document.createElement("div");
      sprite.id = "ball";
    }

    if (ball.held) sprite.classList.add("held");
    else sprite.classList.remove("held");

    const target = document.getElementById(`pos_${ball.x}_${ball.y}`);
    if (target) target.appendChild(sprite);
  }
  function handleScore() {
    const homeScore = document.getElementById("homeScore");
    const awayScore = document.getElementById("awayScore");

    homeScore.innerHTML = this.boardState.homeTeam.score;
    awayScore.innerHTML = this.boardState.awayTeam.score;
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
      if (square.cell) {
        square.cell.target = false;
        square.cell.moved = false;
        square.cell.active = false;
      }
      if (square.player) {
        square.player.moving = false;
      }
      pitch[idx] = square;
    });
    console.log(pitch);
  }

  function handleActivate(action) {
    clearTemporaryState();
    Object.entries(pitch).forEach(([idx, square]) => {
      if (square.player) {
        square.player.active = false;
        if (square.player.id == action.ActivePlayerId) {
          square.player.active = true;
          square.player.prone = false;
        }
        if (square.player.id == lastPlayerId) {
          square.player.done = true;
        }
        pitch[idx] = square;
      }
    });
    lastPlayerId = action.PlayerId;
  }

  function handleBall(action) {
    delete setPitchSquare(action.Order.CellFrom.x, action.Order.CellFrom.y).ball;
    let to = action.Order.CellTo.Cell;
    setPitchSquare(to.x, to.y).ball = {
      held: false,
    };
  }

  function handleBlock(action) {
    let from = action.Order.CellFrom;
    let fromSquare = setPitchSquare(from.x, from.y);
    (fromSquare.cell = fromSquare.cell || {}).active = true;

    let to = action.Order.CellTo.Cell;
    let toSquare = setPitchSquare(to.x, to.y);
    let toPlayer = toSquare.player;

    Object.values(pitch).forEach(square => {
      delete (square.player || {}).dice;
    })

    if (action.Results.BoardActionResult.RollType === 5) {
      let target = setPitchSquare(action.Order.CellTo.Cell.x, action.Order.CellTo.Cell.y);
      if (!target.cell) {
        target.cell = {};
      }
      target.cell.target = true;

      if (action.Results.BoardActionResult.IsOrderCompleted) {
        target['dice'] = [translateStringNumberList(action.Results.BoardActionResult.CoachChoices.ListDices)[0]];
      } else {
        let dice = translateStringNumberList(action.Results.BoardActionResult.CoachChoices.ListDices);
        target.dice = dice.slice(0, dice.length/2);
      }
    }
    if (action.Results.BoardActionResult.RollType === 13) {
      //pushback
      if (action.Results.BoardActionResult.IsOrderCompleted) {
        Object.values(pitch).forEach(square => {
          if (square.cell) {
            delete square.cell.pushbackChoice;
            delete square.cell.target;
          }
        });

        let pushTarget = ensureList(action.Results.BoardActionResult.CoachChoices.ListCells)[0].Cell;
        let targetSquare = setPitchSquare(pushTarget.x, pushTarget.y);
        if (lastChainPush) {
          toPlayer = lastChainPush;
        }

        if (targetSquare.player) {
          lastChainPush = targetSquare.player;
        } else {
          lastChainPush = null;
        }

        targetSquare.player = toPlayer;
        delete toSquare.player;
      } else {
        ensureList(action.Results.BoardActionResult.CoachChoices.ListCells).map((cell) => {
          const square = setPitchSquare(cell.x, cell.y);
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
    if (action.Results.BoardActionResult.RollType === ROLL.FollowUp) {
      //follow up
      if (action.Results.BoardActionResult.IsOrderCompleted) {
        const from = action.Order.CellFrom;
        const fromSquare = setPitchSquare(from.x, from.y);
        const target = ensureList(action.Results.BoardActionResult.CoachChoices.ListCells)[0];
        const targetSquare = setPitchSquare(target.x, target.y).player = fromSquare.player;
        delete fromSquare.player;
      }
    }
  }

  function handleCatch(action) {
    if (!action.Results.BoardActionResult.IsOrderCompleted) return;
    if (action.Results.BoardActionResult.ResultType !== 0) return;

    Object.values(pitch).forEach(cell => cell['ball'] = null);
    setPitchSquare(action.Order.CellTo.Cell.x, action.Order.CellTo.Cell.y).ball = {held: true};
  }

  function handleEndTurn(state) {
    if (state.turnover) {
      const div = document.createElement("div");
      div.classList.add("banner");
      div.classList.add("turnover");
      div.id = "banner";
      const container = document.getElementById("container");
      container.appendChild(div);

      setTimeout((_) => {
        const div = document.getElementById("banner");
        div.parentElement.removeChild(div);
      }, 2500);
    }

    ["moving", "blitz", "done"].map(this.cleanClass);

    this.checkWeather();

    this.lastPlayerId = 0;

    this.boardState = state.boardState;
    this.boardState.homeTeam.players.map((p) => this.placePlayer(p, "home"));
    this.boardState.awayTeam.players.map((p) => this.placePlayer(p, "away"));
    this.activeTeam = state.playingTeam;

    const turn = document.getElementById(
      this.activeTeam === 0 ? "homeTurn" : "awayTurn"
    );

    turn.innerHTML =
      this.activeTeam === 0
        ? this.boardState.homeTeam.turn
        : this.boardState.awayTeam.turn;

    this.cleanClass("active-turn");

    turn.classList.add("active-turn");
  }

  function handleFoul(state) {
    const target = document.getElementById(`pos_${action.Order.CellTo.Cell.x}_${action.Order.CellTo.Cell.y}`);

    if (action.Results.BoardActionResult.RollType === 0) {
      let div = document.createElement("div");
      div.classList.add("dice");
      div.classList.add("d1h");
      div.classList.add("foul");
      target.prepend(div);
    }
  }
  function handleFrontToBack(state) {
    const sprite = document.getElementById(`player_${action.ActivePlayerId}`);
    sprite.classList.remove("stunned");
    sprite.classList.add("prone");
  }

  function handleHandoff(state) {
    let sprite = document.getElementById("ball");
    sprite.classList.remove("held");
    const target = document.getElementById(`pos_${action.Order.CellTo.Cell.x}_${action.Order.CellTo.Cell.y}`);
    target.appendChild(sprite);
  }

  function handleKickoff(action) {
    let {x, y} = action.Order.CellTo.Cell;
    let square = setPitchSquare(x, y).ball = {
      held: false,
    };
  }

  function handleLeap(action) {
    this.handleMove(action);
  }

  function handleMove(action) {
    let squareFrom = setPitchSquare(action.Order.CellFrom.x, action.Order.CellFrom.y);
    let squareTo = setPitchSquare(action.Order.CellTo.Cell.x, action.Order.CellTo.Cell.y);
    console.log(pitch, squareFrom, squareTo);

    delete squareFrom.player.prone;
    squareFrom.player.moving = true;
    if (action.Results.BoardActionResult.IsOrderCompleted) {
      squareTo.player = squareFrom.player;
      delete squareFrom.player;
    }

    squareFrom.cell = squareFrom.cell || {};
    squareFrom.cell.moved = true;
    delete squareFrom.cell.active;
    squareTo.cell = squareTo.cell || {};
    squareTo.cell.active = true;

    if (action.Results.BoardActionResult.RollType && [ROLL.Dodge, ROLL.GFI, ROLL.Leap].includes(action.Results.BoardActionResult.RollType)) {
      //Dodge, GFI, Leap
      squareTo.cell.plus = action.Results.BoardActionResult.Requirement;
    }

    if (squareTo.player.id == blitzerId) {
      squareTo.player.blitz = true;
    }
    if (squareFrom.ball) {
      squareTo.ball = squareFrom.ball;
      delete squareFrom.ball;
    }
  }

  function handleNegaTraits(state) {
    /* rolltypes
      BoneHead = 20,
      ReallyStupid = 21,
      WildAnimal = 22,
      Loner = 23
      TakeRoot = 40,
      Bloodlust = 50,
 
    */
    const target = document.getElementById(`pos_${action.Order.CellTo.Cell.x}_${action.Order.CellTo.Cell.y}`);
    let elements = target.getElementsByClassName("Stupidity");

    if (action.Results.BoardActionResult.ResultType === 0) {
      //success
      while (elements.length > 0) {
        target.removeChild(elements[0]);
      }
      return;
    } else {
      //failure
      if (elements.length === 0) {
        const stateSprite = document.createElement("div");
        stateSprite.classList.add("Stupidity");
        if (action.Results.BoardActionResult.RollType === 40) {
          //take root
          stateSprite.classList.add("Rooted");
        } else if (action.Results.BoardActionResult.RollType === 20) {
          //bonehead
          stateSprite.classList.add("BoneHeaded");
        } else if (action.Results.BoardActionResult.RollType === 21) {
          //really stupid
          stateSprite.classList.add("Stupid");
        }
        if (stateSprite.classList.length > 1) target.appendChild(stateSprite);
      }
    }
  }

  function handlePass(state) {
    if (!action.Results.BoardActionResult.IsOrderCompleted) {
      return;
    }

    let sprite = document.getElementById("ball");
    sprite.classList.remove("held");

    if (action.Results.BoardActionResult.ResultType === 0) {
      //success
      const target = document.getElementById(`pos_${action.Order.CellTo.Cell.x}_${action.Order.CellTo.Cell.y}`);

      target.appendChild(sprite);
      return;
    }
  }

  function handlePickup(action) {
    if (action.Results.BoardActionResult.IsOrderCompleted && action.Results.BoardActionResult.ResultType === 0)
      Object.values(pitch).forEach(square => {
        if (square['ball']) {
          //successful pickup
          square['ball']['held'] = true;
        }
      })
  }

  function handleTakeDamage(action) {
    if (!action.Results.BoardActionResult.IsOrderCompleted) return;

    let player;

    Object.entries(pitch).forEach(([idx, square]) => {
      if (square.cell) {
        delete square.cell.target;
      }
      if (square.player && square.player.id == action.PlayerId) {
        player = square.player;
        pitch[idx] = square;  // Force svelte to update
      }
    });

    switch (action.Results.BoardActionResult.RollType) {
      case 3: //armor
        if (action.Results.BoardActionResult.ResultType === 1) {
          // armor failed
          //knocked down
          player.prone = true;
        }
        break;
      case 4: //injury
        if (action.Results.BoardActionResult.SubResultType === 2) {
          //stunned
          player.stunned = true;
        } else if (action.Results.BoardActionResult.SubResultType === 3) {
          //knocked out
          let team = player.team;
          let dugout = team == 'home' ? homeTeam.dugout : awayTeam.dugout;
            dugout.ko.push(player);
            delete cell.player;
        }
        break;
      case 8: //casualty
        //knocked out
        let team = player.team;
        let dugout = team == 'home' ? homeTeam.dugout : awayTeam.dugout;
        dugout.cas.push(player);
        delete cell.player;
        cell.cell.blood = Math.floor(4 * Math.random() + 1);
        break;
      case 25: //regeneration
    }
  }

  function handleTouchdown() {
    const div = document.createElement("div");
    div.classList.add("banner");
    div.classList.add("touchdown");
    div.id = "banner";
    const container = document.getElementById("container");
    container.appendChild(div);

    let elements = document.getElementsByClassName("Stupidity");
    while (elements.length > 0) {
      elements[0].parentNode.removeChild(elements[0]);
    }

    [
      "active",
      "dice",
      "cell",
      "d1v",
      "d1h",
      "d2v",
      "d2v",
      "d3v",
      "d3v",
      "attacker-down",
      "both-down",
      "defender-down",
      "defender-stumbles",
      "push",
      "foul",
    ].map((cls) => {
      let elements = document.getElementsByClassName(cls);
      while (elements.length > 0) {
        elements[0].remove(cls);
      }
    });

    setTimeout((_) => {
      const div = document.getElementById("banner");
      div.parentElement.removeChild(div);
    }, 2500);
  }
</script>

<svelte:head>
  {#each races as race}
    <link rel="stylesheet" href="/styles/{race}.css" />
  {/each}
  <link rel="stylesheet" href="/styles/sprite.css" />
</svelte:head>

<HomeDugout {homeTeam} />
<Pitch {pitch} {homeTeam} {awayTeam} />
<AwayDugout {awayTeam}/>

<style>
  @font-face {
    font-family: "trump_town_proregular";
    src: url("Trump_Town_Pro-webfont.woff") format("woff");
    font-weight: normal;
    font-style: normal;
  }

  h1 {
    font-family: "trump_town_proregular";
    color: whitesmoke;
  }

  .active-turn {
    color: #ffb22e;
  }

  .grid_item {
    border: 1px dashed rgba(170, 173, 179, 0.31);
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    justify-content: center;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: relative;
  }
  .grid_item_dice {
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    justify-content: center;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: relative;
  }
  .grid_stat {
    width: 19px;
    height: 15px;
    text-align: center;
    display: inline-block;
    align-self: flex-end;
    font-size: smaller;
    margin-top: 1px;
  }

  .box {
    display: grid;
    grid-template-columns: auto auto auto auto auto auto auto auto auto auto auto auto;
    grid-template-rows: auto auto;
    width: 600px;
  }
  .box.away {
    clear: both;
    float: right;
    margin-right: 5px;
  }
  .box.home {
    margin-left: 5px;
    top: 8px;
    position: absolute;
  }

  .banner {
    background: url("/images/banner.png") no-repeat;
    width: 1024px;
    height: 512px;
    display: inline-block;
    position: absolute;
  }
  .touchdown {
    background-position-y: 0px;
  }
  .turnover {
    background-position-y: -539px;
  }
</style>
