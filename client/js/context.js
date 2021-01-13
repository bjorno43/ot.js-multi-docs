$(document).ready(function(){
	const menu = document.querySelector(".cmenu");
	let menuVisible = false;

	const toggleMenu = command => {
		menu.style.display = command === "show" ? "block" : "none";
		menuVisible = !menuVisible;
	};

	const setPosition = ({ top, left }) => {
		menu.style.left = `${left}px`;
		menu.style.top = `${top}px`;
		toggleMenu("show");
	};

	window.addEventListener("click", e => {
		if(menuVisible)toggleMenu("hide");
	});

	window.addEventListener("contextmenu", e => {
		const origin = {
			left: e.pageX,
			top: e.pageY
		};
		var targetElement = event.target;
		if (targetElement.classList.contains("tabMenu")) {
			e.preventDefault();

			const tabName = targetElement.parentElement.id.substr(4);

			$("#context-close").attr("onclick", "removeTab('"+tabName+"')");
			setPosition(origin);
		}

		return false;
	});
});
