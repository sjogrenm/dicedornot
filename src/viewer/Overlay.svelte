<script lang="ts">
  import { ACTION_TYPE, ROLL, SIDE } from "../constants.js";
  import { ensureKeyedList, ensureList, translateStringNumberList } from "../replay-utils.js";
  import { replayPreview, replay } from "../stores.js";
  import type { Cell } from "../replay/Internal.js";
  import {convertCell} from "../replay/BB2toInternal.js";
  import OverlayMove from "./OverlayMove.svelte";
  import type { Props as OverlayMoveProps } from "./OverlayMove.svelte";
  import OverlayBlock from "./OverlayBlock.svelte";
  import chroma from "chroma-js";
  import { sliceActionsTo } from "../replay-utils.js";

  import {
    team1Color,
    team1Gray,
    team0Color,
    team0Gray,
    gray,
  } from "../theme.js";
import type { BlitzResults, BlockResults, KeyedMList } from "../replay/BB2.js";

  let paths: OverlayProps[];

  const components = {
    move: OverlayMove,
    block: OverlayBlock,
  };

  type OverlayProps =
    | ({
        type: "move";
      } & OverlayMoveProps)
    | {
        type: "block";
        from: Cell;
        to: Cell;
        rolls: any;
        team: SIDE;
        pushTo?: Cell;
        follow?: boolean;
      };

  function cellEqual(a: Cell, b: Cell): boolean {
    return a.x == b.x && a.y == b.y;
  }

  function colors(team: SIDE, index: number, maxIndex: number) {
    let colorScale, textScale, oppColorScale, oppTextScale;
    if (team == SIDE.home) {
      colorScale = team0Color;
      textScale = team0Gray;
      oppColorScale = team1Color;
      oppTextScale = team1Color;
    } else {
      colorScale = team1Color;
      textScale = team1Gray;
      oppColorScale = team0Color;
      oppTextScale = team0Color;
    }
    let color = colorScale((maxIndex - index) / maxIndex);
    let lightText = textScale(0).brighten();
    let darkText = textScale(1).darken();
    let textColor;
    if (chroma.contrast(color, lightText) > chroma.contrast(color, darkText)) {
      textColor = lightText;
    } else {
      textColor = darkText;
    }
    let oppColor = oppColorScale((maxIndex - index) / maxIndex);
    let oppLightText = oppTextScale(0).brighten();
    let oppDarkText = oppTextScale(1).darken();
    let oppTextColor;
    if (
      chroma.contrast(oppColor, oppLightText) >
      chroma.contrast(color, oppDarkText)
    ) {
      textColor = oppLightText;
    } else {
      textColor = oppDarkText;
    }
    return { color, textColor, oppColor, oppTextColor };
  }

  $: {
    paths = [];
    for (const { action } of sliceActionsTo(
      $replay!.fullReplay,
      $replayPreview!.start,
      $replayPreview!.end
    )) {
      if (!("ActionType" in action)) {
        let from = convertCell(action.Order.CellFrom);
        let to = convertCell(action.Order.CellTo.Cell);
        let rolls = ensureKeyedList('BoardActionResult', action.Results)
          .filter((result) => 'Requirement' in result)
          .map((result) => {
            // @ts-ignore
            let requirement = result.Requirement;
            let modifier =
              ensureKeyedList('DiceModifier', result.ListModifiers)
                .map((modifier) => modifier.Value || 0)
                .reduce((a, b) => a + b, 0) || 0;
            return `${requirement - modifier}+`;
          })
          .join(" ");
        let team = action.PlayerId && action.PlayerId < 30 ? SIDE.home : SIDE.away;
        let lastPath = paths[paths.length - 1];
        if (lastPath && lastPath.type === "move") {
          let lastCell = lastPath.path[lastPath.path.length - 1];
          if (cellEqual(lastCell, from)) {
            lastPath.path.push(to);
            if (rolls) {
              lastPath.rolls.push({ from, to, rolls });
            }
            break;
          }
        }
        paths.push({
          type: "move",
          path: [from, to],
          rolls: rolls ? [{ from, to, rolls }] : [],
          team,
        });
      } else {
        switch (action.ActionType) {
          case ACTION_TYPE.Blitz:
          case ACTION_TYPE.Block:
            {
              let results: (BlockResults | BlitzResults)[] = ensureKeyedList(
                'BoardActionResult',
                action.Results as KeyedMList<'BoardActionResult', BlockResults | BlitzResults>
              );
              for (const result of results) {
                let last = paths[paths.length - 1];
                if (
                  'RollType' in result &&
                  result.RollType == ROLL.Block &&
                  result.IsOrderCompleted != 1
                ) {
                  let from = convertCell(action.Order.CellFrom);
                  let to = convertCell(action.Order.CellTo.Cell);
                  let team = action.PlayerId || 0 < 30 ? SIDE.home : SIDE.away;
                  let requirement = result.Requirement || 0;
                  let modifier =
                    ensureKeyedList('DiceModifier', result.ListModifiers)
                      .map((modifier) => modifier.Value || 0)
                      .reduce((a, b) => a + b, 0) || 0;
                  let dieCount =
                    translateStringNumberList(result.CoachChoices.ListDices)
                      .length / 2;
                  let roll;
                  if (requirement < 0) {
                    if (dieCount == 2) {
                      roll = "\u00BDD";
                    } else if (dieCount == 3) {
                      roll = "\u2153D";
                    }
                  } else {
                    roll = `${dieCount}D`;
                  }
                  if (
                    last &&
                    last.type === "block" &&
                    last.from.x == from.x &&
                    last.from.y == from.y &&
                    last.to.x == to.x &&
                    last.to.y == to.y
                  ) {
                    last.rolls += ` ${roll}`;
                  } else {
                    paths.push({
                      type: "block",
                      from,
                      to,
                      rolls: roll,
                      team,
                    });
                  }
                } else if (
                  'RollType' in result &&
                  result.RollType == ROLL.Push &&
                  result.IsOrderCompleted == 1 &&
                  last.type === "block"
                ) {
                  let pushOptions = ensureKeyedList('Cell', result.CoachChoices.ListCells);
                  if (pushOptions) {
                    last.pushTo = convertCell(pushOptions[0]);
                  }
                } else if (
                  'RollType' in result && 
                  result.RollType == ROLL.FollowUp &&
                  result.IsOrderCompleted == 1 &&
                  last.type === "block"
                ) {
                  let followOptions = ensureKeyedList('Cell', result.CoachChoices.ListCells);
                  if (followOptions) {
                    let followTo = convertCell(followOptions[0]);
                    last.follow =
                      followTo.x != last.from.x || followTo.y != last.from.y;
                  }
                }
              }
            }
            break;
        }
      }
    }
  }
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="-0.5 -0.5 26 15"
  class="overlay svelte-7djegz"
>
  <defs>
    <filter
      id="chalk"
      height="2"
      width="1.6"
      color-interpolation-filters="sRGB"
      y="-0.5"
      x="-0.3"
    >
      <feTurbulence
        baseFrequency="50"
        seed="115"
        result="result1"
        numOctaves="1"
        type="turbulence"
      />
      <feOffset result="result2" dx="-1" dy="-1" />
      <feDisplacementMap
        scale="0.1"
        yChannelSelector="G"
        in2="result1"
        xChannelSelector="R"
        in="SourceGraphic"
      />
      <feGaussianBlur stdDeviation="0.005" />
    </filter>
  </defs>
  {#each paths as path, index}
    <svelte:component
      this={components[path.type]}
      {...path}
      {...colors(path.team, index, paths.length)}
      index={index + 1}
    />
  {/each}
</svg>
