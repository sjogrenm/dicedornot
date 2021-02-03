<style>
</style>

<div id="explanation" class="row">
  <div class="col-sm-12">
    <div>
      <h1>What am I looking at?</h1>
      <p>
        Diced or Not has imported your replay, and categorized each of the dice
        rolls how much value you got out of them, based on whether they passed
        or failed. It also computed what value you should have expected to get
        out of those rolls. Finally, it compared the value you got to the
        expected value, and add up that net value across the game. You can see
        that trend-line in the graph above.
      </p>
      <p>
        The values attributed to the rolls are based on the following standards:
      </p>
      <ul>
        <li>
          Each teams player positions/activations is worth 1 per turn. This
          means that a block that results in a knockdown for your opponent will
          give you fractional points based on that player's TV value compared to
          the whole team value, while getting your own player stunned would cost
          you that same fraction, but times multiple turns.
        </li>
        <li>
          Future player value is time-discounted to account for the uncertainty
          of future events. So, if first turn of knockdown is worth 0.1, then
          the second turn of a stun would be worth 0.09, the third 0.081, and so
          on.
        </li>
        <li>
          Player value is scaled based on vicinity to the ball and goal line.
          So, having the ball doubles the value of your player, and marking the
          ball multiplies the value by 1.5. Being within movement distance of
          the endzone also multiplies player value, by larger amounts as the
          player is closer to the endzone.
        </li>
        <li>
          Ball-possession and fields position account for another pool of
          points. Based on the expectation of a team taking 8 turns to score
          once in a drive, moving the ball all the way up the field and scoring
          a touchdown should be worth 8 points. We divide that in half: 4 points
          for actually scoring the touchdown, and 4 points for moving the ball
          up the field. The 4 field-position points are weighted more heavily
          toward the endzone, and are awarded by net-position. So, moving the
          ball one square forward gives you points equal to the value of your
          new position minus the value of your old position.
        </li>
      </ul>
      <p>
        Once your game was analyzed, Diced or Not simulated rolling those same
        sets of dice
        <span id="game-count">0</span>
        more times, and compared the net value of your game to the net value in
        the simulated games. The fainter background lines show the 99th, 90th,
        75th, 50th, 25th, 10th, and 1st percentile cumulative net-values. So, if
        your line is above the top background line, then your game was better
        than 99% of games with the same dice, and you most definitely were not
        diced. If you line was below the 3rd line from the bottom, then your
        game was worse than 3/4s of games, and you might have a slight argument
        for having been diced.
      </p>
    </div>
    <div>
      <h2>Terminology</h2>
      <dl>
        <dt id="value-def">Value</dt>
        <dd>
          An abstraction of how much getting that roll result likely helped your
          game. For example, getting a Defender Down on a Block roll would be a
          +1 value, and getting an Attacker Down on a Block roll would be a -1
          value (because it ends your turn). More details of the values assigned
          are listed in the
          <a href="#value-table">Values Table</a>.
        </dd>
        <dt id="expected-value-def">Expected Value</dt>
        <dd>
          The average
          <a href="value-def">Value</a>
          over all of the possible results of a roll.
        </dd>
        <dt>Net Value</dt>
        <dd>
          The difference between the actual value and the expected value on a
          specific roll.
        </dd>
        <dt>Cumulative Net Value</dt>
        <dd>
          The running total of Net Value for all the rolls taken so far by a
          team.
        </dd>
      </dl>
    </div>
  </div>
</div>
