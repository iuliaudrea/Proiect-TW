

function setCookie(nume, val, timpExpirare){
    //timpExpirare in ms
    d = new Date();
    d.setTime(d.getTime() + timpExpirare)
    document.cookie = `${nume}=${val}; expires=${d.toUTCString()}`;
}

function getCookie(nume){
    vectorParametri = document.getCookie.split(";"); // ["a=10", "b=ceva"]
    for(let param of vectorParametri){
        if(param.trim().startsWith(nume+"="))
            return param.split("=")[1];
    }
    return null;
}

function deleteCookie(nume){
    document.cookie = `${nume}=0; expires=${(new Date()).toUTCString()}`
}

window.addEventListener("load", function(){
    if(getCookie("acceptatBanner")){
        document.getElementById("banner").style.display = "none";
    }

    document.getElementById("ok_cookies").onclick = function() {
        setCookie("acceptatBanner", true, 60000);
        document.getElementById("banner").style.display = "none";
    }
});