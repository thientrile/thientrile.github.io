// sleep
let sleep = (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

if (document.getElementById("nav-menu")) {
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
}

//

// follow number
sleep(3000).then(()=>{if (document.querySelector("#body > div.follow-point.pt-5.ng-scope > div > div > div:nth-child(1) > span")) {
	let follows = document.querySelectorAll("#body > div.follow-point.pt-5.ng-scope > div > div > div > span");

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
}})
sleep(5000)
// onte-stop
if (document.querySelectorAll(".typewrite")) {
	let TxtType = function (el, toRotate, period) {
		this.toRotate = toRotate;
		this.el = el;
		this.loopNum = 0;
		this.period = parseInt(period, 10) || 2000;
		this.txt = "";
		this.tick();
		this.isDeleting = false;
	};

	TxtType.prototype.tick = function () {
		let i = this.loopNum % this.toRotate.length;
		let fullTxt = this.toRotate[i];

		if (this.isDeleting) {
			this.txt = fullTxt.substring(0, this.txt.length - 1);
		} else {
			this.txt = fullTxt.substring(0, this.txt.length + 1);
		}

		this.el.innerHTML = '<span class="wrap" >' + this.txt + "</span>";

		let that = this;
		let delta = 200 - Math.random() * 100;

		if (this.isDeleting) {
			delta /= 2;
		}

		if (!this.isDeleting && this.txt === fullTxt) {
			delta = this.period;
			this.isDeleting = true;
		} else if (this.isDeleting && this.txt === "") {
			this.isDeleting = false;
			this.loopNum++;
			delta = 500;
		}

		setTimeout(function () {
			that.tick();
		}, delta);
	};

	window.onload = function () {
		let elements = document.getElementsByClassName("typewrite");
		for (let i = 0; i < elements.length; i++) {
			let toRotate = elements[i].getAttribute("data-type");
			let period = elements[i].getAttribute("data-period");
			if (toRotate) {
				new TxtType(elements[i], JSON.parse(toRotate), period);
			}
		}
		// INJECT CSS
		let css = document.createElement("style");
		css.type = "text/css";
		css.innerHTML = ".typewrite > .wrap { border-right: 0.08em solid #000000;}";
		document.body.appendChild(css);
	};
}


