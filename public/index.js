//const socket = io.connect("http://localhost:3000");

function changeMenuButtons(newMenu) {
	for (let i = 0; i < document.getElementsByClassName("buttons").length; i++) {
		const elementNodeReference = document.getElementsByClassName("buttons")[i];

		if (Array.from(elementNodeReference.classList).includes(newMenu)) {
			elementNodeReference.classList.add("active");
			//elementNodeReference.style.display = 'initial';
		} else {
			elementNodeReference.classList.remove("active");
			//elementNodeReference.style.display = 'none';
		}
	}
}

function validateForm() {
	var playerName = document.forms["joinForm"]["playerName"].value;
	var roomCode = document.forms["joinForm"]["roomCode"].value;
	document.forms["joinForm"]["roomCode"].value = roomCode.toUpperCase();
	if (playerName == "" || roomCode == "") {
		alert("All boxes need to be filled in!");
		return false;
	}
}

document.getElementById("roomCode").value = '';