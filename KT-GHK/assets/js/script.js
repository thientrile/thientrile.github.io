// change the color when the menu sticky
if (document.getElementById("nav-menu")) {
	let navMenu = document.getElementById("nav-menu");
	// let animate = document.querySelectorAll(".reveal");
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

		// for (let i = 0; i < animate.length; i++) {
		// 	let windowHeight = window.innerHeight;
		// 	let elementTop = animate[i].getBoundingClientRect().top;
		// 	let elementVisible = 150;
		// 	if (elementTop < windowHeight - elementVisible) {
		// 		// animate[i].className.replace("reveal", "");
		// 		console.log(animate[i].className.search("reveal"));
		// 	} else {
		// 		// animate[i].classList.add("reveal");
		// 		console.log(false);
		// 	}
		// }
	};
}

//

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
		window.location = "login.html";
	};
}
if (document.querySelector("body > div > div > div > div > div > div > div > div.card-front > div > div > button")) {
	document.querySelector(
		"body > div > div > div > div > div > div > div > div.card-front > div > div > button"
	).onclick = function () {
		console.log(true);
		let email = document.querySelector(
			"body > div > div > div > div > div > div > div > div.card-front > div > div > div:nth-child(2) > input"
		).value;
		let password = document.querySelector(
			"body > div > div > div > div > div > div > div > div.card-front > div > div > div.form-group.mt-2 > input"
		).value;
		if (email == "admin@admin.com" && password == "admin") {
			window.location = "user.html";
		}
		console.log(email);
		console.log(password);
	};
}

if (document.getElementById("logout")) {
	document.getElementById("logout").onclick = function () {
		window.location = "login.html";
	};
}
if (document.querySelector("#nav-menu > div > div.d-flex > a:nth-child(2) > i")) {
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
				<button type="button" class="btn btn-danger" data-bs-toggle="modal" data-bs-target="#add">Buy</button>
					</div>
				</div>
				
			</div>
				`;
				document.querySelector(
					"#buy-modal > div > div > div.modal-body > div > div > div:nth-child(2) > button.btn.btn-danger"
				).onclick = function () {
					document.querySelector("#add > div > div > div.modal-body").innerHTML = `
					<div class="container">
					<h3 class="text-center m-3">Shipping Details</h3>
				<form action="#">
					<div class="row">
						<div class="col-3">
							<label for="name">Name</label>
							<br />
							<label for="address">Address</label>
							<br />
							<label for="city">City/Suburb</label>
							<br />
							<label for="state">State</label>
							<br />
							<label for="code">Postal Code</label>
							<br />
							<label for="country">Country</label>
						</div>
						<div class="col-9">
							<input type="text" name="name" />
							<br />
							<input type="text" name="address" />
							<br />
							<input type="text" name="city" />
							<br />
							<input type="text" name="state" />
							<br />
							<input type="text" name="code" />
							<br />
							<input type="text" name="country" />
						</div>
					</div>
					<button type="button" class="btn btn-success m-5" data-bs-toggle="modal" data-bs-target="#buy-modal">Proceed to phayment</button>
				</form>
			</div>
					`;
					document.querySelector("#add > div > div > div.modal-body > div > form > button").onclick = buy();
				};
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
					<button id="buy" type="button" class="btn btn-primary"data-bs-toggle="modal" data-bs-target="#buy-modal">place Order</button>
						</div>
					</div>
					
				</div>
					`;
					document.querySelector("#buy").onclick = function () {
						document.querySelector(
							"#buy-modal > div > div > div.modal-body"
						).innerHTML = `<div class="container">
						<h3 class="text-center m-3">Shipping Details</h3>
					<form action="#">
						<div class="row">
							<div class="col-3">
								<label for="name">Name</label>
								<br />
								<label for="address">Address</label>
								<br />
								<label for="city">City/Suburb</label>
								<br />
								<label for="state">State</label>
								<br />
								<label for="code">Postal Code</label>
								<br />
								<label for="country">Country</label>
							</div>
							<div class="col-9">
								<input type="text" name="name" />
								<br />
								<input type="text" name="address" />
								<br />
								<input type="text" name="city" />
								<br />
								<input type="text" name="state" />
								<br />
								<input type="text" name="code" />
								<br />
								<input type="text" name="country" />
							</div>
						</div>
						<button type="button" class="btn btn-success m-5" data-bs-toggle="modal" data-bs-target="#add">Proceed to phayment</button>
					</form>
				</div>
						`;
						document.querySelector(
							"#buy-modal > div > div > div.modal-body > div > form > button"
						).onclick = function () {
							document.querySelector(
								"#add > div > div > div.modal-body"
							).innerHTML = `<div class="container">
							<form action="">
								<div class="row">
									<div class="col-3">
										<label for="type"> Type </label>
									</div>
									<div class="col-9">
										<select name="type" id="">
											<option value="visa">Visa</option>
											<option value="mastercard">mastercard</option>
										</select>
									</div>
								</div>
								<div class="row">
									<div class="col-3">
										<label for="number"> Number </label>
									</div>
									<div class="col-9"><input type="number" name="number" /></div>
								</div>
								<div class="row">
									<div class="col-3">
										<label for="date">Expriy Date</label>
									</div>
									<div class="col-9">
										<input type="month" name="date" min="2022-03" value="2022-01" />
									</div>
								</div>
								<div class="row">
									<div class="col-3">
										<label for="name">Name on Card</label>
									</div>
									<div class="col-9">
										<input type="text" name="name" />
									</div>
								</div>
								<div class="row">
									<div class="col-3">
										<input type="checkbox" name="paypal" />
									</div>
									<div class="col-9">
										<label for="paypal">Paypal</label>
									</div>
								</div>
								<div class="row">
									<div class="col-3">
										<input type="checkbox" name="cash" />
									</div>
									<div class="col-9">
										<label for="cash">Cash on Delivery</label>
									</div>
								</div>
							</form>
							
							<button type="button" class="btn btn-success m-3" data-bs-dismiss="modal">Confim Order</button>
						</div>`;
						};
					};
					document.querySelector("#remove").onclick = function () {
						document.querySelector("#buy-modal > div > div > div.modal-body").innerHTML = `
						<h3>No items show in the cart</h3>
						<button type="button" class="btn btn-success" data-bs-dismiss="modal">continues to page</button>
				`;
					};
				};
				function buy() {
					document.querySelector(
						"#buy-modal > div > div > div.modal-body"
					).innerHTML = `<div class="container">
						<form action="">
							<div class="row">
								<div class="col-3">
									<label for="type"> Type </label>
								</div>
								<div class="col-9">
									<select name="type" id="">
										<option value="visa">Visa</option>
										<option value="mastercard">mastercard</option>
									</select>
								</div>
							</div>
							<div class="row">
								<div class="col-3">
									<label for="number"> Number </label>
								</div>
								<div class="col-9"><input type="number" name="number" /></div>
							</div>
							<div class="row">
								<div class="col-3">
									<label for="date">Expriy Date</label>
								</div>
								<div class="col-9">
									<input type="month" name="date" min="2022-03" value="2022-01" />
								</div>
							</div>
							<div class="row">
								<div class="col-3">
									<label for="name">Name on Card</label>
								</div>
								<div class="col-9">
									<input type="text" name="name" />
								</div>
							</div>
							<div class="row">
								<div class="col-3">
									<input type="checkbox" name="paypal" />
								</div>
								<div class="col-9">
									<label for="paypal">Paypal</label>
								</div>
							</div>
							<div class="row">
								<div class="col-3">
									<input type="checkbox" name="cash" />
								</div>
								<div class="col-9">
									<label for="cash">Cash on Delivery</label>
								</div>
							</div>
						</form>
						
						<button type="button" class="btn btn-success m-3" data-bs-dismiss="modal">Confim Order</button>
					</div>`;
				}
			};
		}
	}
}

// ----------------------------------------------------------------
if (document.querySelector("#download > h3")) {
	document.querySelector("#download > h3").onclick = function () {
		document.querySelector("#myModal > div > div > div.modal-body").innerHTML = `<div class="container">
		<form action="" id="form-add">
			<label for="name">Name</label>
			<br />
			<input type="text" name="name" />
			<br />
			<label for="img">Image</label>
			<br />
			<input type="text" name="img" />
			<br />
			<label for="price">Price</label>
			<br />
			<input type="text" name="price" />
			<br />
			<label for="category">Category</label>
			<br />
			<input type="text" name="category" />
		</form>
		<br />
		<button type="button" class="btn btn-danger" data-bs-dismiss="modal">Add</button>
	</div>`;
	};
}
if (document.querySelector("#bill-history > div > div > div > div > div")) {
	let edit = document.querySelectorAll("#bill-history > div > div > div > div > div");
	for (let i of edit) {
		i.querySelector(".cart").onclick = function () {
			let img = i.querySelector(".card-img-top").src;
			let category = i.querySelector(".heading-note").innerHTML;
			let cardTitle = i.querySelector(".card-title").innerHTML;
			let cardPrice = i.querySelector(".card-price").innerHTML;
			document.querySelector("#myModal > div > div > div.modal-body").innerHTML = `<div class="container">
		<form action="" id="form-add">
			<label for="name">Name</label>
			<br />
			<input type="text" name="name" value="${cardTitle}"/>
			<br />
			<label for="img">Image</label>
			<br />
			<input type="text" name="img"value="${img}"/>
			<br />
			<label for="price">Price</label>
			<br />
			<input type="text" name="price" value="${cardPrice}"/>
			<br />
			<label for="category">Category</label>
			<br />
			<input type="text" name="category" value="${category}"/>
		</form>
		<br />
		<button type="button" class="btn btn-danger" data-bs-dismiss="modal">Update</button>
	</div>`;
		};
	}
}
if (document.querySelector("#edit-profile > div > div > div > div > div")) {
	let edit = document.querySelectorAll("#edit-profile > div > div > div > div > div");
	for (let i of edit) {
		i.querySelector(".cart").onclick = function () {
			let img = i.querySelector(".card-img-top").src;
			let category = i.querySelector(".heading-note").innerHTML;
			let cardTitle = i.querySelector(".card-title").innerHTML;
			let cardPrice = i.querySelector(".card-price").innerHTML;
			document.querySelector("#myModal > div > div > div.modal-body").innerHTML = `<div class="container">
		<form action="" id="form-add">
			<label for="name">Name</label>
			<br />
			<input type="text" name="name" value="${cardTitle}"/>
			<br />
			<label for="img">Image</label>
			<br />
			<input type="text" name="img"value="${img}"/>
			<br />
			<label for="price">Price</label>
			<br />
			<input type="text" name="price" value="${cardPrice}"/>
			<br />
			<label for="category">Category</label>
			<br />
			<input type="text" name="category" value="${category}"/>
		</form>
		<br />
		<button type="button" class="btn btn-danger" data-bs-dismiss="modal">Delete</button>
	</div>`;
		};
	}
}

// angular

var app = angular.module("myapp", []);
app.controller("myctrl", function ($scope) {
	$scope.a = "xinchao";
});
