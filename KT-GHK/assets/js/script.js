// change the color when the menu sticky
let navMenu = document.getElementById("nav-menu");
window.onscroll = function () {
	if (window.pageYOffset > 0) {
		navMenu.classList.add("navbar-white");
		navMenu.classList.add("bg-white");
		navMenu.classList.add("shadow");
		navMenu.classList.remove("navbar-dark");
	} else {
		navMenu.classList.remove("navbar-white");
		navMenu.classList.remove("bg-white");
		navMenu.classList.remove("shadow");
		navMenu.classList.add("navbar-dark");
	}
};
// body
// follow number
let follows = document.querySelectorAll("#body .follow .point");

follows.forEach((follows) => {
	let startValue = parseFloat(follows.getAttribute("data-duration"));
	let endValue = parseFloat(follows.getAttribute("data-val"));
	let setTime = endValue / startValue / 100;
	let counter = setInterval(function () {
		if (endValue >= 1000) {
			startValue += 10;
		} else {
			startValue += 1;
		}

		follows.textContent = startValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		if (startValue == endValue) {
			clearInterval(counter);
		}
	}, setTime);
});
