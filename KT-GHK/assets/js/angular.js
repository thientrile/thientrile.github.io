let app = angular.module("myapp", ["ngRoute"]);
app.config(($routeProvider) => {
	$routeProvider
		.when("/shop", { templateUrl: "assets/view/shop.html" })
		.when("/login", { templateUrl: "assets/view/login.html" })
		.when("/user", { templateUrl: "assets/view/user.html" })
		.when("/admin", { templateUrl: "assets/view/admin.html" })
		.when("/:id", { templateUrl: "assets/view/product.html?" +Math.random()})

		.otherwise({ templateUrl: "assets/view/home.html" });
});
app.filter("between", function () {
	return function (input, min, max) {
		var output = [];
		if(min==null && max==null)
		{
			return input;
		}
		for (let i of input) {
			if (i.price[i.price.length - 1] >= min && i.price[i.price.length - 1] <= max) {
				output.push(i);
			}
		}
		return output;
	};
});
app.controller("app", ($scope, $http, $routeParams, $route) => {
	
	$scope.account = [];
	$http.get("assets/json/account.json").then(
		(response) => {
			$scope.account = response.data;
		},
		(response) => {
			alert("Không tìm thấy dữ liệu");
		}
	);
	$scope.cookies = [];
	$scope.logerr;
	$scope.btnlogin = (logemail, logpass) => {
		$scope.cookies = $scope.account.filter((i, d) => {
			return i.email == logemail && i.password == logpass;
		});
		console.log($scope.cookies);
		if ($scope.cookies.length != 0) {
			for (let i of $scope.cart) {
				$scope.cookies[0].cart.push(i);
			}
			$scope.cart = $scope.cookies[0].cart;
			$scope.cartSl = $scope.cart.length;
			for (let i of $scope.cart) {
				$scope.sum += i.price * i.sl;
			}
			if ($scope.cookies[0].decentralization == 0) {
				window.location.href = "#!/user";
			} else {
				window.location.href = "#!/admin";
			}
			$scope.checkcookies = false;
			$scope.logerr = "";
		} else {
			$scope.logerr = "Email and password are incorrect";
		}
	};
	$scope.checkcookies = true;
	$scope.signerr;
	$scope.btnsigin = (signname, signemail, signpwd) => {
		if (signname != "" && signemail != "" && signpwd != "") {
			let temp = $scope.account.filter((i, d) => {
				return i.email == signemail;
			});
			if (temp.length == 0) {
				$scope.account.push({
					_id: Math.random().toString(16).slice(2),
					fullname: signname,
					email: signemail,
					password: signpwd,
					decentralization: 0,
					history: [],
					cart: [],
				});
				Swal.fire("Đăng ký thành công", "Vui lòng nhấn nhút login để đăng nhập", "success");

				$scope.signerr = "";
			} else {
				$scope.signerr = "Already use this email to register";
			}
		}
	};
	$scope.btnlogout = () => {
		let index = $scope.account.findIndex((i, d) => {
			return i._id == $scope.cookies[0]._id;
		});
		$scope.account[index].fullname = $scope.cookies[0].fullname;
		$scope.account[index].email = $scope.cookies[0].email;
		$scope.account[index].password = $scope.cookies[0].password;
		$scope.account[index].decentralization = $scope.cookies[0].decentralization;
		$scope.account[index].history = $scope.cookies[0].history;
		$scope.account[index].cart = $scope.cart;

		$scope.cart = [];
		$scope.sum = 0;
		$scope.cartSl = $scope.cart.length;
		$scope.cookies = [];
		$scope.checkcookies = true;
		window.location.href = "#!/user";
	};
	$scope.login = () => {
		if ($scope.cookies.length == 0) {
			window.location.href = "#!/login";
		} else {
			if ($scope.cookies[0].decentralization == 1) {
				window.location.href = "#!/admin";
			} else {
				window.location.href = "#!/user";
			}
		}
	};
	// Quản lý giỏi hàng
	if ($scope.cookies.length == 0) {
		$scope.cart = [];
	}
	$scope.arrProduct = [];
	$scope.cartSl = $scope.cart.length;
	$scope.addCart = (s) => {
		let temp = $scope.arrProduct.find((item, index) => {
			return item._id == s;
		});
		Swal.fire({
			position: "bottom-end",
			icon: "success",
			title: "Đã thêm vào giỏi hàng",
			showConfirmButton: false,
			timer: 1500,
		});
		let index = $scope.cart.findIndex((item, index) => {
			return item._id == s;
		});
		if (index >= 0) {
			$scope.cart[index].sl++;
		} else {
			$scope.cart.push({
				_id: temp._id,
				name: temp.name,
				img: temp.img,
				Category: temp.Category,
				price: temp.price[temp.price.length - 1],
				sl: 1,
			});
		}
		$scope.sum = 0;
		$scope.cartSl = $scope.cart.length;
		for (let i of $scope.cart) {
			$scope.sum += i.price * i.sl;
		}
	};
	$scope.buyModal = (s) => {
		$scope.buy = $scope.arrProduct.find((item, index) => {
			return item._id == s;
		});
	};
	$scope.delcart = () => {
		$scope.cart = [];
		$scope.sum = 0;
		$scope.cartSl = $scope.cart.length;
		Swal.fire("Đã xoá toàn bộ giỏ hàng", "Vui lòng nhấn nút để thoát", "success");
	};
	$scope.order = () => {
		if ($scope.cookies.length == 0) {
			window.location.href = "#!/login";
		} else {
			if ($scope.cart.length != 0) {
				for (let i of $scope.cart) {
					$scope.cookies[0].history.push({
						_id: i._id,
						name: i.name,
						img: i.img,
						Category: i.Category,
						price: i.price,
						sl: i.sl,
						sum: i.price * i.sl,
						date: new Date(),
					});
				}
				(async () => {
					const { value: address } = await Swal.fire({
						title: "Tổng giá trị đơn hàng:" + $scope.sum + " $",
						input: "text",
						inputLabel: "Địa chỉ nhận hàng của bạn",
						inputPlaceholder: "Nhập địa chỉ nhận hàng",
					});

					if (address) {
						Swal.fire(
							`Đơn hàng của bạn sẽ được giao tới: ${address}. <br> Trong vòng 7 ngày kể từ ngày đặt hàng`
						);
					}
				})();
			} else {
				Swal.fire("Giỏ hàng trống", "vui lòng chọn giỏ hàng", "question");
			}
		}
	};
	// Quản lý sản phẩm quyển admin
	$scope.editmodal = (s) => {
		let edit = $scope.arrProduct.find((item, index) => {
			return item._id == s;
		});
		$scope.upId = edit._id;
		$scope.upImg = edit.img;
		$scope.upName = edit.name;
		$scope.upCateg = edit.Category;
		$scope.upDesc = edit.Description;
		$scope.upShort = edit.shortDescription;
		$scope.upTag = edit.tag;
		$scope.upPrice = edit.price.join(",");
	};
	$scope.update = (upId, upName, upImg, upCateg, upDesc, upShort, upPrice, upTag) => {
		let index = $scope.arrProduct.findIndex((item, index) => {
			return item._id == upId;
		});
		// console.log($scope.arrProduct[index]);
		$scope.arrProduct[index].name = upName;
		$scope.arrProduct[index].img = upImg;
		$scope.arrProduct[index].Category = upCateg;
		$scope.arrProduct[index].Description = upDesc;
		$scope.arrProduct[index].shortDescription = upShort;
		$scope.arrProduct[index].tag = upTag;
		$scope.arrProduct[index].price = upPrice.split(",");
	};
	$scope.del = (s) => {
		let index = $scope.arrProduct.findIndex((item, index) => {
			return item._id == s;
		});
		$scope.arrProduct.splice(index, 1);
		Swal.fire("Đã xoá thành công", "Vui lòng nhấn nút để thoát", "success");
	};
	$scope.add = (addName, addImg, addCateg, addDesc, addShort, addPrice, addTag) => {
		$scope.arrProduct.push({
			_id: Math.random().toString(16).slice(2) + new Date().getTime(),
			name: addName,
			img: addImg,
			photoLibrary: [],
			Category: addCateg,
			Description: addDesc,
			shortDescription: addShort,
			tag: addTag,
			price: addPrice.split(","),
		});
	};

	// phân trang sản phẩm
	$scope.begin = 0;
	$scope.pagination = [];
	$http.get("assets/json/sanpham.json").then(
		(response) => {
			$scope.arrProduct = response.data;
			for (i = 0; i < Math.ceil($scope.arrProduct.length / 6); i++) {
				$scope.pagination.push(i);
			}
		},
		(response) => {
			alert("Product JSON Error!");
		}
	);

	$scope.pageItem = (a) => {
		console.log($scope.activeClass);
		// console.log(a);
		if ($scope.begin - 6 >= 0 && a === "pre") {
			$scope.begin -= 6;
		} else if ($scope.begin + 6 < $scope.arrProduct.length && a === "next") {
			$scope.begin += 6;
		} else if (a !== "next" && a !== "pre") {
			$scope.begin = a * 6;
		}
	};

	$scope.upUser = (upname, upemail, checkpws, pwd, npwd) => {
		if (upname != undefined) {
			$scope.cookies[0].fullname = upname;
		}
		if (upemail != undefined) {
			let temp = $scope.account.filter((i, d) => {
				return i.email == signemail;
			});
			if(temp.length==0)
			{

				$scope.cookies[0].email = $scope.upemail;
				$scope.signerr="";
			}
			else
			{
				$scope.signerr = "Already use this email to register";
			}
		}

		if (checkpws == true) {
			if (pwd === $scope.cookies[0].password) {
				$scope.cookies[0].password = npwd;
				$scope.errEdit = "";
			} else {
				$scope.errEdit = "incorrect password";
			}
		}
		Swal.fire(" Congratulation", "Update successful", "success");
	};
	
});
