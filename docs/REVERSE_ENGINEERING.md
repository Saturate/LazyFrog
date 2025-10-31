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

## Deleted post

```html
<div slot="post-removed-banner">
	<span
		class="flex flex-row col-start-1 col-end-4 items-center text-16 m-md xs:mx-0 px-md py-xs min-h-[56px] box-border rounded-1 border-sm border-neutral-border-weak border-solid text-secondary-weak "
	>
		<svg
			rpl=""
			class="flex flex-none text-20 text-alert-negative"
			fill="currentColor"
			height="20"
			icon-name="delete"
			viewBox="0 0 20 20"
			width="20"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M15.2 15.7c0 .83-.67 1.5-1.5 1.5H6.3c-.83 0-1.5-.67-1.5-1.5V7.6H3v8.1C3 17.52 4.48 19 6.3 19h7.4c1.82 0 3.3-1.48 3.3-3.3V7.6h-1.8v8.1zM17.5 5.8c.5 0 .9-.4.9-.9S18 4 17.5 4h-3.63c-.15-1.68-1.55-3-3.27-3H9.4C7.68 1 6.28 2.32 6.13 4H2.5c-.5 0-.9.4-.9.9s.4.9.9.9h15zM7.93 4c.14-.68.75-1.2 1.47-1.2h1.2c.72 0 1.33.52 1.47 1.2H7.93z"
			></path>
		</svg>
		<span class="flex flex-auto flex-col justify-center text-14 pl-sm">
			Sorry, this post was deleted by the person who originally posted it.
		</span>
	</span>
</div>
```

## Quests

```html
<div class="quest-progress-wrapper ">
	<div class="quest-widget-icon-container">
		<img class="quest-widget-icon" alt="Quest Icon" src="assets/ui/ItemIcon_MemoPad.png" />
	</div>
	<div class="quest-content">
		<div class="quest-name">
			<span
				>Defeat Shadow Enemies<span class="info-popup-container info-trigger-inline "
					><span class="info-trigger-button" role="button" tabindex="0">i</span></span
				></span
			>
		</div>
		<div class="quest-progress-data">
			<div class="quest-expiry"><img alt="Timer Icon" src="assets/ui/Icon_Timer.png" />11d</div>
			<div class="quest-progress-bar-wrapper">
				<div class="quest-claim-button visible">
					<div title="" class="default-image-container" style="transform: scale(1);">
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

## Daily Mission Overlay

```html
<div class="modal shown">
	<div class="modal-header">
		<div class="login-menu-header">
			<img src="assets/ui/ItemIcon_Calendar.png" style="width: 42px; object-fit: contain;" />
			<div class="login-day-menu-header-styled-text">DAILY TREATS</div>
		</div>
	</div>
	<div class="modal-content">
		<div class="login-menu-content">
			<div class="login-container">
				<div class="row">
					<div class="login-day  ">
						<div class="login-day-styled-text-alt">TODAY</div>
						<div class="background-overlay greenbackground "></div>
						<div class="image-container">
							<img
								src="assets/ui/login_rewards/Claim_Effects.png"
								style="width: 80%; object-fit: contain; z-index: 2; position: absolute;"
							/><img
								src="assets/ui/login_rewards/ItemIcon_Money_Coin1.png"
								style="width: 60%; object-fit: contain; z-index: 3; position: absolute; top: 10px;"
							/>
						</div>
						<div class="login-day-styled-text imagetop text-align-right">40</div>
					</div>
					<div class="login-day  ">
						<div class="login-day-styled-text">DAY 2</div>
						<div class="background-overlay  "></div>
						<div class="image-container">
							<img
								src="assets/ui/login_rewards/ItemIcon_Money_Coin2.png"
								style="width: 60%; object-fit: contain; z-index: 3; position: absolute; top: 10px;"
							/>
						</div>
						<div class="login-day-styled-text imagetop text-align-right">60</div>
					</div>
					<div class="login-day  ">
						<div class="login-day-styled-text">DAY 3</div>
						<div class="background-overlay  "></div>
						<div class="image-container">
							<img
								src="assets/ui/login_rewards/ItemIcon_Money_Coin3.png"
								style="width: 60%; object-fit: contain; z-index: 3; position: absolute; top: 10px;"
							/>
						</div>
						<div class="login-day-styled-text imagetop text-align-right">80</div>
					</div>
				</div>
				<div class="row">
					<div class="login-day  ">
						<div class="login-day-styled-text">DAY 4</div>
						<div class="background-overlay  "></div>
						<div class="image-container">
							<img
								src="assets/ui/login_rewards/ItemIcon_Money_Coin4.png"
								style="width: 60%; object-fit: contain; z-index: 3; position: absolute; top: 10px;"
							/>
						</div>
						<div class="login-day-styled-text imagetop text-align-right">100</div>
					</div>
					<div class="login-day  ">
						<div class="login-day-styled-text">DAY 5</div>
						<div class="background-overlay  "></div>
						<div class="image-container">
							<img
								src="assets/ui/login_rewards/ItemIcon_Money_Coin5.png"
								style="width: 60%; object-fit: contain; z-index: 3; position: absolute; top: 10px;"
							/>
						</div>
						<div class="login-day-styled-text imagetop text-align-right">150</div>
					</div>
					<div class="login-day  ">
						<div class="login-day-styled-text">DAY 6</div>
						<div class="background-overlay  "></div>
						<div class="image-container">
							<img
								src="assets/ui/login_rewards/ItemIcon_Money_Coin6.png"
								style="width: 60%; object-fit: contain; z-index: 3; position: absolute; top: 10px;"
							/>
						</div>
						<div class="login-day-styled-text imagetop text-align-right">225</div>
					</div>
				</div>
				<div class="row">
					<div class="login-day wide ">
						<div class="login-day-styled-text">DAY 7</div>
						<div class="background-overlaywide  "></div>
						<div class="image-container">
							<img
								src="assets/ui/login_rewards/Leaf_Left.png"
								style="width: 20%; object-fit: contain; z-index: 2; position: absolute; left: 15%; top: 8px;"
							/><img
								src="assets/ui/login_rewards/Leaf_Right.png"
								style="width: 20%; object-fit: contain; z-index: 2; position: absolute; right: 15%; top: 8px;"
							/><img
								src="assets/ui/login_rewards/ItemIcon_Money_Coin7.png"
								style="width: 25%; object-fit: contain; z-index: 3; position: absolute; top: 10px;"
							/>
						</div>
						<div class="login-day-styled-text imagetopwide text-align-right">400</div>
					</div>
				</div>
				<div class="rowflex center">
					<div title="" class="default-image-container">
						<img
							alt="button image"
							loading="lazy"
							src="assets/ui/Button_Claim.png"
							style="width: 100%; height: 100%; object-fit: contain;"
						/>
					</div>
				</div>
				<div class="rowflex center"></div>
			</div>
		</div>
	</div>
</div>
```
