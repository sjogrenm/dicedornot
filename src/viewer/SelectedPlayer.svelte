<script>
  export let player;
  let name, color;
  let colorRE = /\[colour='([0-9a-f]{8})'\]/i;
  $: {
    name = player.Data.Name.replace(colorRE, '');
    let colorMatch = player.Data.Name.match(colorRE);
    color = colorMatch ? `#${colorMatch[1].slice(2, 8)}` : 'var(--gray-0)';
  }
</script>

{#if player}
  <div class="player-card">
    <svg width="100%" height="100%" viewBox="0 0 207 317" preserveAspectRatio="xMinYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <image href="/images/card.png" height="100%"/>
      <text class="name" x="18" y="36" style={`fill: ${color}`}>{name}</text>
      <text class="stat mv" x="18" y="75"  text-anchor="middle">MV</text>
      <text class="stat mv value" x="18" y="106"  text-anchor="middle">{player.Data.Ma}</text>
      <text class="stat st" x="18" y="140" text-anchor="middle">ST</text>
      <text class="stat st value" x="18" y="174" text-anchor="middle">{player.Data.St}</text>
      <text class="stat ag" x="18" y="204" text-anchor="middle">AG</text>
      <text class="stat ag value" x="18" y="238" text-anchor="middle">{player.Data.Ag}</text>
      <text class="stat av" x="18" y="273" text-anchor="middle">AV</text>
      <text class="stat av value" x="18" y="306" text-anchor="middle">{player.Data.Av}</text>
    </svg>
  </div>
  <!-- <FixedRatio width={207} height={317}>
    <div class="player-data">
      <div class="name" />
      <div class="stats">
        <div class="grid_stat mv"><ScaledText width={14} height={10}>MV</ScaledText></div>
        <div class="grid_stat value mv">{player.Data.Ma}</div>
        <div class="grid_stat st">ST</div>
        <div class="grid_stat value st">{player.Data.St}</div>
        <div class="grid_stat ag">AG</div>
        <div class="grid_stat value ag">{player.Data.Ag}</div>
        <div class="grid_stat av">AV</div>
        <div class="grid_stat value av">{player.Data.Av}</div>
      </div>
      <div id="selectedPlayerCAS" />
      <div id="skills" />
    </div>
  </FixedRatio> -->
{/if}

<style> 
  .player-card {
    font-family: "Nuffle";
  }
  .stat.value {
    fill: var(--gray-0);
    font-size: 30px;
  }
  .stat {
    fill: var(--gray-2);
    font-size: 16px;
  }
  .name {
    font-size: 18px;
  }
  .stats {
    top: 17%;
    height: 83%;
    width: 18%;
    position: relative;
  }
  .player-data {
    background-image: url("/images/card.png");
    background-repeat: no-repeat;
    background-size: 100% 100%;
    width: 100%;
    height: 100%;
    position: relative;
  }
  .skill {
    background: url("/images/skills.png") no-repeat;
    width: 64px;
    height: 64px;
    display: inline-block;
    background-position-x: 4px;
  }
  .General {
    background-position-x: -4px;
    background-position-y: -4px;
  }
  .Agility {
    background-position-x: -84px;
    background-position-y: -4px;
  }
  .IncreaseMovement {
    background-position-x: -164px;
    background-position-y: -4px;
  }
  .Extraordinary {
    background-position-x: -244px;
    background-position-y: -4px;
  }
  .Passing {
    background-position-x: -324px;
    background-position-y: -4px;
  }
  .Mutation {
    background-position-x: -404px;
    background-position-y: -4px;
  }
  .Strength {
    background-position-x: -484px;
    background-position-y: -4px;
  }
  .Animosity {
    background-position-x: -4px;
    background-position-y: -84px;
  }
  .BallChain {
    background-position-x: -76px;
    background-position-y: -84px;
  }
  .BigHand {
    background-position-x: -148px;
    background-position-y: -84px;
  }
  .Block {
    background-position-x: -220px;
    background-position-y: -84px;
  }
  .BloodLust {
    background-position-x: -292px;
    background-position-y: -84px;
  }
  .Bombardier {
    background-position-x: -364px;
    background-position-y: -84px;
  }
  .BoneHead {
    background-position-x: -436px;
    background-position-y: -84px;
  }
  .BreakTackle {
    background-position-x: -508px;
    background-position-y: -84px;
  }
  .CardSet {
    background-position-x: -4px;
    background-position-y: -156px;
  }
  .CardSet2 {
    background-position-x: -76px;
    background-position-y: -156px;
  }
  .Casualty {
    background-position-x: -148px;
    background-position-y: -156px;
  }
  .Catch {
    background-position-x: -220px;
    background-position-y: -156px;
  }
  .Chainsaw {
    background-position-x: -292px;
    background-position-y: -156px;
  }
  .Claw {
    background-position-x: -364px;
    background-position-y: -156px;
  }
  .CoachSkill {
    background-position-x: -436px;
    background-position-y: -156px;
  }
  .CoachSkill2 {
    background-position-x: -508px;
    background-position-y: -156px;
  }
  .Dauntless {
    background-position-x: -4px;
    background-position-y: -228px;
  }
  .Dead {
    background-position-x: -76px;
    background-position-y: -228px;
  }
  .Decay {
    background-position-x: -148px;
    background-position-y: -228px;
  }
  .DirtyPlayer {
    background-position-x: -220px;
    background-position-y: -228px;
  }
  .DisturbingPresence {
    background-position-x: -292px;
    background-position-y: -228px;
  }
  .DivingCatch {
    background-position-x: -364px;
    background-position-y: -228px;
  }
  .DivingTackle {
    background-position-x: -436px;
    background-position-y: -228px;
  }
  .DivingTackle2 {
    background-position-x: -508px;
    background-position-y: -228px;
  }
  .Dodge {
    background-position-x: -4px;
    background-position-y: -300px;
  }
  .Dots {
    background-position-x: -76px;
    background-position-y: -300px;
  }
  .DumpOff {
    background-position-x: -148px;
    background-position-y: -300px;
  }
  .ExtraArms {
    background-position-x: -220px;
    background-position-y: -300px;
  }
  .FanFavourite {
    background-position-x: -292px;
    background-position-y: -300px;
  }
  .Fend {
    background-position-x: -364px;
    background-position-y: -300px;
  }
  .FoulAppearance {
    background-position-x: -436px;
    background-position-y: -300px;
  }
  .Frenzy {
    background-position-x: -508px;
    background-position-y: -300px;
  }
  .Grab {
    background-position-x: -4px;
    background-position-y: -372px;
  }
  .Guard {
    background-position-x: -76px;
    background-position-y: -372px;
  }
  .HailMaryPass {
    background-position-x: -148px;
    background-position-y: -372px;
  }
  .Horns {
    background-position-x: -220px;
    background-position-y: -372px;
  }
  .HypnoticGaze {
    background-position-x: -292px;
    background-position-y: -372px;
  }
  .IncreaseArmour {
    background-position-x: -364px;
    background-position-y: -372px;
  }
  .IncreaseStrength {
    background-position-x: -436px;
    background-position-y: -372px;
  }
  .Juggernaut {
    background-position-x: -508px;
    background-position-y: -372px;
  }
  .JumpUp {
    background-position-x: -4px;
    background-position-y: -444px;
  }
  .Kick {
    background-position-x: -76px;
    background-position-y: -444px;
  }
  .KickOffReturn {
    background-position-x: -148px;
    background-position-y: -444px;
  }
  .Leader {
    background-position-x: -220px;
    background-position-y: -444px;
  }
  .Leader2 {
    background-position-x: -292px;
    background-position-y: -444px;
  }
  .Leap {
    background-position-x: -364px;
    background-position-y: -444px;
  }
  .Loner {
    background-position-x: -436px;
    background-position-y: -444px;
  }
  .MightyBlow {
    background-position-x: -508px;
    background-position-y: -444px;
  }
  .IncreaseAgility {
    background-position-x: -4px;
    background-position-y: -516px;
  }
  .Accurate {
    background-position-x: -4px;
    background-position-y: -588px;
  }
  .MVPCondition {
    background-position-x: -4px;
    background-position-y: -660px;
  }
  .MVPCondition2 {
    background-position-x: -4px;
    background-position-y: -732px;
  }
  .NegativeLegacySkills {
    background-position-x: -4px;
    background-position-y: -804px;
  }
  .NegativeRookieSkills {
    background-position-x: -4px;
    background-position-y: -876px;
  }
  .NervesOfSteel {
    background-position-x: -4px;
    background-position-y: -948px;
  }
  .NigglingInjury {
    background-position-x: -76px;
    background-position-y: -516px;
  }
  .NoHands {
    background-position-x: -148px;
    background-position-y: -516px;
  }
  .NoHands2 {
    background-position-x: -220px;
    background-position-y: -516px;
  }
  .NurglesRot {
    background-position-x: -292px;
    background-position-y: -516px;
  }
  .Pass {
    background-position-x: -364px;
    background-position-y: -516px;
  }
  .PassBlock {
    background-position-x: -436px;
    background-position-y: -516px;
  }
  .MultipleBlock {
    background-position-x: -508px;
    background-position-y: -516px;
  }
  .PilingOn {
    background-position-x: -76px;
    background-position-y: -588px;
  }
  .PositiveLegacySkills {
    background-position-x: -76px;
    background-position-y: -660px;
  }
  .PositiveRookieSkills {
    background-position-x: -76px;
    background-position-y: -732px;
  }
  .PrehensileTail {
    background-position-x: -76px;
    background-position-y: -804px;
  }
  .Pro {
    background-position-x: -76px;
    background-position-y: -876px;
  }
  .ReallyStupid {
    background-position-x: -76px;
    background-position-y: -948px;
  }
  .Regeneration {
    background-position-x: -148px;
    background-position-y: -588px;
  }
  .RightStuff {
    background-position-x: -220px;
    background-position-y: -588px;
  }
  .Rookie {
    background-position-x: -292px;
    background-position-y: -588px;
  }
  .SafeThrow {
    background-position-x: -364px;
    background-position-y: -588px;
  }
  .SecretWeapon {
    background-position-x: -436px;
    background-position-y: -588px;
  }
  .Shadowing {
    background-position-x: -508px;
    background-position-y: -588px;
  }
  .SideStep {
    background-position-x: -148px;
    background-position-y: -660px;
  }
  .SkillsHover {
    background-position-x: -148px;
    background-position-y: -732px;
  }
  .SkillsSelected {
    background-position-x: -148px;
    background-position-y: -804px;
  }
  .SneakyGit {
    background-position-x: -148px;
    background-position-y: -876px;
  }
  .Sponsor {
    background-position-x: -148px;
    background-position-y: -948px;
  }
  .Sponsor2 {
    background-position-x: -220px;
    background-position-y: -660px;
  }
  .Sprint {
    background-position-x: -292px;
    background-position-y: -660px;
  }
  .Stab {
    background-position-x: -364px;
    background-position-y: -660px;
  }
  .StaffMember {
    background-position-x: -436px;
    background-position-y: -660px;
  }
  .StaffMember2 {
    background-position-x: -508px;
    background-position-y: -660px;
  }
  .Stakes {
    background-position-x: -220px;
    background-position-y: -732px;
  }
  .StandFirm {
    background-position-x: -220px;
    background-position-y: -804px;
  }
  .AlwaysHungry {
    background-position-x: -220px;
    background-position-y: -876px;
  }
  .StripBall {
    background-position-x: -220px;
    background-position-y: -948px;
  }
  .StrongArm {
    background-position-x: -292px;
    background-position-y: -732px;
  }
  .Structure {
    background-position-x: -364px;
    background-position-y: -732px;
  }
  .Structure2 {
    background-position-x: -436px;
    background-position-y: -732px;
  }
  .Stunty {
    background-position-x: -508px;
    background-position-y: -732px;
  }
  .SureFeet {
    background-position-x: -292px;
    background-position-y: -804px;
  }
  .SureHands {
    background-position-x: -292px;
    background-position-y: -876px;
  }
  .Tackle {
    background-position-x: -292px;
    background-position-y: -948px;
  }
  .TakeRoot {
    background-position-x: -364px;
    background-position-y: -804px;
  }
  .Tentacles {
    background-position-x: -436px;
    background-position-y: -804px;
  }
  .ThickSkull {
    background-position-x: -508px;
    background-position-y: -804px;
  }
  .ThrowTeamMate {
    background-position-x: -364px;
    background-position-y: -876px;
  }
  .Titchy {
    background-position-x: -364px;
    background-position-y: -948px;
  }
  .TwoHeads {
    background-position-x: -436px;
    background-position-y: -876px;
  }
  .VeryLongLegs {
    background-position-x: -508px;
    background-position-y: -876px;
  }
  .WildAnimal {
    background-position-x: -436px;
    background-position-y: -948px;
  }
  .Wrestle {
    background-position-x: -508px;
    background-position-y: -948px;
  }
</style>
