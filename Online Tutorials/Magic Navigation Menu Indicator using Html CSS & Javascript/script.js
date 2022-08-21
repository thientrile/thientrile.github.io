const lists=document.querySelectorAll('.list');
function activeLink(){
    lists.forEach((item)=>
    item.classList.remove('active'));
    this.classList.add('active');
}
lists.forEach((item)=>item.addEventListener('click', activeLink));