const socket = io.connect(location.host);

var perkRemaining;
var flagRemaining;
var dateRemaining;

var gameState;
var timer;
var singleID;
var assignedID;

var sessionID;
var cardObj;
var playerName;
var roomCode;

//DEBUG CODE
//document.cookie = "sessionID="
//console.info("[REDFLAGS] The Debug Cookie thing is still active, please remove on release!")

//setActiveDisplay
function setActiveDisplay(activeDisplay) {
	gameDisplayObjects = document.getElementsByClassName("gameDisplay");
	for (let i = 0; i < gameDisplayObjects.length; i++) {
		const element = gameDisplayObjects[i];
		if (element.id == activeDisplay) {
			element.classList.add("active");
			if (Array.from(element.classList).includes("showSubmit")) {
				document.getElementById("gameSubmit").style.display = "initial";
			} else {
				document.getElementById("gameSubmit").style.display = "none";
			}
		} else {
			element.classList.remove("active");
		}
	}
}

//changeGameState
function changeGameState(state) {
	switch (state) {
		case 'lobby':
			document.getElementById("username").innerText = playerName;
			setActiveDisplay('lobbyGrid');
			break;
		case 'perk':
			setActiveDisplay('perkGrid');
			break;
		case 'wait':
			setActiveDisplay('tipGrid');
			break;
		case 'flag':
			document.getElementById("flagModal").style.display = 'block';
			setActiveDisplay("flagGrid");
			break;
		case 'date':
			setActiveDisplay("dateGrid");
			break;
		case 'lone':
			setActiveDisplay("tipGrid");
			break;	
		case 'blnk':
			setActiveDisplay("blankGrid");
			break;
		case 'nblk':
			if (singleID != sessionID) {
				setActiveDisplay("blankGrid");
			} else {
				setActiveDisplay("BnextGrid");
			}
			break;
		case 'winr':
			setActiveDisplay("endGrid");
			break;
		default:
			console.error("[REDFLAGS] Changed Game State to Unknown State");
			return false;
	}
	gameState = state;
}

//on cardClicked Function
function cardClicked(event, counter) {
	cardTarget = event.target;

	if (Array.from(cardTarget.classList).includes("selected")) {
		cardTarget.classList.remove("selected");
		cardObj.fillInBlank[gameState].splice(cardObj[gameState].indexOf(cardTarget.id[4]), 1);
		cardObj[gameState].splice(cardObj[gameState].indexOf(cardTarget.id[4]), 1);
		counter.val++;
	} else if (counter.val > 0) {
		cardTarget.classList.add("selected");
		var blankWordReplace = 0;
		if (cardTarget.innerText.includes("_")) {
			cardObj.fillInBlank[gameState].push(prompt("Fill in the blank: " + cardTarget.innerText));
		} else {
			cardObj.fillInBlank[gameState].push('')
		}
		cardObj[gameState].push((cardTarget.id[4] - 1) + blankWordReplace);
		counter.val--;
	}

	if (counter.val == 0) {
		document.getElementById("gameSubmit").disabled = false;
	} else {
		document.getElementById("gameSubmit").disabled = true;
	}
}

//https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript
function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

//https://www.w3schools.com/js/js_cookies.asp
function setCookie(cname, cvalue, exdays) {
	const d = new Date();
	d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
	let expires = "expires=" + d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
	let name = cname + "=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(';');
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}
if (location.search != "") {
	playerName = decodeURIComponent(location.search.split("&")[0].substring(12).replace("+",""));
	roomCode = location.search.split("&")[1].substring(9);
} else {
	location.pathname = '';
}

// # Socket Requests

// ## Send

//Get sessionID
function getSessionID() {
	var currentSessionCookie = getCookie("sessionID");
	//Currently don't have a session Cookie
	if (currentSessionCookie == "") {
		socket.emit("requestID", { "playerName": playerName, "roomCode": roomCode }, (response) => {
			if (response.error) {
				history.back();
				return false
			}
			setCookie("sessionID", response, 1);
			console.log(`sessionID set to ${response}`);
			sessionID = response;
			reset();
		});
	} else {
	//Does have a session Cookie
		sessionID = currentSessionCookie;
		socket.emit("getUsername", { "playerID": sessionID, "playerName": playerName }, (response) => {
			if (!response.isUserReal) {
				console.log(response);
				//Have an old session cookie
				setCookie("sessionID", response.sessionID, 1);
				console.log(`old sessionID Invalid, sessionID set to ${response.sessionID}`);
				sessionID = response.sessionID;
			} else {
				//Re-connecting
				console.log("Reconnect")
				playerName = response.playerName;
			}
			reset();
		});
	}
}

//Submit cards
function submit() {
	socket.emit("submit" + capitalizeFirstLetter(gameState), {"id": sessionID, "cards": cardObj[gameState], "fillInBlank": cardObj.fillInBlank[gameState] });
	changeGameState("wait");
}

// ## Recieve

socket.on("startPerks", (message) => {
	singleID = message.singleID;
	if (singleID != sessionID) {
		changeGameState("perk");
	} else {
		changeGameState("lone");
	}
	timer = message.timer;
	for (let i = 0; i < 4; i++) {
		document.getElementById("perk" + (i + 1)).innerText = message.perkCards[sessionID][i];
	}
});

socket.on("startFlags", (message) => {
	document.getElementById("gameSubmit").disabled = true;
	if (singleID != sessionID) {
		timer = message.timer;
		assignedID = message.assignedID[sessionID];
		for (let i = 0; i < 3; i++) {
			document.getElementById("flag" + (i + 1)).innerText = message.flagCards[sessionID][i];
		}
		document.getElementById("assignedName").innerText = message.playersObj[assignedID].displayName;
		document.getElementById("assignedCard1").innerText = message.playersObj[assignedID].selectedPerkCards[0];
		document.getElementById("assignedCard2").innerText = message.playersObj[assignedID].selectedPerkCards[1];
		changeGameState("flag");
	} else {
		changeGameState("lone");
	}
});

socket.on("startDate", (message) => {
	timer = message.timer;
	playersObj = message.playersObj;
	delete playersObj[sessionID];
	if (singleID != sessionID) {
		changeGameState("lone");
	} else {
		for (let i = 0; i < Object.keys(playersObj).length; i++) {
			document.getElementById("date" + (i + 1)).style.display = 'block';
			document.getElementById("date" + (i + 1)).innerText = message.playersObj[Object.keys(playersObj)[i]].displayName;
		}
		for (let i = Object.keys(playersObj).length; i < 8; i++) {
			document.getElementById("date" + (i + 1)).parentElement.style.display = 'none';
		}
		changeGameState("date");
	}
});

//onBlank
socket.on("blankNext", (message) => {
	changeGameState("nblk");
});

//onWinner
socket.on("gameOver", (message) => {
	document.getElementById("winnerUser").innerText = message.winner;
	changeGameState("winr");
});

socket.on("restart", (message) => {
	reset();
	allCards = document.getElementsByClassName("card");
	for (let i = 0; i < allCards.length; i++) {
		const element = allCards[i];
		element.classList.remove("selected");
	}
	document.getElementById("gameSubmit").disabled = true;
});

//Initialise
function reset() {
	perkRemaining = { "val": 2 };
	flagRemaining = { "val": 1 };
	dateRemaining = { "val": 1 };

	changeGameState("lobby");

	timer = 0;
	singleID = '';
	assignedID = '';

	cardObj = { 
		id: sessionID, 
		perk: [], 
		flag: [], 
		date: [], 
		fillInBlank: {
			perk: [], 
			flag: [],
			date: []
		} 
	};
}

(function () {
	getSessionID();
})();

//Exit Game
socket.on("exit", (message) => {
	document.getElementById("endGrid").children[0].innerText = "Game Over!";
	exitFullscreen();
	history.go(-2);
});

//Relaod Game
socket.on("playAgain", (message) => {
	window.location.reload();
});

//Close on modal unfocus
window.onclick = function (event) {
	if (event.target == document.getElementById('flagModal')) {
		document.getElementById("flagModal").style.display = "none";
	}
} 

//document.onclick = openFullscreen;

document.addEventListener('fullscreenchange', (event) => {
	// The document with the fullscreen element
	var fullscreenElement = document.fullscreenElement;
  
	// If there is no element in fullscreen mode, show the button
	if (!fullscreenElement) {
	  document.getElementById("fullscreenButton").style.display = 'block';
	}
  });

//https://www.w3schools.com/Jsref/api_fullscreen.asp

function openFullscreen() {
	window.scrollTo(0,0);
	if (document.documentElement.requestFullscreen) {
	  	document.documentElement.requestFullscreen();
	} else if (document.documentElement.webkitRequestFullscreen) { /* Safari */
	  	document.documentElement.webkitRequestFullscreen();
	} else if (document.documentElement.msRequestFullscreen) { /* IE11 */
	  	document.documentElement.msRequestFullscreen();
	} else if (document.documentElement.mozRequestFullScreen) { /* Firefox */
	  	document.documentElement.mozRequestFullScreen();
	}
	document.getElementById("fullscreenButton").style.display = 'none';
}