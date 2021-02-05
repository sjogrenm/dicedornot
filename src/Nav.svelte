<script>
  import ReplayLoader from "./ReplayLoader.svelte";
  import {replay} from "./stores.js";
  export let loading, error
</script>

<nav class="navbar-dark bg-primary sidenav">
  <a class="navbar-brand" href="/#"><img class="logo" src="/dicedornot-logo.svg" alt=""/>Diced or Not</a>
  <ul class="navbar-nav">
    {#if $replay}
    <li class="dropdown"><a class="nav-link" href="#summary">Replay</a></li>
    <li class="nav-item">
      <a class="nav-link" href="#explanation">Explain?</a>
    </li>
    {/if}
    <li class="nav-item"><a class="nav-link" href="#contact">Contact</a></li>
  </ul>
</nav>

<style>
  .logo {
    width: 3em;
    height: 3em;
  }
  /* The side navigation menu */
  .sidenav {
    height: 100%;
    width: 200px;
    position: fixed;
    z-index: 1;
    top: 0;
    left: 0;
    background-color: #111;
    overflow-x: hidden;
    padding-top: 20px;
    padding-left: 20px;
  }

  /* The navigation menu links */
  .sidenav li {
    padding: 8px 8px 8px 32px;
    text-decoration: none;
    font-size: 1em;
    color: #818181;
    display: block;
    transition: 0.3s;
  }

  /* When you mouse over the navigation links, change their color */
  .sidenav a:hover {
    color: #f1f1f1;
  }

  /* On smaller screens, where height is less than 450px, change the style of the sidenav (less padding and a smaller font size) */
  @media screen and (max-height: 450px) {
    .sidenav {
      padding-top: 15px;
    }
    .sidenav a {
      font-size: 18px;
    }
  }
</style>
