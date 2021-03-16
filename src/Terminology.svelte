<p class="lead">Terminology</p>
<dl>
  <dt><a id="value-def">Value</a></dt>
  <dd>
    An abstraction of how much getting that roll result likely helped your game.
    Moving the ball from one end of the pitch to the other (scoring a touchdown)
    is worth 1 point, weighted to your opponents end of the pitch (so moving the
    last square to get the touchdown has higher value than moving to one square
    away from the endzone). Knocking down a player (or stunning or removing that
    player) has a value that is roughly (emperically) based on how much value a
    player is expected to provide per action.

    <a href="#value-details">More details</a> below.
  </dd>
  <dt><a id="expected-value-def">Expected Value</a></dt>
  <dd>
    The average <a href="#value-def">Value</a> over all of the possible results of
    a roll.
  </dd>
  <dt><a id="cum-value-def">Cumulative Value</a></dt>
  <dd>
    The sum of <a href="#value-def">Value</a> across all rolls in the game.
  </dd>
  <dt><a id="cum-exp-value-def">Cumulative Expected Value</a></dt>
  <dd>
    The sum of <a href="#expected-value-def">Expected Value</a> across all rolls
    in the game.
  </dd>
  <dt><a id="net-value-def">Net Value</a></dt>
  <dd>
    The difference between the <a href="#value-def">Value</a> and the
    <a href="#expected-value-def">Expected Value</a> on a specific roll.
  </dd>
  <dt><a id="cum-net-value-def">Cumulative Net Value</a></dt>
  <dd>
    The sum of <a href="#net-value-def">Net Value</a> for all the rolls taken so
    far by a team.
  </dd>
</dl>
<p class="lead"><a id="value-details">Value Details</a></p>
<p>The values attributed to the rolls are based on the following standards:</p>
<ul>
  <li>
    Each teams player positions/activations is worth 1 per turn. This means that
    a block that results in a knockdown for your opponent will give you
    fractional points based on that player's TV value compared to the whole team
    value, while getting your own player stunned would cost you that same
    fraction, but times multiple turns.
  </li>
  <li>
    Future player value is time-discounted to account for the uncertainty of
    future events. So, if first turn of knockdown is worth 0.1, then the second
    turn of a stun would be worth 0.09, the third 0.081, and so on.
  </li>
  <li>
    Player value is scaled based on vicinity to the ball and goal line. So,
    having the ball doubles the value of your player, and marking the ball
    multiplies the value by 1.5. Being within movement distance of the endzone
    also multiplies player value, by larger amounts as the player is closer to
    the endzone.
  </li>
  <li>
    Ball-possession and fields position account for another pool of points. We
    award 1 point of value for each touchdown, half at the time of the
    touchdown, and the rest accounted for by moving the ball across pitch. The
    ball-movement points are weighted so that moving one square close to the
    goal line is worth significantly more than moving one square near the LOS.
  </li>
</ul>
