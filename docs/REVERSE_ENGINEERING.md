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

## Quests

```html
<div class="quest-progress-wrapper ">
  <div class="quest-widget-icon-container">
    <img
      class="quest-widget-icon"
      alt="Quest Icon"
      src="assets/ui/ItemIcon_MemoPad.png"
    />
  </div>
  <div class="quest-content">
    <div class="quest-name">
      <span
        >Defeat Shadow Enemies<span
          class="info-popup-container info-trigger-inline "
          ><span class="info-trigger-button" role="button" tabindex="0"
            >i</span
          ></span
        ></span
      >
    </div>
    <div class="quest-progress-data">
      <div class="quest-expiry">
        <img alt="Timer Icon" src="assets/ui/Icon_Timer.png" />11d
      </div>
      <div class="quest-progress-bar-wrapper">
        <div class="quest-claim-button visible">
          <div
            title=""
            class="default-image-container"
            style="transform: scale(1);"
          >
            <img
              alt="button image"
              loading="lazy"
              src="assets/ui/quest_claim2.png"
              style="width: 100%; height: 100%; object-fit: contain;"
            />
          </div>
        </div>
        <div class="quest-progress-bar hidden"></div>
      </div>
    </div>
  </div>
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
