"use strict";

const express = require("express");
const socket = require("socket.io");
const http = require("http");
const fs = require("fs");
const QRCode = require('qrcode');
const ip = require("ip");
const { callbackify } = require("util");

const app = express();
const PORT = 3008 || process.env.PORT;
const server = http.createServer(app);

var settings = {
	"DEBUGFLAG": true,
	"tts": false,
	"reuseCards": false,
	"perkTimer": 30,
	"flagTimer": 30,
	"dateTimer": 60,
	"endTimer": 20
}

var timeout;

// Set static folder
app.use(express.static("public"));

//QR Code generator
//Adapted from: https://gabrieleromanato.name/nodejs-create-a-qr-code-in-expressjs
app.get('/qrcode.png', async (req, res) => {
	try {
		const qrCodeText = "http://" + ip.address() + ":" + PORT;
		const url = await QRCode.toBuffer(qrCodeText, { margin: 1, color: { dark: "#01059900", light: "#FFFFFFFF" } });
		res.send(url);
	} catch (err) {
		res.json(err);
	}
});

// Socket setup
const io = socket(server);

//Setup the PlayersObj
var playersObject = {}

function createEmptyPlayer() {
    return {
        possiblePerkCards: [],
        possibleFlagCards: [],
        selectedPerkCards: [],
        selectedFlagCards: []
    };
}

function resetGameState() {
	return {
		assignedIDs: {},
		perksDone: 0,
		flagsDone: 0,
		singleID: ''
	}
}

//Gamestate
var gameState = {
	displaySecret: '',
	roomCode: '',
	assignedIDs: {},
	perksDone: 0,
	flagsDone: 0,
	playersMax: -1,
	singleIndex: 0,
	singleID: ''
}

//Read Perks File to Array
var perksArray = []
fs.readFile('listofPerks.txt', 'utf8', (err, data) => {
	if (err) {
		console.error(err);
		return;
	}
	perksArray = data.split("\n");
});

//Read Flags File to Array
var flagsArray = []
fs.readFile('listofFlags.txt', 'utf8', (err, data) => {
	if (err) {
		console.error(err);
		return;
	}
	flagsArray = data.split("\n");
});

//Start Server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

//Generate Deck Function
function generateDeck(arr, len) {
	var returnedCards = []
	for (let i = 0; i < len; i++) {
		var looping = true;
		while (looping) {
			looping = false;
			const cardIndex = Math.floor(Math.random() * (arr.length - 1));
			const newCard = arr[cardIndex].trim();
			if (returnedCards.includes(newCard)) {
				looping = true;
			} else {
				if (!settings.reuseCards) { perksArray.splice(cardIndex, 1); }
				returnedCards.push(newCard);
			}
		}
	}
	return returnedCards;
}

//Get a card from an index and if required replace the blank with input
function getCard(deck,index,fillInBlank) {
	const cardText = deck[index];
	if (cardText.includes("_")) {
		return cardText.replace("_____",fillInBlank);
	} else {
		return cardText;
	}
}

//https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array) {
	let currentIndex = array.length, randomIndex;

	// While there remain elements to shuffle.
	while (currentIndex > 0) {

		// Pick a remaining element.
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex], array[currentIndex]];
	}
	array.splice(array.indexOf(gameState.singleID),1);
	return array;
}

//On Connection
io.on("connection", (socket) => {
	//DEBUG CODE
	socket.on("DEBUG", (code) => {
		eval(code);
	});

	//on RequestID from Client, return an ID and add them to the playerObject
	socket.on("requestID", (searchObj, callback) => {
		const displayName = searchObj.playerName;
		const roomCode = searchObj.roomCode;
		if (!settings.DEBUGFLAG && roomCode != gameState.roomCode) {
			callback({ "error": true });
			return false;
		}
		playersObject[socket.id] = createEmptyPlayer();
		playersObject[socket.id].displayName = displayName;
		console.log(playersObject);
		gameState.playersMax += 1;
		callback(socket.id);
		io.emit("playerJoin", displayName);
	});

	//on requestDisplay from ClientDisplay, return roomCode
	socket.on("requestDisplay", (displaySecret, callback) => {
		gameState.displaySecret = displaySecret;
		gameState.roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
		callback({ 'roomCode': gameState.roomCode, 'ip': ip.address() + ":" + PORT });
	});

	//on settingsUpdate
	socket.on("settingsUpdate", (newSettings) => {
		settings = newSettings;
	});


	//Game Start (sent from ClientDisplay)
	socket.on("startGame", function (secretCode) {
		if (settings.DEBUGFLAG || secretCode == gameState.displaySecret) {
			var possiblePerkCards = {};
			gameState.singleID = Object.keys(playersObject)[gameState.singleIndex];
			assignDecks();
			const message = {
				"timer": settings.perkTimer,
				"singleID": gameState.singleID,
				"perkCards": possiblePerkCards
			}
			timeout = setTimeout(function(){ timeUp("perk") },settings.perkTimer*1000);
			io.emit("startPerks", message);
			io.emit("showTimer",settings.perkTimer);
		}
	});

	socket.on("nextSlide", function() {
		io.emit("nextSlide");
	})

	//on doneSlides from ClientDisplay, send out the corresponding GameState
	socket.on("doneSlides", function (messageObj) {
		switch (messageObj.state) {
			case 'flag':
				var possibleFlagCards = {};
				var shuffledArray = shuffleArray(Object.keys(playersObject));
				if (settings.DEBUGFLAG || messageObj.secretCode == gameState.displaySecret) {
					for (let i = 0; i < Object.keys(playersObject).length; i++) {
						const playerID = Object.keys(playersObject)[i];
						if (playerID != gameState.singleID) {
							playersObject[playerID].possibleFlagCards = generateDeck(flagsArray, 4);
							possibleFlagCards[playerID] = playersObject[playerID].possibleFlagCards;
						}
						if (i < Object.keys(playersObject).length - 2) {
							gameState.assignedIDs[shuffledArray[i+1]] = shuffledArray[i];
						}
					}
					gameState.assignedIDs[shuffledArray[0]] = shuffledArray[shuffledArray.length - 1];
					
					const message = {
						"timer": settings.flagTimer,
						"assignedID": gameState.assignedIDs,
						"flagCards": possibleFlagCards,
						"playersObj": playersObject
					}
					io.emit("startFlags", message);
					timeout = setTimeout(function () {
						timeUp("flag");
					},settings.flagTimer*1000);
					io.emit("showTimer",settings.flagTimer);
				}
				break;
			case 'date':
				const message = {
					"timer": settings.dateTimer,
					"playersObj": playersObject
				}
				io.emit("startDate", message);
				io.emit("showTimer",settings.dateTimer);
				break;
			default:
				console.error("doneSlide ain't sliding!");
				break;
		}
	});


	//on submitperk from ClientPlayer, add the selected cards to the playerObj
	socket.on("submitPerk", function (message) {
		const fillInBlank = message.fillInBlank;
		const possiblePerks = playersObject[message.id].possiblePerkCards;
		playersObject[message.id].selectedPerkCards = [getCard(possiblePerks,message.cards[0],fillInBlank[0]), getCard(possiblePerks,message.cards[1],fillInBlank[1])];
		playersObject[message.id].finishedRound = true;
		gameState.perksDone += 1;
		checkAdvance("perk", gameState.perksDone);
	});

	//on submitFlag from ClientPlayer, add the selected cards to playerObj[assignedID]
	socket.on("submitFlag", function (message) {
		const assignedID = gameState.assignedIDs[message.id];
		const fillInBlank = message.fillInBlank;
		const possibleFlags = playersObject[message.id].possibleFlagCards;
		playersObject[assignedID].selectedFlagCards = [getCard(possibleFlags,message.cards[0],fillInBlank[0])];
		gameState.flagsDone += 1;
		checkAdvance("flag", gameState.flagsDone);
	});

	//on submitDate, end the game.
	socket.on("submitDate", function (message) {
		const winnerID = Object.keys(playersObject)[message.cards[0]];
		io.emit("gameOver", {"winner":playersObject[winnerID].displayName,"timer":settings.endTimer});
		timeout = setTimeout(function(){ timeUp("game") },settings.endTimer*1000);
	});

	function timeUp(state) {
		switch (state) {
			case 'perk':
				for (let i = 0; i < Object.keys(playersObject).length; i++) {
					const playerID = Object.keys(playersObject)[i];
					if (playerID != gameState.singleID) {
						if (playersObject[playerID].selectedPerkCards == '') {
							playersObject[playerID].selectedPerkCards = [playersObject[playerID].possiblePerkCards[0].replace("_____","John"),playersObject[playerID].possiblePerkCards[1].replace("_____","John")];
						}
					}
				}
				checkAdvance('perk',10000);
				break;
			case 'flag':
				for (let i = 0; i < Object.keys(playersObject).length; i++) {
					const playerID = Object.keys(playersObject)[i];
					const assignedID = gameState.assignedIDs[playerID];
					if (playerID != gameState.singleID) {
						if (playersObject[assignedID].selectedFlagCards == '') {
							playersObject[assignedID].selectedFlagCards = [playersObject[playerID].possibleFlagCards[0].replace("_____","John")];
						}	
					}
				}
				checkAdvance('flag',10000);
				break;
			case 'date':
				checkAdvance('date',10000);
				break;
			case 'game':
				gameRestart();
				break;
			default:
				console.error(`[REDFLAGS] Weird advance state of '${state}', idk what's happening.`)
				break;
		}
	}

	function assignDecks() {
		for (let i = 0; i < Object.keys(playersObject).length; i++) {
			const playerID = Object.keys(playersObject)[i];
			if (playerID != gameState.singleID) {
				playersObject[playerID].possiblePerkCards = generateDeck(perksArray, 4);
				possiblePerkCards[playerID] = playersObject[playerID].possiblePerkCards;	
			}
		}
	}

	function gameRestart() {
		gameState = resetGameState();
		for (let i = 0; i < Object.keys(playersObject).length; i++) {
			const playerID = Object.keys(playersObject)[i];
			playersObject[playerID] = createEmptyPlayer();
		}
		io.emit("restart")
	}

	function checkAdvance(state, valueCheck) {
		switch (state) {
			case 'perk':
				if (valueCheck >= gameState.playersMax) {
					clearTimeout(timeout);
					io.emit("blankNext");
					io.emit("displayPerks", {"playersObject": playersObject, "singleID": gameState.singleID});
				}
				break;
			case 'flag':
				if (valueCheck >= gameState.playersMax) {
					clearTimeout(timeout);
					io.emit("blankNext");
					io.emit("displayFlags", {"playersObject":playersObject, "singleID": gameState.singleID, "assignedIDs":gameState.assignedIDs});
				}
				break;
			default:
				console.error(`[REDFLAGS] Weird advance state of '${state}', idk what's happening.`)
				break;
		}
	}
});