const express = require("express");
const fs = require("fs");
const sharp=require("sharp");
const ejs = require("ejs");
const sass = require("sass");
var cssBootstrap=sass.compile(__dirname+"/resurse/scss/customizare-bootstrap.scss",{sourceMap:true});

fs.writeFileSync(__dirname+"/resurse/css/biblioteci/bootstrap-custom.css",cssBootstrap.css);


app = express();

app.set("view engine", "ejs");
app.use("/resurse", express.static(__dirname + "/resurse"));

obGlobal = {
    erori: null,
    imagini: null
}


function createImages(){
    var continutFisier=fs.readFileSync(__dirname+"/resurse/json/galerie.json").toString("utf8");
    var obiect = JSON.parse(continutFisier);

    var dim_mediu = 400;
    var dim_mic = 300;

    obGlobal.imagini = obiect.imagini;
    obGlobal.imagini.forEach(function(elem){
        // "briose-frisca.png" -> ["briose-frisca", "png"]
        [nume_fisier, extensie] = elem.cale_imagine.split(".");

        if(!fs.existsSync(obiect.cale_galerie + "/mediu/")) {
            fs.mkdirSync(obiect.cale_galerie + "/mediu/")
        }

        if(!fs.existsSync(obiect.cale_galerie + "/mic/")) {
            fs.mkdirSync(obiect.cale_galerie + "/mic/")
        }

        elem.fisier_mediu = obiect.cale_galerie + "/mediu/" + nume_fisier + ".webp";
        elem.fisier_mic = obiect.cale_galerie + "/mic/" + nume_fisier + ".webp";


        elem.fisier = obiect.cale_galerie +"/" + elem.cale_imagine;
        sharp(__dirname + "/" + elem.fisier).resize(dim_mediu).toFile(__dirname + "/" + elem.fisier_mediu);
        sharp(__dirname + "/" + elem.fisier).resize(dim_mic).toFile(__dirname + "/" + elem.fisier_mic);

    });


    // console.log(obGlobal.imagini);
}

createImages();

function createErrors() {
    var continutFisier = fs.readFileSync(__dirname + "/resurse/json/erori.json").toString("utf-8");

    obGlobal.erori = JSON.parse(continutFisier);
}

createErrors();

function renderError(res, identificator, titlu, text, imagine){
    var eroare = obGlobal.erori.info_erori.find(function(elem){
        return elem.identificator == identificator;
    });

    
    titlu = titlu || (eroare && eroare.titlu) || obGlobal.erori.eroare_default.titlu;
    text = text || (eroare && eroare.text) || obGlobal.erori.eroare_default.text;
    imagine = imagine || (eroare && obGlobal.erori.cale_baza+"/"+eroare.imagine) || obGlobal.erori.cale_baza+"/"+obGlobal.erori.eroare_default.imagine;

    if(eroare && eroare.status) {
        res.status(identificator).render("pagini/eroare", {titlu: titlu, text: text, imagine: imagine});
    }
    else {
        res.render("pagini/eroare", {titlu: titlu, text: text, imagine: imagine});
    }
}

app.get('/*ejs', function(req, res){
    renderError(res, 403);
});


app.get(["/", "/index", "/home"], function(req,res) {
    res.render("pagini/index", {ip: req.ip, imagini: obGlobal.imagini});
});

app.get(["/despre"], function(req,res) {
    res.render("pagini/despre", {imagini: obGlobal.imagini});
});


app.get("/*", function(req, res, next) {
    res.render("pagini" + req.url, function(err, rezRandare){

        if(err) {
            if(err.message.includes("Failed to lookup view"))
                renderError(res, 404)
            else {

            }
        }
        else {
            res.send(rezRandare);
        }
    });
});


app.listen(8080);
console.log("Serverul a pornit!");