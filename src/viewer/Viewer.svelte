<script>
  import DiceResult from "./DiceResult.svelte";
  import HomeDugout from "./HomeDugout.svelte";
  import AwayDugout from "./AwayDugout.svelte";
  import Pitch from "./Pitch.svelte";
  import { homeTeam, awayTeam, pitch } from "../stores.js";
  import { SITUATION, getPlayerType } from '../../js/constants.js';

  export let replaySteps, priorBoardState;
  let stepIndex = 0;
  let boardState;
  let queue;
  let runningTimeout;

  let activeTeam = -1;
  let lastPlayerId = 0;

  let lastChainPush = null;
  
  let DUGOUT_POSITIONS = {
    [SITUATION.Reserves]: 'reserve',
    [SITUATION.KO]: 'ko',
    [SITUATION.Casualty]: 'cas',
    [SITUATION.SentOff]: 'cas',
  };

  $: initialize();

  function initialize() {
    stepIndex = 0;
    boardState = JSON.parse(JSON.stringify(priorBoardState));
    console.log("boardState", boardState);
    $homeTeam = processTeam(boardState.ListTeams.TeamState[0]);
    $awayTeam = processTeam(boardState.ListTeams.TeamState[1]);
    clearPitch();
    setPlayerStates(boardState);
    console.log($pitch);
    // setCurrentTurns(boardState);
  }

  function processTeam(team) {
    return {
      logo: team.Data.Logo,
      dugout: {
        cas: [],
        ko: [],
        reserve: []
      },
    };
  }

  function clearPitch() {
    $pitch = new Array(15).fill().map(() => new Array(26).fill().map(() => ({})));
  }

  function setPlayerStates(boardState) {
    boardState.ListTeams.TeamState[0].ListPitchPlayers.PlayerState.map((p) =>
      placePlayer(p, "home")
    );
    boardState.ListTeams.TeamState[1].ListPitchPlayers.PlayerState.map((p) =>
      placePlayer(p, "away")
    );
  }

  function placePlayer(p, team) {
    let player = getPlayerType(p.Id, p.Data.IdPlayerTypes);
    player['id'] = p.Id;
    player['team'] = team;

    switch (p.Status) {
      case 1: //Prone
        player["prone"] = true;
        break;
      case 2: //Stunned
        player["stunned"] = true;
        break;
    }

    if (p.disabled) {
      if (p.usedSkills.indexOf(20) > -1) {
        //take root
        player['disabled'] = 'Rooted';
      } else if (p.usedSkills.indexOf(31) > -1) {
        //bonehead
        player['disabled'] = 'BoneHeaded';
      } else if (p.usedSkills.indexOf(51) > -1) {
        //really stupid
        player['disabled'] = 'Stupid';
      }
    }

    if (p.Situation >= SITUATION.Casualty) {
      if (p.Situation === SITUATION.Casualty) {
        player.cas = Casualties[Math.max(...p.sustainedCasualties)].icon;
      } else {
        player.cas = 'Expelled';
      }
    }

    switch (p.Situation) {
      case SITUATION.Active:
        $pitch[p.Cell.y][p.Cell.x]['player'] = player;
        break;
      default:
        if (team == "home") {
          $homeTeam['dugout'][DUGOUT_POSITIONS[p.Situation]].push(player);
        } else {
          $awayTeam['dugout'][DUGOUT_POSITIONS[p.Situation]].push(player);
        }
        break;
    }
  }


  // wget http://rebblvision.rebbl.net/images/players/{human,dwarf,skaven,orc,lizardman,goblin,woodelf,chaos,darkelf,undead,norse,amazon,proelf,highelf,khemri,necromantic,nurgle,vampire,chaosdwarf,underworld,bretonnian,kislev,chaospact}/{home,away}.png -nH -x

  // Copied from rebbl.net on 2021-01-15 4:45pm EST

  class _Viewer {
    constructor(socket) {
      const target = document.getElementById("selectedPlayerData");
      target.onclick = (e) => {
        e.currentTarget.style.setProperty("display", "none");
      };


      socket.on(
        "boardstate",
        function (msg) {
          this.boardState = JSON.parse(msg);
          if (!this.initialized) this.init();

          let elements = document.getElementsByClassName("Stupidity");
          while (elements.length > 0) {
            elements[0].parentNode.removeChild(elements[0]);
          }

          this.boardState.homeTeam.players.map((p) =>
            this.placePlayer(p, "home")
          );
          this.boardState.awayTeam.players.map((p) =>
            this.placePlayer(p, "away")
          );
          let turn = document.getElementById("homeTurn");
          turn.innerHTML = this.boardState.homeTeam.turn;
          if (this.boardState.activeTeam === 0)
            turn.classList.add("active-turn");

          turn = document.getElementById("awayTurn");
          turn.innerHTML = this.boardState.awayTeam.turn;
          if (this.boardState.activeTeam === 1)
            turn.classList.add("active-turn");

          this.turnTimer = ~~(this.boardState.turnTimer / 1000);

          this.checkWeather();

          this.checkRerolls();
          this.checkInducements();

          this.checkBall();

          this.handleScore();
        }.bind(this)
      );

      socket.on("turnTimer", (timer) => (this.turnTimer = ~~(timer / 1000)));

      socket.on(
        "action",
        function (msg) {
          const state = JSON.parse(msg);

          if (Array.isArray(state)) {
            this.queue = this.queue.concat(state);
          } else if (state !== null) {
            this.queue.push(state);
          }
        }.bind(this)
      );

      socket.on("setup", function (msg) {
        const setup = JSON.parse(msg);
        let sprite = document.getElementById(`player_${setup.playerId}`);
        let target = document.getElementById(`pos_${setup.x}_${setup.y}`);
        target.appendChild(sprite);
      });

      socket.on(
        "endTurn",
        function (msg) {
          const state = JSON.parse(msg);
          state.actionType = 57; //tiny hack
          if (Array.isArray(state)) {
            this.queue = this.queue.concat(state);
          } else if (state !== null) {
            this.queue.push(state);
          }
        }.bind(this)
      );

      this.actions = [
        this.handleMove.bind(this) /*Move = 0*/,
        this.handleBlock.bind(this) /*Block = 1*/,
        this.handleBlock.bind(this) /*Blitz = 2*/,
        this.handlePass.bind(this) /*Pass = 3*/,
        this.handleHandoff.bind(this) /*HandOff = 4*/,
        this.handleFoul.bind(this) /*Foul = 5*/,
        this.handleTakeDamage.bind(this) /*TakeDamage = 6*/,
        this.handleKickoff.bind(this) /*KickOff = 7*/,
        this.handleBall.bind(this) /*Ball = 8*/,
        this.handleCatch.bind(this) /*Catch = 9*/,
        this.handleTouchdown.bind(this) /*Touchdown = 10*/,
        this.handleFrontToBack.bind(this) /*FrontToBack = 11*/,
        this.handle /*WakeUp = 12*/,
        this.handle /*EventPitchInv = 13*/,
        this.handlePickup.bind(this) /*PickUp = 14*/,
        this.handleNegaTraits.bind(this) /*Stupidity = 15*/,
        this.handle /*Land = 16*/,
        this.handle /*EatTeamMate = 17*/,
        this.handle /*Shadow = 18*/,
        this.handle /*Stab = 19*/,
        this.handle /*FrenzyStab = 20*/,
        this.handleLeap.bind(this) /*Leap = 21*/,
        this.handle /*Chainsaw = 22*/,
        this.handle /*BallAndChain = 23*/,
        this.handle /*HailMaryPass = 24*/,
        this.handle /*PilingOn = 25*/,
        this.handle /*MultipleBlock = 26*/,
        this.handle /*HypnoticGaze = 27*/,
        this.handle /*KickOffReturn = 28*/,
        this.handle /*PassBlock = 29*/,
        this.handle /*HalflingChef = 30*/,
        this.handle /*FireballLaunch = 31*/,
        this.handle /*FireBallHit = 32*/,
        this.handle /*LightningBolt = 33*/,
        this.handle /*DeceiveReferee = 34*/,
        this.handle /*ScatterPlayer = 35*/,
        this.handle /*QuickSnap = 36*/,
        this.handle /*HighKick = 37*/,
        this.handle /*DumpOff = 38*/,
        this.handle /*DivingTackle = 39*/,
        this.handle /*ThrowTeamMate = 40*/,
        this.handle /*MultipleStab = 41*/,
        this.handleActivate.bind(this) /*Activate = 42*/,
        this.handle /*PassBlockMoveLeap = 43*/,
        this.handle /*PassBlockLeapMove = 44*/,
        this.handle /*PassBlockLeap = 45*/,
        this.handle /*FansNumber = 46*/,
        this.handle /*InitialWeather = 47*/,
        this.handle /*SwelteringHeat = 48*/,
        this.handle /*Feed = 49*/,
        this.handle /*BombExplosionGenerator = 50*/,
        this.handle /*BombExplosionHit = 51*/,
        this.handle /*PassBomb = 52*/,
        this.handle /*CatchBomb = 53*/,
        this.handle /*ScatterBomb = 54*/,
        this.handle /*ForcedPassBomb = 55*/,
        this.handle /*HailMaryBomb = 56*/,
        this.handleEndTurn.bind(this) /*Turnover = 58*/,
      ];
    }

    init() {
      const getTeamDiv = (logo) => {
        let e = document.createElement("div");
        e.style.setProperty(
          "background-image",
          `url('https://cdn2.rebbl.net/images/logo/256x256/logo_${logo}.png')`
        );
        e.style.setProperty("height", "40px");
        e.style.setProperty("width", "40px");
        e.style.setProperty("display", "inline-block");
        e.style.setProperty("background-size", "contain");
        return e;
      };

      let e = getTeamDiv(this.boardState.homeTeam.logo.toLowerCase());
      let t = document.getElementById("pos_0_7");
      t.append(e);

      e = getTeamDiv(this.boardState.awayTeam.logo.toLowerCase());
      t = document.getElementById("pos_25_7");
      t.append(e);

      this.initialized = true;
    }

    cleanClass(cls) {
      let elements = document.getElementsByClassName(cls);
      while (elements.length > 0) {
        elements[0].classList.remove(cls);
      }
    }

    checkRerolls() {
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
    checkInducements() {
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

    checkWeather() {
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

    checkBall() {
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
    handleScore() {
      const homeScore = document.getElementById("homeScore");
      const awayScore = document.getElementById("awayScore");

      homeScore.innerHTML = this.boardState.homeTeam.score;
      awayScore.innerHTML = this.boardState.awayTeam.score;
    }

    getAvailableGridItem(id, state, side) {
      let prefix = "";
      switch (state) {
        case 1:
          prefix = `${side}_reserve_`;
          break;
        case 2:
          prefix = `${side}_ko_`;
          break;
        case 4: //cas
        case 5: //sent off
          prefix = `${side}_cas_`;
          break;
      }
      let sprite = document.getElementById(`player_${id}`);

      if (sprite && sprite.parentNode.id.startsWith(prefix))
        return sprite.parentNode;

      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 4; x++) {
          let e = document.getElementById(`${prefix}${x}_${y}`);
          if (e.childElementCount === 0) return e;
        }
    }

    createPlayer(p, css) {
      const sprite = document.createElement("div");
      sprite.setAttribute("id", `player_${p.id}`);

      getPlayerType(p.type)
        .split(" ")
        .map((x) => sprite.classList.add(x));
      sprite.classList.add("sprite");
      sprite.classList.add(css);

      sprite.onclick = this.selectPlayer.bind(this);

      return sprite;
    }

    selectPlayer(e) {
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


    processQueue() {
      this.updateClock();

      if (this.queue.length === 0) {
        setTimeout(this.processQueue.bind(this), 1000);
        return;
      }

      const state = this.queue.shift();

      if (state.actionType !== 1) this.lastChainPush = null; // chain pushes fall under block results

      const action = this.actions[state.actionType];
      let timing = 475;
      if ([1, 2, 3].includes(state.actionType)) timing = 895;

      action(state);

      let player = this.boardState.homeTeam.players
        .concat(this.boardState.awayTeam.players)
        .find((p) => p.id === state.playerId);

      logRow(player ? player.name : "-??-", state.actionType, state);

      setTimeout(this.processQueue.bind(this), timing);
    }

    updateClock() {
      let e = document.getElementById("turnTimer");
      const seconds = (time) =>
        time > 3599
          ? `${~~(time / 3600)}:${~~((time % 3600) / 60) < 10 ? "0" : ""}${~~(
              (time % 3600) /
              60
            )}:${time % 60 < 10 ? "0" : ""}${time % 60}`
          : `${~~(time / 60)}:${time % 60 < 10 ? "0" : ""}${time % 60}`;

      e.innerHTML = seconds(this.turnTimer);
    }

    handle(state) {
      //not implemented
    }

    handleActivate(state) {
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

      let elements = document.getElementsByClassName("cell");
      while (elements.length > 0) {
        elements[0].remove();
      }
      let div = document.createElement("div");
      div.classList.add("cell");
      div.classList.add("active");
      document
        .getElementById(`player_${state.playerId}`)
        .parentElement.prepend(div);
      document
        .getElementById(`player_${state.playerId}`)
        .classList.remove("prone");

      if (this.lastPlayerId > 0) {
        document
          .getElementById(`player_${this.lastPlayerId}`)
          .classList.add("done");
      }

      this.lastPlayerId = state.playerId;
    }

    handleBall(state) {
      let sprite = document.getElementById("ball");

      if (!sprite) {
        sprite = document.createElement("div");
        sprite.id = "ball";
      }
      sprite.classList.remove("held");

      const target = document.getElementById(`pos_${state.to.x}_${state.to.y}`);
      if (target) target.appendChild(sprite);
    }

    handleBlock(state) {
      const spriteFrom = document.getElementById(
        `pos_${state.from.x}_${state.from.y}`
      ).lastChild;
      let spriteTo = document.getElementById(`pos_${state.to.x}_${state.to.y}`)
        .lastChild;

      let elements = document.getElementsByClassName("dice");
      while (elements.length > 0) {
        elements[0].remove();
      }

      if (state.rollType === 5) {
        let target = document.getElementById(`pos_${state.to.x}_${state.to.y}`);

        if (state.completed) {
          new DiceResult({
            target,
            data: {
              dice: [state.diceResult[0]],
            },
          });
        } else {
          new DiceResult({
            target,
            data: {
              dice: state.diceResult,
            },
          });
        }
        let div = document.createElement("div");
        div.classList.add("cell");
        div.classList.add("target");
        target.prepend(div);
      }
      if (state.rollType === 13) {
        //pushback
        if (state.completed) {
          let elements = document.getElementsByClassName("pushback-choice");
          while (elements.length > 0) {
            elements[0].remove();
          }
          elements = document.getElementsByClassName("target");
          while (elements.length > 0) {
            elements[0].remove();
          }

          const target = document.getElementById(
            `pos_${state.cells[0].x}_${state.cells[0].y}`
          );
          if (this.lastChainPush)
            spriteTo = document.getElementById(this.lastChainPush);

          if (target.children.length > 0) {
            this.lastChainPush = target.lastChild.id;
          } else {
            this.lastChainPush = null;
          }

          target.appendChild(spriteTo);
        } else {
          state.cells.map((cell) => {
            const choice = document.createElement("div");
            choice.classList.add("cell");
            choice.classList.add("pushback-choice");

            if (cell.x < 0 || cell.x > 25 || cell.y < 0 || cell.y > 14) {
              //surf
              const target = this.getAvailableGridItem(
                state.playerId,
                1,
                state.playerId < 21 ? "home" : "away"
              );
              target.appendChild(sprite);
            } else {
              const target = document.getElementById(`pos_${cell.x}_${cell.y}`);
              target.appendChild(choice);
            }
          });
        }
      }
      if (state.rollType === 14) {
        //follow up
        if (state.completed) {
          document
            .getElementById(`pos_${state.from.x}_${state.from.y}`)
            .childNodes[0].remove();
          const target = document.getElementById(
            `pos_${state.cells[0].x}_${state.cells[0].y}`
          );
          target.appendChild(spriteFrom);
        }
      }
    }

    handleCatch(state) {
      if (!state.completed) return;
      if (state.resultType !== 0) return;

      let sprite = document.getElementById("ball");
      sprite.classList.add("held");
      const target = document.getElementById(`pos_${state.to.x}_${state.to.y}`);
      target.appendChild(sprite);
    }

    handleEndTurn(state) {
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

    handleFoul(state) {
      const target = document.getElementById(`pos_${state.to.x}_${state.to.y}`);

      if (state.rollType === 0) {
        let div = document.createElement("div");
        div.classList.add("dice");
        div.classList.add("d1h");
        div.classList.add("foul");
        target.prepend(div);
      }
    }
    handleFrontToBack(state) {
      const sprite = document.getElementById(`player_${state.playerId}`);
      sprite.classList.remove("stunned");
      sprite.classList.add("prone");
    }

    handleHandoff(state) {
      let sprite = document.getElementById("ball");
      sprite.classList.remove("held");
      const target = document.getElementById(`pos_${state.to.x}_${state.to.y}`);
      target.appendChild(sprite);
    }

    handleKickoff(state) {
      let sprite = document.getElementById("ball");

      if (!sprite) {
        sprite = document.createElement("div");
        sprite.id = "ball";
      }
      sprite.classList.remove("held");

      const target = document.getElementById(`pos_${state.to.x}_${state.to.y}`);
      if (target) target.appendChild(sprite);
    }

    handleLeap(state) {
      this.handleMove(state);
    }

    handleMove(state) {
      const sprite = document.getElementById(`player_${state.playerId}`);
      const target = document.getElementById(`pos_${state.to.x}_${state.to.y}`);

      sprite.classList.remove("prone");
      sprite.classList.add("moving");
      if (state.completed) {
        target.appendChild(sprite);
      }

      let elements = document.getElementsByClassName("active");
      while (elements.length > 0) {
        elements[0].classList.add("moved");
        elements[0].classList.remove("active");
      }

      if (state.rollType && [1, 2, 36].includes(state.rollType)) {
        //Dodge, GFI, Leap
        let div = document.createElement("div");
        div.classList.add("cell");
        div.classList.add(`plus${state.requirement}`);
        target.prepend(div);
      }
      if (state.completed) {
        let div = document.createElement("div");
        div.classList.add("cell");
        div.classList.add("active");
        target.prepend(div);
      }

      if (state.blitzing) {
        sprite.classList.add("blitz");
      }
      if (state.hasBall) {
        let sprite = document.getElementById("ball");
        target.appendChild(sprite);
      }
    }

    handleNegaTraits(state) {
      /* rolltypes
      BoneHead = 20,
      ReallyStupid = 21,
      WildAnimal = 22,    
      Loner = 23
      TakeRoot = 40,
      Bloodlust = 50,
 
    */
      const target = document.getElementById(`pos_${state.to.x}_${state.to.y}`);
      let elements = target.getElementsByClassName("Stupidity");

      if (state.resultType === 0) {
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
          if (state.rollType === 40) {
            //take root
            stateSprite.classList.add("Rooted");
          } else if (state.rollType === 20) {
            //bonehead
            stateSprite.classList.add("BoneHeaded");
          } else if (state.rollType === 21) {
            //really stupid
            stateSprite.classList.add("Stupid");
          }
          if (stateSprite.classList.length > 1) target.appendChild(stateSprite);
        }
      }
    }

    handlePass(state) {
      if (!state.completed) {
        return;
      }

      let sprite = document.getElementById("ball");
      sprite.classList.remove("held");

      if (state.resultType === 0) {
        //success
        const target = document.getElementById(
          `pos_${state.to.x}_${state.to.y}`
        );

        target.appendChild(sprite);
        return;
      }
    }

    handlePickup(state) {
      let sprite = document.getElementById("ball");

      if (state.completed && state.resultType === 0)
        //successful pickup
        sprite.classList.add("held");
    }

    handleTakeDamage(state) {
      const sprite = document.getElementById(`player_${state.playerId}`);
      if (!state.completed) return;

      let elements = document.getElementsByClassName("target");
      while (elements.length > 0) {
        elements[0].remove();
      }

      switch (state.rollType) {
        case 3: //armor
          if (state.resultType === 1) {
            // armor failed
            //knocked down
            sprite.classList.add("prone");
          }
          break;
        case 4: //injury
          if (state.subResultType === 2) {
            //stunned
            sprite.classList.add("stunned");
          } else if (state.subResultType === 3) {
            //knocked out
            const target = this.getAvailableGridItem(
              state.playerId,
              2,
              state.playerId < 21 ? "home" : "away"
            );
            target.appendChild(sprite);
          }
          break;
        case 8: //casualty
          const target = this.getAvailableGridItem(
            state.playerId,
            4,
            state.playerId < 21 ? "home" : "away"
          );

          const casSprite = document.createElement("div");
          casSprite.classList.add("blood");
          casSprite.classList.add(
            `splatter${Math.floor(4 * Math.random() + 1)}`
          );

          sprite.parentNode.appendChild(casSprite);

          target.appendChild(sprite);
          break;
        case 25: //regeneration
      }
    }

    handleTouchdown() {
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
  }
</script>

<HomeDugout />
<Pitch />
<AwayDugout />

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
