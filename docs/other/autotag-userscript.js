// ==UserScript==
// @name         Supper Autotag
// @version      0.0.4
// @description  generate copy/pasteable tags for sword and supper missions
// @author       u/Thats_a_movie (github.com/asufyani)
// @match        https://*.devvit.net/index.html*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant        unsafeWindow
// @grant        GM_addStyle
// @downloadURL  https://github.com/asufyani/sword_supper_tag_generator/raw/refs/heads/main/autotag.user.js
// @updateURL    https://github.com/asufyani/sword_supper_tag_generator/raw/refs/heads/main/autotag.user.js
// ==/UserScript==

(function () {
    "use strict";
    let divAdded = false;

    const enemyNames = {
        golemBaby: "Baby Golem",
        slimeKnight: "Slime Knight",
        slimeBigMouth: "Chomp Slime",
        slimeCat: "Cat Slime",
        slimeGems: "Crystal Slime",
        skeleton: "Warrior Skeleton",
        skelNoHead: "Headless Skeleton",
        golemMountain: "Mountain Golem",
        golemMountainLucky: "Loaded Mountain Golem",
        golemBoar: "Boar Golem",
        skelFireHead: "Flaming Skeleton",
        skelIceHead: "Ice Flame Skeleton",
        skelArcher: "Ranger Skeleton",
        skel2Axe: "Barbarian Skeleton",
        slimeBone: "Bone Slime",
        slimeBoneLucky: "Loaded Bone Slime",
        mushroomSmall: "Bitey Shroom",
        mushroomLarge: "Erin-guy",
        mushroomLargeBoss: "Boss Mushroom",
        skelWizard: "Wizard Skeleton",
        skelGreatSword: "Swordsman Skeleton",
        skelGreatSwordLucky: "Loaded Swordsman Skeleton",
        skelAssassin: "Assassin Skeleton",
        cannibal: "Shadowbearer",
        darkBat: "Shadow Wing",
        darkShaman: "Shadowbringer",
        darkChild: "Shadowkin",
        darkBigGuy: "Shadow Brute",
        darkBigGuyLucky: "",
        darkHand: "Arm of Shadow",
        darkWizard: "Shadow Conjurer",
        darkGiantHorns: "Hollowhorn",
        darkWorm: "Shadow Hatchling",
        darkSpider: "Skittering Shadow",
        darkDemon: "Umbral Winged Shadeborn",
        mushroomChild: "Shroomkin",
        mushroomFrog: "Sporehead",
        mushroomSoldierLucky: "Loaded Sporehead",
        mushroomSoldier: "Sporewarden",
        livingArmor: "Steel Revenant",
        mushroomMonster: "Sturdy Sporeborn",
        mushroomTeeth: "Mawcap",
        woodGolem: "Heartroot Guardian",
        icyWoodGolem: "Frostroot Guardian",
        woodOctopus: "Branchclutch",
        woodRoof: "Stumpkin",
        robotNo1: "Y5-Sentry",
        robotNo2: "KRG-01",
        robotNo3: "Gen5-HVY",
        robotNo4: "Medibot-Mark IV",
        robotNo5: "WasteLogic LX-9",
        robotNo5Lucky: "Loaded WasteLogic LX-9",
        robotNo6: "BRX-7 Sentry Chassis",
        robotNo7: "Minifax Model B",
        robotBoss: "Slumbering Guardian-X5",
    };

    const mapNames = {
        fields: "Fields",
        outer_temple: "Outer Temple",
        forbidden_city: "Forbidden City",
        mossy_forest: "Mossy Forest",
        mountain_pass: "Mountain Pass",
        new_eden: "New Eden",
        ruined_path: "Ruined Path",
        seaside_cliffs: "Seaside Cliffs",
    };

    window.addEventListener("message", function (data) {
        if (data.data.data.message.type == "initialData") {
            const missionData = data.data.data.message.data.missionMetadata.mission;
            const encounters = missionData.encounters;
            debugger;
            const outputData = {
                enemyTypes: {},
                tags: [],
                rewards: [],
            };
            // Stars
            outputData.tags.push(`${missionData.difficulty}*`);
            // Level range
            outputData.tags.push(`${missionData.minLevel} - ${missionData.maxLevel}`);
            //Mapname
            outputData.tags.push(`${mapNames[missionData.environment]}`);
            //Foodname
            outputData.tags.push(`${missionData.foodName}`);
            if (missionData.type && missionData.type == "bossRush") {
                outputData.tags.push("boss rush");
            }
            encounters.forEach((encounter) => {
                if (encounter.type == "enemy") {
                    encounter.enemies.forEach((enemy) => {
                        outputData.enemyTypes[enemy.type] = 1;
                    });
                } else if (encounter.type == "treasure") {
                    encounter.reward.essences.forEach((essence) => {
                        const essenceName = essence.id.replace("Essence", "");
                        outputData.rewards.push(`${essence.quantity} ${essenceName}`);
                    });
                } else if (encounter.type == "crossroadsFight") {
                    let minibossTag = `miniboss ${enemyNames[encounter.enemies[0].type]}`;
                    if (missionData.minLevel > 60) {
                        minibossTag = "2k " + minibossTag;
                    } else if (missionData.minLevel > 40) {
                        minibossTag = "1k " + minibossTag;
                    }
                    outputData.tags.push(minibossTag);
                } else if (encounter.type == "boss" || encounter.type == "rushBoss") {
                    outputData.tags.push(`${enemyNames[encounter.enemies[0].type]} boss`);
                } else if (encounter.type == "investigate") {
                    outputData.tags.push("hut");
                }
            });

            const floatingDiv = document.createElement("div");
            const copiedDiv = document.createElement("div");
            copiedDiv.innerHTML = "Copied to clipboard!";
            floatingDiv.id = "myFloatingDiv";
            floatingDiv.style = "cursor: copy";
            floatingDiv.title = "Click to copy";
            const tagText = `${outputData.tags.join(" | ")}`;
            const rewardsText = `essences: ${outputData.rewards.join(", ")}`;
            // Rewards including essences
            //floatingDiv.innerHTML = tagText + "<br/>" + rewardsText;
            //Rewards without essences
            floatingDiv.innerHTML = tagText;
            floatingDiv.onclick = () => {
                // Copy incl. essences
                //this.navigator.clipboard.writeText(tagText + " " + rewardsText);
                // Copy without essences
                this.navigator.clipboard.writeText(tagText);
                floatingDiv.append(copiedDiv);
            };
            let closeButton = document.createElement("button");
            closeButton.id = "closeFloatingDiv";
            closeButton.textContent = "X";

            // Append close button to the floating div
            floatingDiv.appendChild(closeButton);

            // Add CSS styles for positioning and appearance
            GM_addStyle(`
        #myFloatingDiv {
            position: fixed; /* Makes the div float relative to the viewport */
            bottom: 20px;    /* Adjust as needed for vertical position */
            right: 20px;     /* Adjust as needed for horizontal position */
            background-color: #000;
            border: 1px solid #ccc;
            padding: 15px;
            box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
            z-index: 9999;   /* Ensures the div appears on top of other elements */
            border-radius: 5px;
            font-family: sans-serif;
            color: #fff;
        }
        #closeFloatingDiv {
            position: absolute;
            top: 5px;
            right: 5px;
            background-color: red;
            color: white;
            border: none;
            cursor: pointer;
            padding: 5px 8px;
        }
    `);
            closeButton.addEventListener("click", () => {
                floatingDiv.remove();
            });
            if (!divAdded) {
                divAdded = true;
                $("body").append(floatingDiv);
            }
        }
    });
    // Your code here...
})();