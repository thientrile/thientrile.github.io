let toggle =document.querySelector('.toggle');
let navigation = document.querySelector('.navigation');
toggle.addEventListener('click', function(){
    toggle.classList.toggle('active');
    navigation.classList.toggle('active');
})

window.addEventListener('scroll', function(){
    var x=window.pageYOffset;
   console.log(x);
})