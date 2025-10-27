# Reverse engineering notes

## The Inn

We can't play the Inn, we can detect it due to this markup:

```html
<div class="battle-log-area">
  <div class="battle-log-message">
    <div class="battle-log-message-inner">Welcome to the Inn!</div>
  </div>
  <div class="battle-log-message">
    <div class="battle-log-message-inner">
      A place to rest, recover, manage your inventory, and level up.
    </div>
  </div>
  <div></div>
</div>
```

## Game

After winning a game the play next button will be a good indication of the game being finished.

```html
<div class="mission-end-footer">
  <div class="end-mission-button">
    <img src="assets/ui/button_playnext.png" />
  </div>
</div>
```

Before that there's a "Continue" button

```html
<div class="button-container">
  <div class="continue-button-container">
    <button class="continue-button">
      <img alt="Continue" src="assets/ui/button_continue.png" />
    </button>
  </div>
</div>
```
