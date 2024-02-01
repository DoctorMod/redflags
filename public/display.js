const socket = io.connect(location.host);

const secret = Math.random().toString(36).slice(2);

var playerCounter = 0;
var timeRemainingSeconds = 0;

var perksList = {};
var flagList = {};
var perkCounter = 0;
var flagCounter = 0;
var gameState = '';

var oneLiners = {
	"playerJoin": [
		"Well, well, well, look who just strolled into the party like they own the place! Welcome, party animal!",
		"Guess who just crash-landed in the fun zone? It's [NAME], bringing good vibes and questionable dance moves!",
		"Hold the phone - we've got a new contender in the laughter ring! Everyone, meet the life of the party, [NAME]!",
		"Alert the paparazzi! A star just entered the lobby. Welcome, [NAME], our newest VIP in the party game extravaganza!",
		"Stop the presses! We've got a fresh face in the party palace. Gather 'round, folks, and meet the legend in the making, [NAME]!"
	],
	"lobbyLines": [
		"Waiting for everyone to log in is like watching a pot of water refuse to boil. Let's speed up this digital simmer, folks!",
		"It's not a party until everyone's here - or at least until the loading screens get their act together. Patience, my party people!",
		"While we wait for stragglers, let's ponder life's great mysteries, like why loading bars move slower than a snail on a coffee break. Bring on the quick connections!",
	],
	"timerLines": [
		"Time flies like an arrow, but not as fast as you choosing cards. Better speed it up before it gets its pilot's license!",
		"Tick-tock, tick-tock! The only thing slower than this timer is a turtle in quicksand - make a move!",
		"Is it just me, or does this timer move slower than a sloth in a snail race? Chop chop, decision-maker!",
		"The only thing running out faster than time is my patience. Let's pick those cards before my snark level reaches critical mass!",
		"Counting down like a New Year's Eve ball drop, but with fewer confetti cannons and more awkward silences. Choose those cards!",	
		"If this timer were any slower, we'd need a flux capacitor to speed things up. Make like Marty McFly and choose your cards!",
		"Time's slipping away, like sand through an indecisive hourglass. Choose cards, not procrastination!",
		"The clock is ticking louder than my neighbor's polka band - let's wrap it up before we have an impromptu concert!",
		"Time's a-wasting! If this timer were a sandwich, it would be a 'procrastinator special' with extra mayo. Choose those cards!",
		"The seconds are slipping away faster than my ability to come up with clever one-liners. Choose cards, and maybe I'll get my wit back!"
	],
	"perkTooLong": [
		"Hurry up, or we'll have to choose your perks for you, and last time, someone ended up with 'Professional Thumb War Champion.'",
		"Running out of time? No worries! We'll pick your perks - may the RNG odds be ever in your favor!",
		"Tick-tock! If you don't pick, your fate will be decided by a confused squirrel with a deck of perk cards.",
		"The clock's ticking, and so are your chances of getting the perfect perks. Random selection awaits, and it once gave someone 'Master of Pogo Stick Ballet.'",
		"Time's up! Let the Perk Roulette begin! Spoiler alert: The last guy who got 'Ultimate Synchronized Snacking' still hasn't recovered."
	],
	"flagTooLong": [
		"Choose wisely, or we'll have to randomly assign your red flag - because nothing says love like 'Amateur Mime Interpreter.'",
		"Running out of time in the love department? Brace yourself for the random red flag generator - it once paired someone with 'World Champion Sock Puppet Whisperer.'",
		"Feeling indecisive? Let fate decide your relationship red flag, and maybe you'll end up with 'Professional Whoopee Cushion Consultant.'",
		"Clock's ticking on love! If you can't choose, prepare for a blind date with destiny - and the possibility of 'Unlicensed Fortune Cookie Writer.'",
		"Out of time for love decisions? Get ready for a surprise - our random red flag picker once matched someone with 'Extreme Collector of Lint from Dryer Screens.'"
	],
	"dateTooLong": [
		"If deciding the winner takes longer than my last relationship, well actually I guess we probably won't have to wait that much longer then.",
		"Waiting for a decision? Even my pet rock makes quicker choices - and it's a rock!",
		"Is this a democracy or a nap time? Let's vote before our snacks go stale!",
		"I've seen sloths with faster decision-making skills.",
		"Someone get this judge a calendar; we're on Redflags time, not 'take-a-nap-and-decide' time!"
	]
}

//Change Active Display
function changeDisplay(newDisplay) {
	gameState = newDisplay;
	for (let i = 0; i < document.getElementsByClassName("display").length; i++) {
		const displayElement = document.getElementsByClassName("display")[i];

		if (Array.from(displayElement.classList).includes(newDisplay)) {
			displayElement.classList.add("active");
		} else {
			displayElement.classList.remove("active");
		}
	}
}

//Settings
function settingSave() {
	message = {
		"reuseCards": document.getElementById("reuseCardSettings").value,
		"tts": document.getElementById("ttsSettings").value,
		"perkTimer": document.getElementById("perkSettings").value,
		"flagTimer": document.getElementById("flagSettings").value,
		"dateTimer": document.getElementById("dateSettings").value
	}
	socket.emit("settingsUpdate", message);
	document.getElementById('settingsModal').style.display = 'none';
}

//Update the currently displayed Perk Cards + TTS.
function updatePerk(playerPerk) {
	if (playerPerk == undefined) {
		nextSlide()
	} else {
		document.getElementById("perkName").innerText = playerPerk.displayName;
		document.getElementById("perk1").innerText = playerPerk.perksList[0];
		document.getElementById("perk2").innerText = playerPerk.perksList[1];
		window.speechSynthesis.cancel()
		tts(`${playerPerk.displayName}'s Date has the following characteristics, ${playerPerk.perksList[0]}....., and ${playerPerk.perksList[1]}.`);
	}
}

//Update the currently displayed Perk Cards + Flag Card + TTS.
function updateFlag(playerFlag) {
	if (playerFlag == undefined) {
		nextSlide()
	} else {
		document.getElementById("flagName").innerText = playerFlag.assigneePlayerName;
		document.getElementById("flagOGName").innerText = playerFlag.originalPlayerName;
		document.getElementById("flagPerk1").innerText = playerFlag.perksList[0];
		document.getElementById("flagPerk2").innerText = playerFlag.perksList[1];
		document.getElementById("flagCard1").innerText = playerFlag.flagsList[0];
		window.speechSynthesis.cancel()
		tts(`${playerFlag.assigneePlayerName}..... added the Red Flag ${playerFlag.flagsList[0]} to ${playerFlag.originalPlayerName}'s Date..... who had the following characteristics, ${playerFlag.perksList[0]}....., and ${playerFlag.perksList[1]}.`);	
	}
}

function nextSlide() {
	switch (gameState) {
		case 'perks':
			perkCounter += 1;
			if (perkCounter < playerCounter) {
				updatePerk(perksList[perkCounter])
			} else {
				socket.emit("doneSlides",{"state": "flag","secret":secret})
			}
			break;
		case 'flags':
			flagCounter += 1;
			if (flagCounter < playerCounter) {
				updateFlag(flagList[flagCounter])
			} else {
				socket.emit("doneSlides",{"state": "date","secret":secret})
			}
			break;
	}	
}

//Start up request id and room code
socket.emit("requestDisplay", secret, (response) => {
	document.getElementById("ip").innerText = response.ip;
	document.getElementById("roomCode").innerText = response.roomCode;
	console.log(response);
});

//on player join, add name to list
socket.on("playerJoin", (playerName) => {
	document.getElementsByClassName("card")[playerCounter].innerText = playerName;
	playerCounter += 1;
	if (playerCounter >= 3) {
		document.getElementById("startGame").disabled = false;
	}
})

setInterval(function() {
	timeRemainingSeconds--;
	document.getElementById("seconds").innerText = timeRemainingSeconds;
},1000);

//switch to the timer
socket.on("showTimer", (timer) => {
	changeDisplay("timer");
	console.log(timer);
	timeRemainingSeconds = timer;
	document.getElementById("seconds").innerText = timeRemainingSeconds;
});

//initialize the perk card display
socket.on("displayPerks", (message) => {
	playersObject = message.playersObject;
	singleID = message.singleID;
	console.log(playersObject);
	changeDisplay("perks");
	for (let i = 0; i < Object.keys(playersObject).length; i++) {
		const playerID = Object.keys(playersObject)[i];
		if (singleID != playerID) {
			console.log(playerID + ":" + playersObject[playerID].selectedPerkCards);
			perksList[i] = {};
			perksList[i].displayName = playersObject[playerID].displayName;
			perksList[i].perksList = playersObject[playerID].selectedPerkCards;	
		}
	}
	updatePerk(perksList[0]);
});

//initialize the flag card display
socket.on("displayFlags", (message) => {
	playersObject = message.playersObject;
	singleID = message.singleID;
	swappedAssignedIDs = Object.fromEntries(Object.entries(message.assignedIDs).map(a => a.reverse()));
	console.log(playersObject);
	changeDisplay("flags");
	for (let i = 0; i < Object.keys(playersObject).length; i++) {
		const playerID = Object.keys(playersObject)[i];
		if (singleID != playerID) {
			const assigneeID = swappedAssignedIDs[playerID];
			console.log(playerID + ":" + playersObject[playerID].selectedFlagCards);
			flagList[i] = {};
			flagList[i].assigneePlayerName = playersObject[assigneeID].displayName;
			flagList[i].originalPlayerName = playersObject[playerID].displayName;
			flagList[i].perksList = playersObject[playerID].selectedPerkCards;
			flagList[i].flagsList = playersObject[playerID].selectedFlagCards;
		}
	}
	updateFlag(flagList[0]);
});

//Show Winner
socket.on("gameOver", (message) => {
	changeDisplay("end");
	document.getElementsByClassName("timer")[0].classList.add("active");
	document.getElementById("winnerName").innerText = message.winner;
	timeRemainingSeconds = message.timer;
	document.getElementById("seconds").innerText = timeRemainingSeconds;
});

//Goto Next Slide
socket.on("nextSlide", nextSlide);

//TTS Function
function tts(text) { if (document.getElementById("ttsSettings").value == "true") {window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)) }}