window.addEventListener("load", function(){

    document.getElementById("inp-pret").oninput = function(){
        document.getElementById("infoRange").innerHTML = 
            "("+ parseFloat(this.value).toFixed(2) + " Lei)";
    }

    document.getElementById("i_textarea").oninput = function() {
        if(!this.value.toLowerCase().trim().match(new RegExp("^[a-zA-Z\- 0-9]*$"))) {
            this.classList.add("is-invalid");
        } else {
            this.classList.remove("is-invalid");
        }
    }

    document.getElementById("inp-nume").oninput = function() {
        if(!this.value.toLowerCase().trim().match(new RegExp("^[a-zA-Z\- ]*$"))) {
            this.classList.add("is-invalid");
        } else {
            this.classList.remove("is-invalid");
        }
    }

    document.getElementById("filtrare").onclick = function(){
        //verificare input-uri
        condValidare = true;
        var inpNume = document.getElementById("inp-nume").value.toLowerCase().trim();
        var inpTextarea = document.getElementById("i_textarea").value.toLowerCase().trim();

        // condValidare = condValidare && inpNume.match(new RegExp("^[a-zA-Z\- ]*$")) //&& inpTextarea.match(new RegExp("^[a-zA-Z\- 0-9]*$"));

        var inpCategorie = document.getElementById("inp-categorie").value;
        var inpPret = document.getElementById("inp-pret").value;
        var inpCheck = document.getElementsByClassName("inp-check");
        var radioTrue= document.getElementById("trueStoc");
        var radioFalse= document.getElementById("falseStoc");
        var radioAll = document.getElementById("toateStoc");
        var inpDatalist = document.getElementById("i_datalist").value;
        var optAutori = document.getElementById("i_sel_multiplu").options;

        nrProd = 0;
        var produse = document.getElementsByClassName("produs");
        for(let produs of produse){
            var cond1 = false, cond2 = false, cond3 = false, cond4 = false, cond5 = false, cond6 = false, cond7 = false, cond8 = false;
            produs.style.display = "none";

            let autori = produs.getElementsByClassName("val-autori")[0].innerHTML.toLowerCase().trim();
            if(autori.includes(inpNume)) var cond1 = true;
            

            let categorie = produs.getElementsByClassName("val-categorie")[0].innerHTML;
            if(inpCategorie == "toate" || categorie == inpCategorie) var cond2 = true;
            

            let pret = produs.getElementsByClassName("val-pret")[0].innerHTML;
            if(pret >= inpPret) var cond3 = true;


            let subopt = produs.getElementsByClassName("val-subopt")[0].innerHTML;
            for(let ckBox of inpCheck){
                labelBox = ckBox.previousElementSibling.innerHTML.trim();
                if(ckBox.checked && labelBox == subopt) 
                    var cond4 = true;
            }


            let stoc = produs.getElementsByClassName("val-stoc")[0].innerHTML.toLowerCase().trim();
            if(radioAll.checked || (radioTrue.checked && stoc == "disponibil") || (radioFalse.checked && stoc == "indisponibil"))
                var cond5 = true;


            let data_publicare = produs.getElementsByClassName("val-data")[0];
            if(data_publicare.classList.contains(inpDatalist) || inpDatalist.trim().length == 0)
                var cond6 = true;


            let descriere = produs.getElementsByClassName("val-descriere")[0].innerHTML.toLowerCase().trim();
            if(descriere.includes(inpTextarea)) 
                var cond7 = true;


            var cond8 = true;
            for(let opt of optAutori){
                if(opt.selected && autori.includes(opt.value.toLowerCase()))
                    var cond8 = false;
            }


            if(cond1 && cond2 && cond3 && cond4 && cond5 && cond6 && cond7 && cond8){
                produs.style.display = "block";
                nrProd += 1;
            }

        }

        
        if(!nrProd) {
            
            if(!document.getElementById("mesaj")) {
                mesaj = document.createElement("p");
                mesaj.id = "mesaj";
                mesaj.innerHTML = "Niciun produs nu corespunde filtrării!";
    
                var prod = document.getElementById("produse")
                prod.appendChild(mesaj);
                mesaj.style = `
                    text-align: center;
                    font-size: 1.2rem;
                    color: var(--culoare-avertizare);
                    font-weight: bold;
                `}
        } else {
            if(document.getElementById("mesaj")) {
                document.getElementById("mesaj").remove();
            }
        }
    }

    document.getElementById("resetare").onclick = function(){
        // resetare produse
        var produse = document.getElementsByClassName("produs");
        for(let produs of produse){
            produs.style.display = "block";
        }

        // resetare filtre
        document.getElementById("inp-nume").value = "";
        document.getElementById("inp-nume").classList.remove("is-invalid");
        document.getElementById("sel-toate").selected = true;
        document.getElementById("toateStoc").checked = true;
        document.getElementById("i_datalist").value = "";
        document.getElementById("inp-pret").value = document.getElementById("inp-pret").min;
        document.getElementById("infoRange").innerHTML = 
            "("+ parseFloat(document.getElementById("inp-pret").value).toFixed(2) + " Lei)";
        for(let opt of document.getElementById("i_sel_multiplu").options){opt.selected = false;}
        document.getElementById("i_textarea").value = "";
        document.getElementById("i_textarea").classList.remove("is-invalid");
        for (elem of document.getElementsByClassName("inp-check")) elem.checked = true;
    }

    function sorteaza(semn){
        var produse = document.getElementsByClassName("produs");
        var v_produse = Array.from(produse);
        v_produse.sort(function(a, b){
            var coperta_a = a.getElementsByClassName("val-subopt")[0].innerHTML;
            var coperta_b = b.getElementsByClassName("val-subopt")[0].innerHTML;

            if(coperta_a.localeCompare(coperta_b) == 0){
                var pret_a = parseFloat(a.getElementsByClassName("val-pret")[0].innerHTML);
                var pret_b = parseFloat(b.getElementsByClassName("val-pret")[0].innerHTML);
                return semn*(pret_a - pret_b);
            }

            return semn*(coperta_a.localeCompare(coperta_b));
        });

        for(let produs of v_produse){
            produs.parentNode.appendChild(produs);
        }
    }

    document.getElementById("sortCrescNume").onclick = function(){
        sorteaza(1);
    }

    document.getElementById("sortDescrescNume").onclick = function(){
        sorteaza(-1);
    }

    document.getElementById("calculare").onclick = function(){
        var produse = document.getElementsByClassName("produs");
        let suma = 0, nr_prod = 0;
        for(let prod of produse) {
            if(prod.style.display != "none"){
                suma += parseFloat(prod.getElementsByClassName("val-pret")[0].innerHTML)
                nr_prod += 1;
            }
        }

        suma = suma / nr_prod;

        if(!document.getElementById("rezultat")) {
            rezultat = document.createElement("div");
            rezultat.id = "rezultat";
            rezultat.innerHTML = "Media prețurilor: " + suma.toFixed(2) + " Lei";

            var ps = document.getElementById("butoaneFiltrare");
            ps.parentNode.insertBefore(rezultat, ps);
            rezultat.style = `
                position: fixed;
                top: 60px;
                right: 50px;
                z-index: 20;
                padding: 0.5rem;
                box-shadow: 0 0 0.3rem var(--culoare-icon-circle);
                background-color: var(--culoare-bg);
                border: 1px solid var(--culoare-circle);
                border-radius: 0.5rem;
                color: var(--culoare-icon-circle);
            `
            // rezultat.onclick = function() {
            //     this.remove();
            // }

            setTimeout(function(){
                document.getElementById("rezultat").remove();
            }, 2000);
        }
    }


    // window.onkeydown = function(e){
    //     console.log(e);
    //     if(e.key == 'c' && e.altKey){
    //         var produse = document.getElementsByClassName("produs");
    //         let suma = 0;
    //         for(let prod of produse) {
    //             if(prod.style.display != "none")
    //                 suma += parseFloat(prod.getElementsByClassName("val-pret")[0].innerHTML)
    //         }
    //         if(!document.getElementById("rezultat")) {
    //             rezultat = document.createElement("p");
    //             rezultat.id = "rezultat";
    //             rezultat.innerHTML = "Pret total: " + suma;
    //             // document.getElementById("produse").appendChild(rezultat);

    //             var ps = document.getElementById("p-suma");
    //             ps.parentNode.insertBefore(rezultat, ps.nextSibling);
    //             rezultat.style.border = "1px solid purple"
    //             rezultat.onclick = function() {
    //                 this.remove();
    //             }

    //             setTimeout(function(){
    //                 document.getElementById("rezultat").remove();
    //             }, 2000);
    //         }

    //     }
    // }
});