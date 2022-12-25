// const e = require("express");


function setCookie(nume, val, timpExpirare){
    //timpExpirare in ms
    // timpExpirare = 5000;
    // d = new Date();
    // d.setTime(d.getTime() + timpExpirare)

    //timp expirare in nr de zile
    d = new Date();
    d.setDate(d.getDate() + timpExpirare);

    document.cookie = `${nume}=${val}; expires=${d.toUTCString()}`;
}

function getCookie(nume){
    vectorParametri = document.cookie.split(";"); // ["a=10", "b=ceva"]
    for(let param of vectorParametri){
        if(param.trim().startsWith(nume+"="))
            return param.split("=")[1];
    }
    return null;
}

function deleteCookie(nume){
    document.cookie = `${nume}=0; expires=${(new Date()).toUTCString()}`
}

function deleteAllCookies() {
    allCookies = document.cookie.split(';');
    for (c of allCookies) {
        nume = c.split('=')[0].trim();
        deleteCookie(nume);
    }
}

window.addEventListener("load", function(){
    document.getElementById("banner").style.display = "flex";
    if(this.window.innerWidth > 1000)
        document.getElementById("banner").style.animation = "5s 1 forwards animatie_cookie";
    else 
        document.getElementById("banner").style.animation = "none";


    if(getCookie("acceptatBanner")){
        document.getElementById("banner").style.display = "none";
    }

    document.getElementById("ok_cookie").onclick = function() {
        setCookie("acceptatBanner", true, 7);
        document.getElementById("banner").style.display = "none";
    }


    // Retinerea ultimului produs accesat
    // si incarcarea lui la pagina de produse
    if(window.location.pathname.split("/")[1] == "produs"){
        ultProd = getCookie("ultProd");
        penultProd = getCookie("penultProd");

        titlu = document.getElementsByClassName("titlu")[0].innerHTML;
        poza = document.getElementsByClassName("imag-produs")[0].getElementsByTagName('img')[0].src;
        pret = document.getElementsByClassName("pret")[0].innerHTML.split(" ")[0];
        cale = window.location.pathname;
        val = `${titlu}*${poza}*${pret}*${cale}`;

        // console.log(val);
        // console.log(ultProd);
        // console.log(penultProd);


        if(!ultProd || !penultProd) {
            setCookie("penultProd", val, 1);
            setCookie("ultProd", val, 1);

        } else if(ultProd != val) {
            elemProd = ultProd.split("*");
            // se afiseaza ultimul produs
            document.getElementById("ultTitlu").innerHTML = elemProd[0];
            document.getElementById("ultPoza").src = elemProd[1]; 
            document.getElementById("ultPret").innerHTML = elemProd[2] + " Lei";
            document.getElementById("ultLink").href = elemProd[3];

            // se actualizeaza cookie-urile
            setCookie("penultProd", ultProd, 1);
            setCookie("ultProd", val, 1);

            this.document.getElementById("ultimulProdus").style.display = "block";

            
        } else if(penultProd != val) {
            this.document.getElementById("ultimulProdus").style.display = "block";

            elemProd = penultProd.split("*");
            // se afiseaza penultimul produs
            document.getElementById("ultTitlu").innerHTML = elemProd[0];
            document.getElementById("ultPoza").src = elemProd[1]; 
            document.getElementById("ultPret").innerHTML = elemProd[2] + " Lei";
            document.getElementById("ultLink").href = elemProd[3];

        }
        
    }
});