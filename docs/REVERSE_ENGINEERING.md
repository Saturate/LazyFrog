# Reverse engineering notes

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
