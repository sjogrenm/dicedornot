
<div id="selectedPlayerData">
  <div id="selectedPlayerName" />
  <div>
    <div class="grid_stat">MV</div>
    <div class="grid_stat" id="selectPlayer-MV" />
    <div class="grid_stat">ST</div>
    <div class="grid_stat" id="selectPlayer-ST" />
    <div class="grid_stat">AG</div>
    <div class="grid_stat" id="selectPlayer-AG" />
    <div class="grid_stat">AV</div>
    <div class="grid_stat" id="selectPlayer-AV" />
  </div>
  <div id="selectedPlayerCAS" />
  <div id="skills" />
</div>
<style>

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
