// Menu mobile
var header= document.getElementById('header');
var mobileMenu= document.getElementById('mobile-menu');
var headerHeight =header.clientHeight;
// open/ close menu mobile
mobileMenu.onclick = function()
{
    var isClose = header.clientHeight === headerHeight;
    if (isClose) 
    {
        header.style.height = 'auto';
    }
    else
    {
        header.style.height = null;
    }
}
// Auto close menu mobile
var menuItems = document.querySelectorAll('#nav li a[href*="#"]');
for (var i = 0; i < menuItems.length; i++) 
{
   
    
    var item = menuItems[i];
    var isParentMenu =this.item.nextElementSibling &&  this.item.nextElementSibling.classList.contains('subnav');
    console.log(isParentMenu);
    item.onclick = function(Event) {
        var isParentMenu = this.nextElementSibling && this.nextElementSibling.classList.contains('subnav');
        if (isParentMenu) {
            event.preventDefault();
        }
        else {
            header.style.height = null; 
        }
    }       
}



// ***********************************
// Modal
const buyBnts = document.querySelectorAll('.js-buy-ticket')
const modal = document.querySelector('.modal')
const modalcontent = document.querySelector('.js-modal')
const modalClose = document.querySelector('.close')
//hàm hiện thị modal mua vé(thêm class open vào modal)
function showBuyTickets(){
    modal.classList.add('open')
}
//hàm ẩn modal mua vé(loại bỏ class open vào modal)
function hideBuyTickets(){
    modal.classList.remove('open')
}
//lặp qua từng thẻ button và nghe hành vi click
for(const buyBtn of buyBnts){
    buyBtn.addEventListener('click', showBuyTickets)
}
//lắng nghe sự kiện click vào nút close
modalClose.addEventListener('click', hideBuyTickets)
modal.addEventListener('click', hideBuyTickets)
modalcontent.addEventListener('click', function (event) {
    event.stopPropagation()
})