// change the color when the menu sticky
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

// body
// follow number
if (document.querySelectorAll("#body .follow-point .point")) {
	let follows = document.querySelectorAll("#body .follow-point .point");

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
}

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

// var user = [{ name: "thientrile", email: "thientrile@gmail.com", password: "04032003" }];
var user = [];
if (document.getElementById("user-login")) {
	document.getElementById("user-login").onclick = function () {
		if (user.length == 0) {
			window.location = "login.html";
		} else {
			window.location = "user.html";
		}
	};
}
if (document.querySelectorAll(".center-wrap")) {
	let forms = document.querySelectorAll(".center-wrap");
	for (let i of forms) {
		i.querySelector(".btn").onclick = function () {
			const length = new RegExp("(?=.{8,})");
			if (i.querySelector(".logname")) {
				let name = i.querySelector(".logname").vaule;
				let email = i.querySelector(".logemail").value;
				let pass = i.querySelector(".logpass").value;
				if (name != "" && email != "" && length.test(pass) == true) {
					user.push({ name: name, email: email, pass: pass });
				}
				window.location = "user.html";
			} else {
				let email = i.querySelector(".logemail").value;
				let pass = i.querySelector(".logpas").value;
				for (let i of user) {
					console.log(i.email);
					// if (email == i.email && pass == i.pass) {
					// 	window.location = "user.html";
					// }
				}
				console.log(true);
				console.log(user.length);
			}
		};
	}
}

if (document.getElementById("logout")) {
	document.getElementById("logout").onclick = function () {
		window.location = "login.html";
	};
}
var sl = 0;

var items = [];
if (document.querySelectorAll(".creative .card")) {
	let cards = document.querySelectorAll(".creative .card");
	for (let i of cards) {
		i.querySelector(".plus").onclick = function () {
			let img = i.querySelector(".card-img-top").src;
			let headingNote = i.querySelector(".heading-note").innerHTML;
			let cardTitle = i.querySelector(".card-title").innerHTML;
			let cardPrice = i.querySelector(".card-price").innerHTML;
			if (sl > 0) {
				let kt = 0;
				for (let item of items) {
					if (item.name === cardTitle && item.img === img) {
						item.amount++;
						break;
					} else {
						kt++;
						if (kt == items.length) {
							items.push({
								name: cardTitle,
								price: cardPrice,
								img: img,
								headingNote: headingNote,
								amount: 1,
							});
							break;
						}
					}
				}
			} else {
				items.push({ name: cardTitle, price: cardPrice, img: img, headingNote: headingNote, amount: 1 });
			}
			sl++;

			document.querySelector(".ng-binding").innerHTML = sl;
		};
		i.querySelector(".cart").onclick = function () {
			let img = i.querySelector(".card-img-top").src;
			let headingNote = i.querySelector(".heading-note").innerHTML;
			let cardTitle = i.querySelector(".card-title").innerHTML;
			let cardPrice = i.querySelector(".card-price").innerHTML;
			document.querySelector("#buy-modal > div > div > div.modal-body").innerHTML = `<div class="container">
			<div class="row">
				<div class="col-6">
					<img src="${img}" alt="" style="width:100%"/>
				</div>
				<div class="col-6">
					<h3>${headingNote}</h3>
					<h5>${cardTitle}</h5>
					<p>${cardPrice}</p>
					<button type="button" class="btn btn-primary" id="add-card" 
					data-bs-toggle="modal" data-bs-target="#add">Add To Card</button>
			<button type="button" class="btn btn-danger">Buy</button>
				</div>
			</div>
			
		</div>
			`;
			document.querySelector("#add-card").onclick = function () {
				document.querySelector("#add > div > div > div.modal-body").innerHTML = `<div class="container">
				<div class="row">
					<div class="col-6">
						<img src="${img}" alt="" style="width:100%"/>
					</div>
					<div class="col-6">
						<h3>${headingNote}</h3>
						<h5>${cardTitle}</h5>
						<p>${cardPrice}</p>
						<button type="button" class="btn btn-danger" id="remove" 
						data-bs-toggle="modal" data-bs-target="#buy-modal">remove</button>
				<button id="buy" type="button" class="btn btn-primary">place Order</button>
					</div>
				</div>
				
			</div>
				`;
			};
			document.querySelector("#remove").onclick = function () {
				document.querySelector("#buy-modal > div > div > div.modal-body").innerHTML = "hllo";
			};
		};
	}
}
