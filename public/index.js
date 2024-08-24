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
	var playerName = sanitizeInput(document.forms["joinForm"]["playerName"].value);
	var roomCode = sanitizeInput(document.forms["joinForm"]["roomCode"].value);
	document.forms["joinForm"]["roomCode"].value = roomCode.toUpperCase();
	document.forms["joinForm"]["playerName"].value = playerName.toUpperCase();
	if (playerName == "" || roomCode == "") {
		alert("All boxes need to be filled in!");
		return false;
	}
}

function sanitizeInput(input) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(input));
    return div.innerHTML;
}

document.getElementById("roomCode").value = location.search.substring(4);