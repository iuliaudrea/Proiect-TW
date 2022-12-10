const express = require("express");
const fs = require("fs");
const sharp=require("sharp");
const {Client} = require("pg");
const ejs = require("ejs");
const sass = require("sass");
var cssBootstrap=sass.compile(__dirname+"/resurse/scss/customizare-bootstrap.scss",{sourceMap:true});

fs.writeFileSync(__dirname+"/resurse/css/biblioteci/bootstrap-custom.css",cssBootstrap.css);

var client = new Client({
    database:"laborator",
    user: "iulia",
    password: "iulia",
    host: "localhost",
    port: 5432
});
client.connect();


app = express();

app.set("view engine", "ejs");
app.use("/resurse", express.static(__dirname + "/resurse"));

obGlobal = {
    erori: null,
    imagini: null,
    nrimag: null
}


app.use("/*", function(req, res, next){
    client.query("select * from unnest(enum_range(null::categ_carte))", function(err, rezCateg){
        if(err) {
            console.log(err);
            renderError(res, 2);
        } else {
            res.locals.optiuniMeniu = rezCateg.rows; 
            next();}
    });
});


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


app.get("/produse", function(req, res) {
    client.query("SELECT autori, descriere, EXTRACT(year from data_publicare) AS an FROM carti LIMIT 1", function(err, rezInput){

    client.query("SELECT DISTINCT unnest(autori) as aut FROM carti ORDER BY aut", function(err, rezAutori) {

    client.query('SELECT DISTINCT EXTRACT(year from data_publicare) AS "an" FROM carti ORDER BY an DESC', function(err, rezDate) {

    client.query("SELECT * from UNNEST(enum_range(null::tip_hartie))", function(err, tipuriHartie){

    client.query("SELECT min(pret), max(pret) from carti", function(err, rezPret) {
        continuareQuery = ""
        if(req.query.tip)
            continuareQuery = ` AND categorie = '${req.query.tip}'`
        client.query("SELECT * FROM carti WHERE 1 = 1" + continuareQuery, function(err, rez){
            if(err){
                console.log(err);
                renderError(res, 2);
            }
            else{
                res.render("pagini/produse", 
                {produse: rez.rows, 
                optiuni: res.locals.optiuniMeniu, 
                inputs: rezPret.rows[0],
                suboptiuni: tipuriHartie.rows,
                aniPublicare: rezDate.rows,
                autori: rezAutori.rows,
                inpAutor: rezInput.rows[0].autori,
                inpDescriere: rezInput.rows[0].descriere,
                inpAn: rezInput.rows[0].an
            });
            }
        });
    });
    });
    });
    });
});
});

app.get("/produs/:id", function(req, res) {
    client.query("SELECT * FROM carti WHERE id=" + req.params.id, function(err, rez){
        if(err){
            console.log(err);
            renderError(res, 2);            
        }
        else
            res.render("pagini/produs", {prod: rez.rows[0]});
    });
    
});


app.get("*/galerie-animata.css",function(req, res){

    var sirScss=fs.readFileSync(__dirname+"/resurse/scss/galerie_animata.scss").toString("utf8");
    rezScss = ejs.render(sirScss, {nrimag: obGlobal.nrimag});
    // rezScss = ejs.render(sirScss, {nrimag:16});

    // console.log("Nr imag in app get: "+ obGlobal.nrimag);
    // console.log(rezScss);
    
    var caleScss=__dirname+"/temp/galerie_animata.scss"
    fs.writeFileSync(caleScss, rezScss);
    try {
        rezCompilare = sass.compile(caleScss,{sourceMap:true});
        
        var caleCss = __dirname+"/temp/galerie_animata.css";
        fs.writeFileSync(caleCss, rezCompilare.css);
        res.setHeader("Content-Type", "text/css");
        res.sendFile(caleCss);
    }
    catch (err){
        console.log(err);
        res.send("Eroare");
    }
});


app.get("/despre", function(req,res) {
    var nrImag = [2, 4, 8, 16];
    var indiceAleator = Math.floor(Math.random() * nrImag.length);
    var numarAleator = nrImag[indiceAleator]; 
    obGlobal.nrimag = numarAleator;

    res.render("pagini/despre", {imagini: obGlobal.imagini, nrimag: obGlobal.nrimag});
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