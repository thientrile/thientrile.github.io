let buttons=document.querySelector('.buttons');
let btns=document.querySelectorAll('span');
let value=document.getElementById('value');
let toggleBtn=document.querySelector('.toggleBtn');
let body=document.querySelector('body');
for (let i=0; i<btns.length; i++)
{
    btns[i].addEventListener('click', function() {
        if(this.innerHTML=="=")
        {
            value.value=eval(value.value);
        }
        else if(this.innerHTML=="Clear"){
            value.value="";
        }

        else if(this.innerHTML=="DEL")
        {
            value.value=value.value.slice(0,-1);
        }
        else if(this.innerHTML=="%"){
            value.value=eval(value.value*(1/100))
        }
        else 
        {
            if(value.value=="undefined"||value.value=="Infinity"||value.value=="NaN")
            {
                value.value="";
            }
            else
            {

                value.value+=this.innerHTML;
                // value.value=value.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }

        }
    });
}
toggleBtn.onclick=function() {
    body.classList.toggle('dark')
};
function numberWithCommas(x) {
    x = x.toString();
    const pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(x))
        x = x.replace(pattern, "$1,$2");
    return x;
}