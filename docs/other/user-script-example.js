// ==UserScript==
// @name         SwordAndSupper Conditional Autoplay
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  Heavily modified script from u/Thats_a_movie (github.com/asufyani). Conditional check at start if the map is going to be crossposted to a different subreddit. If not, the script fires and automatically clicks through the map.
// @author       u/Aizbaer
// @match        https://*.devvit.net/index.html*
// @require https://code.jquery.com/jquery-3.6.0.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @require https://git.io/waitForKeyElements.js
// @grant unsafeWindow
// @grant        GM_addStyle
// @downloadURL  https://www.reddit.com/r/SwordAndSupper/comments/1n0iat6/tampermonkey_scripts/
// ==/UserScript==

(function () {
    'use strict';

    // Funktion zum Erstellen der Ja/Nein Buttons
    function createConfirmDialog() {
        // Overlay für den Dialog erstellen
        const overlay = document.createElement('div');
        overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: Arial, sans-serif;
    `;

        // Dialog-Box erstellen
        const dialog = document.createElement('div');
        dialog.style.cssText = `
      background: #1a1a2e;
      color: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
      text-align: center;
      min-width: 400px;
      border: 2px solid #16213e;
    `;

        // Titel
        const title = document.createElement('h2');
        title.textContent = 'Supper Autoplay Script';
        title.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 22px;
      color: #e94560;
    `;

        // Frage-Text
        const question = document.createElement('p');
        question.textContent = 'Start Autoplay script?';
        question.style.cssText = `
      margin: 0 0 25px 0;
      font-size: 16px;
      color: #f5f5f5;
      line-height: 1.4;
    `;

        // Warnung
        const warning = document.createElement('p');
        warning.textContent = 'The script will automatically click the first button on each screen and open a new map after finishing.';
        warning.style.cssText = `
      margin: 0 0 25px 0;
      font-size: 14px;
      color: #ffa500;
      font-style: italic;
    `;

        // Button-Container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
      display: flex;
      gap: 20px;
      justify-content: center;
    `;

        // Ja-Button
        const yesButton = document.createElement('button');
        yesButton.textContent = 'Start that map!';
        yesButton.style.cssText = `
      background: linear-gradient(135deg, #e94560, #f27121);
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      transition: all 0.3s ease;
      box-shadow: 0 2px 10px rgba(233, 69, 96, 0.3);
    `;
        yesButton.addEventListener('mouseover', () => {
            yesButton.style.transform = 'translateY(-2px)';
            yesButton.style.boxShadow = '0 4px 20px rgba(233, 69, 96, 0.4)';
        });
        yesButton.addEventListener('mouseout', () => {
            yesButton.style.transform = 'translateY(0)';
            yesButton.style.boxShadow = '0 2px 10px rgba(233, 69, 96, 0.3)';
        });

        // Nein-Button
        const noButton = document.createElement('button');
        noButton.textContent = 'Wait, I have to crosspost this first';
        noButton.style.cssText = `
      background: linear-gradient(135deg, #6c757d, #495057);
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      transition: all 0.3s ease;
      box-shadow: 0 2px 10px rgba(108, 117, 125, 0.3);
    `;
        noButton.addEventListener('mouseover', () => {
            noButton.style.transform = 'translateY(-2px)';
            noButton.style.boxShadow = '0 4px 20px rgba(108, 117, 125, 0.4)';
        });
        noButton.addEventListener('mouseout', () => {
            noButton.style.transform = 'translateY(0)';
            noButton.style.boxShadow = '0 2px 10px rgba(108, 117, 125, 0.3)';
        });

        // Promise für die Benutzerantwort
        return new Promise((resolve) => {
            yesButton.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(true);
            });

            noButton.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(false);
            });

            // ESC-Taste zum Abbrechen
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleKeydown);
                    document.body.removeChild(overlay);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleKeydown);

            // Dialog zusammenbauen
            buttonContainer.appendChild(yesButton);
            buttonContainer.appendChild(noButton);
            dialog.appendChild(title);
            dialog.appendChild(question);
            dialog.appendChild(warning);
            dialog.appendChild(buttonContainer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
        });
    }

    // Das ursprüngliche Script (wird nur bei "Ja" ausgeführt)
    function executeAutoplayScript() {
        const sleep = (milliseconds) =>
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);

        function clickInventory() {
            $(".navi-bar").find(".image-icon").last().click();
            setTimeout(goToMapTab, 500);
        }

        function goToMapTab() {
            $(".nav").find(".nav-item")[2].click();
            setTimeout(clickFirstMap, 500);
        }

        function clickFirstMap() {
            $(".equipment-bag").find(".equipment-slot").first().click();
            setTimeout(useMap, 500);
        }

        function useMap() {
            $(".item-modal-actions")
                .find(".actions-button-row")
                .find("button")
                .last()
                .click();
            setTimeout(autoCompleteMap, 500);
        }

        function autoCompleteMap() {
            $(".autocomplete-button").click();
            setTimeout(clickSubmit, 500);
        }

        function clickSubmit() {
            $(".mission-create-submit-button").click();
            setTimeout(pickFood, 500);
        }

        function pickFood() {
            $(".food-choice").first().click();
            setTimeout(nameFood, 500);
        }

        function nameFood() {
            $(".autocomplete-button").click();
            setTimeout(clickSubmitAgain, 500);
        }

        function clickSubmitAgain() {
            $(".mission-create-submit-button").click();
            setTimeout(nameMission, 500);
        }

        function nameMission() {
            const spans = $(".mission-create-summary").eq(1).find("span");
            let stars = 0;
            spans.each((idx, span) => {
                if (
                    $(span).text() === "★" &&
                    $(span).css("color") == "rgb(255, 215, 0)"
                ) {
                    stars++;
                }
            });
            const levelString = $(".mission-create-summary")
                .eq(2)
                .find(".summary-text")
                .text();
            const levels = levelString.replace("Rec. Level: ", "").replace(" ~ ", "-");
            const input = $("input").first();
            const difficulty = stars ? stars + "★" : "BOSS RUSH";
            const map = $(".mission-create-summary").eq(0).find(".summary-text").text();
            const mapname = map.replace("Target: ", "");
            const food = $(".mission-create-summary").eq(3).find(".summary-text").text();
            const foodname = food.replace("Food: ", "");
            const newTitle = `${levels} | ${difficulty} | ${mapname}`;

            // Debug-Ausgaben für Tampermonkey
            console.log("[Tampermonkey] Generierter Titel:", newTitle);
            console.log("[Tampermonkey] Input Element:", input[0]);

            const inputElement = input[0];

            // Fokus setzen
            inputElement.focus();

            // Alten Wert komplett löschen
            inputElement.select();
            document.execCommand('delete');

            // React-Wert setzen
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value"
            ).set;

            nativeInputValueSetter.call(inputElement, newTitle);

            // Alle möglichen Events feuern
            ['input', 'change', 'keyup', 'blur'].forEach(eventType => {
                const event = new Event(eventType, { bubbles: true });
                inputElement.dispatchEvent(event);
            });

            console.log("[Tampermonkey] Wert nach Änderung:", inputElement.value);

            // NEUE ABFRAGE: Soll Mission erstellt werden?
            const shouldCreateMission = confirm(`Neue Mission erstellen?\n\nTitel: ${newTitle}\nMap: ${mapname}\nSchwierigkeit: ${difficulty}\nLevel: ${levels}`);

            if (shouldCreateMission) {
                // Kurz warten, dann submitten
                setTimeout(() => {
                    console.log("[Tampermonkey] Mission wird erstellt - Wert:", inputElement.value);
                    $(".mission-create-submit-button").click();
                }, 300);
            } else {
                console.log("[Tampermonkey] Mission-Erstellung abgebrochen");
                // Optional: Script komplett stoppen
                // clearInterval(intervalId); // Falls du das Script komplett beenden willst
            }
        }

        function myLoopFunction() {
            // Your code to be executed in each iteration of the loop
            //const root_wrap = $('devvit-blocks-web-view')[0];
            //const shadow_root = root_wrap.shadowRoot();

            const myCustomEvent = new CustomEvent("missionComplete", {
                detail: { data: "some value" },
            });

            const end = $(".overlay-screen.mission-end-screen");
            if (end.length) {
                clearInterval(intervalId);
                $(".continue-button").click();
                $(".dismiss-button").click();
                setTimeout(clickInventory, 500);

                //$('.navi-bar').lastChild.click();
                // $('.nav').find('.nav-item')[2].click();

                // setTimeout(function () {$('.end-mission-button').last().click()}, 1000);
                //setTimeout(function () {$('.mission-link').first().click()}, 3000);
            }
            const skill_button = $(".skill-button");
            if (skill_button.length) {
                skill_button.click();
            }

            const skip_button = $(".skip-button");
            if (skip_button.length) {
                skip_button.click();
            }

            const button_wrapper = $(".advance-button-wrapper");
            if (button_wrapper) {
                const button = $(".advance-button");
                button.click();
            }

            //console.log(root_wrap);
            // Example: Click a button, modify content, etc.
            // document.querySelector('#someButton').click();
        }

        const intervalId = setInterval(myLoopFunction, 1000);
        console.log('Supper Autoplay Script wurde gestartet!');
    }

    // Hauptlogik: Dialog anzeigen und auf Antwort warten
    async function main() {
        // Warten bis jQuery geladen ist
        if (typeof $ === 'undefined') {
            setTimeout(main, 100);
            return;
        }

        const userConfirmed = await createConfirmDialog();

        if (userConfirmed) {
            console.log('Autoplay Script wird gestartet...');
            executeAutoplayScript();
        } else {
            console.log('Autoplay Script wurde vom Benutzer abgebrochen.');
        }
    }

    // Script starten, sobald die Seite geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

})();