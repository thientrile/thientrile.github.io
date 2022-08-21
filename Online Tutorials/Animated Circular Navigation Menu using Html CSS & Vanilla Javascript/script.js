let toggle=document.querySelector('.toggle');
let menu=document.querySelector('.menu');
toggle.onclick=function() {
    menu.classList.toggle('active');
}
document.documentElement.style.setProperty('--sl',menu.querySelectorAll('li').length);


