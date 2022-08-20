//checked frist name
var kt=[0,0,0,0,0,0,0]
var boolean=false;
var fristName=document.getElementById("fristname");
fristName.addEventListener("input",function(){
    let validation =document.querySelector("#checkfristname");
    let valid = document.querySelector("#check-fristname")
    let checked=document.querySelector(" span.fristname.checked");
    let data=fristName.value;
    if(data.length>0){
        valid.classList.add('valid');
        valid.classList.remove('invalid');  
        kt[0]=1
        checked.classList.add('true');
         checked.classList.remove('false');
        setTimeout(()=>{validation.style.display="none"; },500); 
    }
    else
    {
        valid.classList.remove('valid');
        kt[0]=0;

        validation.style.display="block";
        checked.classList.remove('true');
        checked.classList.add('false');
    }
    
})
// checked last name
var lastName=document.getElementById("lastname");
lastName.addEventListener("input",function(){
    let validation =document.querySelector("#checklastname");
    let valid = document.querySelector("#check-lastname")
    let checked=document.querySelector(" span.lastname.checked");
    let data=lastName.value;
    if(data.length>0){
        valid.classList.add('valid');
        kt[1]=1        
        checked.classList.add('true');
         checked.classList.remove('false');
        setTimeout(()=>{validation.style.display="none"; },500); 
    }
    else
    {
        valid.classList.remove('valid');
        kt[1]=0;

        validation.style.display="block";
        checked.classList.remove('true');
        checked.classList.add('false');
    }
    
})

//checked userName 
var userName=document.getElementById("userName");
userName.addEventListener("input",function(){
    let validation =document.querySelector("#checkusername");
    let valid = document.querySelector("#check-username")
    let checked=document.querySelector(" span.username.checked")
    let data=userName.value;
    if(data.length>0){
        valid.classList.add('valid');
        kt[2]=1        
        checked.classList.add('true');
         checked.classList.remove('false');
        setTimeout(()=>{validation.style.display="none"; },500); 
    }
    else
    {
        valid.classList.remove('valid');
        kt[2]=0;

        validation.style.display="block";
        checked.classList.remove('true');
        checked.classList.add('false');
    }
    
})
//checked Email
var email=document.querySelector("#email")
email.addEventListener("input",function(){
    let validation =document.querySelector("#checkemail");
    let valid = document.querySelector("#check-mail")
    let checked=document.querySelector(" span.email.checked")
    let data=email.value;
    const checkEmail= /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if(data.match(checkEmail)){
        valid.classList.add('valid');
        kt[3]=1        
        checked.classList.add('true');
         checked.classList.remove('false');
        setTimeout(()=>{validation.style.display="none"; },500); 
        console.log('true');
    }
    else
    {
        valid.classList.remove('valid');
        kt[3]=0;

        validation.style.display="block";
        checked.classList.remove('true');
        checked.classList.add('false');
        

        

    }
})
// checked phone
var phone =document.getElementById('phone');
phone.addEventListener('input',function(){
    let validation =document.querySelector("#checkphone");
    let valid=document.querySelector("#check-phone")
    let checked=document.querySelector(" span.phone.checked")
    let data=phone.value;
    const checkphone=/([\+84|84|0]+(3|5|7|8|9|1[2|6|8|9]))+([0-9]{8})\b/;
    if(data.match(checkphone)){
        valid.classList.add('valid');
        kt[4]=1        
        checked.classList.add('true');
         checked.classList.remove('false');
        setTimeout(()=>{validation.style.display="none"; },500);
    }
    else
    {
        valid.classList.remove('valid');
        kt[4]=0;

        validation.style.display="block";
        checked.classList.remove('true');
        checked.classList.add('false');
    }    
        
})

//hidden visible password
var password=document.querySelector("#password")
let togglePass=document.querySelector("#togle-pass")
togglePass.onclick=function(){
    if(password.type==='password'){
        password.setAttribute('type','text')
        togglePass.classList.add('hidden')
    }
    else
    {
        password.setAttribute('type','password')
        togglePass.classList.remove('hidden')
    }
}
var repassword= document.querySelector("#re-password");
let toggleRepass=document.querySelector("#togle-repass")
toggleRepass.onclick=function(){
    if(repassword.type==='password'){
        repassword.setAttribute('type','text')
       toggleRepass.classList.add('hidden')
    }
    else
    {
        repassword.setAttribute('type','password')
       toggleRepass.classList.remove('hidden')


    }
}











//điều kiện khi nhập pass words
password.addEventListener('input',function(){
    let lowerCase=document.getElementById('lower')
    let upperCase=document.getElementById('upper');
    let dight=document.getElementById('number');
    let specialChar=document.getElementById('special');
    let minLength=document.getElementById('length');
    let validation=document.querySelector("#checkedpass")
    let checked=document.querySelector("span.pass.checked")
    let data=password.value; 
    // khai báo RegExp
    const lower = new RegExp('(?=.*[a-z])');
    const upper = new RegExp('(?=.*[A-Z])');
    const number = new RegExp('(?=.*[0-9])');
    const special=new RegExp('(?=.*[!@#\$%\^&\*])')
    const length=new RegExp('(?=.{8,})');        
    //set điều kiện
    if(lower.test(data))
    {
        lowerCase.classList.add('valid');
        

    }
    else
    {
        lowerCase.classList.remove('valid');
    }
    // upper case validation checkPassword
    if(upper.test(data))    
    {
        upperCase.classList.add('valid');
    }
    else
    {
        upperCase.classList.remove('valid');  
    }
    // number checkPassword
    if(number.test(data))
    {
        dight.classList.add('valid');   
    }
    else
    {
        dight.classList.remove('valid');
    }
    // special case validation checkPassword
    if(special.test(data))
    {
        specialChar.classList.add('valid');
    }
    else
    {
        specialChar.classList.remove('valid');
    }
    //  length case validation checkPassword    
    if(length.test(data))
    {
        minLength.classList.add('valid');
    }
    else
    {
        minLength.classList.remove('valid');
    }
    if(document.querySelector('#lower.valid')&&document.querySelector('#upper.valid')&&document.querySelector('#number.valid')&&document.querySelector('#special.valid')&&document.querySelector('#length.valid'))
    {
        checked.classList.add('true');
        kt[5]=1;
         checked.classList.remove('false');
        setTimeout(()=>{validation.style.display="none"; },500);           
    }
    else
    {
        kt[5]=0;
        validation.style.display="block"; 
        checked.classList.remove('true');
        checked.classList.add('false');
    }
})
//RE PASSWORD CHECK
var repassword= document.querySelector("#re-password");
repassword.addEventListener("input",function(){
    let validation=document.querySelector("#checkedrepass")
    let checked=document.querySelector("span.repass.checked")
    let repass=document.getElementById('repass');
    let data=this.value;
    let pass=document.getElementById('password').value;
    console.log(pass);
    if(pass===data){
        repass.classList.add('valid');
        checked.classList.add('true');
         checked.classList.remove('false');
        setTimeout(()=>{validation.style.display="none"; },500); 
        kt[6]=1;
        
    }
    else
    {
        repass.classList.remove('valid');
        kt[6]=0;

        validation.style.display="block";
        checked.classList.remove('true');
        checked.classList.add('false');
    }
    
});
let signBtn=document.querySelector('.btn-sign');
signBtn.onclick=function(){
    let validation=document.querySelectorAll('.validation')
    let checked=document.querySelectorAll('.checked');
    for(let i=0;i<kt.length;i++){
        if(kt[i]==0)
        {
        validation[i].style.display="block"; 
        checked[i].classList.remove('true');
        checked[i].classList.add('false');
        }
    }
}




