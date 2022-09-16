let navMenu = document.getElementById("nav-menu");

window.onscroll = function () {
	if (window.pageYOffset > 0) {
		navMenu.classList.add("navbar-white");
		navMenu.classList.add("bg-white");
		navMenu.classList.remove("navbar-dark");
	} else {
		navMenu.classList.remove("navbar-white");
		navMenu.classList.remove("bg-white");
		navMenu.classList.add("navbar-dark");
	}
};
