let app = angular.module("myapp", []);
app.controller("app", ($scope, $http) => {
	$scope.cart = [];
	$scope.arrProduct = [];
	$scope.begin = 0;

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
	$scope.buyModal=(s)=>{
		$scope.buy = $scope.arrProduct.find((item, index) => {
			return item._id == s;
		});

	}
	$scope.delcart = () => {
				$scope.cart = [];
				$scope.sum = 0;
				$scope.cartSl = $scope.cart.length;
				Swal.fire(
					'Đã xoá toàn bộ giỏ hàng',
					'Vui lòng nhấn nút để thoát',
					'success'
				  )
	};
	$scope.order = () => {
		if ($scope.cart.length != 0) {
			
			(async () => {
				
				const { value: address } = await Swal.fire({
				  title: 'Tổng giá trị đơn hàng:'+$scope.sum+" $",
				  input: 'text',
				  inputLabel: 'Địa chỉ nhận hàng của bạn',
				  inputPlaceholder: 'Nhập địa chỉ nhận hàng'
				})
				
				if (address) {
				
				  Swal.fire(`Đơn hàng của bạn sẽ được giao tới: ${address}. <br> Trong vòng 7 ngày kể từ ngày đặt hàng`)
				}
				
				})()
		} else {
			alert("Vui lòng chọn sản phẩm");
		}
	};

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
	
});
app.controller('login',($scope,$http)=>{
	$scope.test="hello world";
})
