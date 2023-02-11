const express = require("express");
const fs = require("fs");
const sharp=require("sharp");
const {Client} = require("pg");
const ejs = require("ejs");
const sass = require("sass");
const formidable = require("formidable");

const {Utilizator} = require("./module_proprii/utilizator.js")
const AccesBD = require("./module_proprii/accesbd.js")

const session = require('express-session');
const path = require('path');
const Drepturi = require("./module_proprii/drepturi.js");

const QRCode = require('qrcode');
const puppeteer = require('puppeteer');
const mongodb = require('mongodb');
const { type } = require("os");

var cssBootstrap=sass.compile(__dirname+"/resurse/scss/customizare-bootstrap.scss",{sourceMap:true});
var cssNav = sass.compile(__dirname+"/resurse/scss/nav.scss",{sourceMap:true}); 

fs.writeFileSync(__dirname+"/resurse/css/biblioteci/bootstrap-custom.css",cssBootstrap.css);
fs.writeFileSync(__dirname+"/resurse/css/nav.css", cssNav.css);

// creare foldere necesare
foldere=["temp", "poze_uploadate"];
for (let folder of foldere){
    let calefolder=path.join(__dirname,folder);
    if (!fs.existsSync(calefolder))
        fs.mkdirSync(calefolder);
}


var instantaBD = AccesBD.getInstanta({init:"local"});
var client = instantaBD.getClient();


app = express();

app.use(["/produse_cos","/cumpara"],express.json({limit:'2mb'}));//obligatoriu de setat pt request body de tip json


app.use(session({
    secret: 'abcdef',
    resave: true,
    saveUninitialized: false
}));


app.set("view engine", "ejs");
app.use("/resurse", express.static(__dirname + "/resurse"));
app.use("/poze_uploadate", express.static(__dirname + "/poze_uploadate"));


obGlobal = {
    erori: null,
    imagini: null,
    nrimag: null,
    optiuniMeniu: null,
    pozaDefault: "resurse/imagini/poza_default.png",
    protocol: "http://",
    numeDomeniu: "localhost:8080",
    clientMongo: mongodb.MongoClient,
    bdMongo: null
}

var url = "mongodb://localhost:27017";//pentru versiuni mai vechi de Node
var url = "mongodb://0.0.0.0:27017";


obGlobal.clientMongo.connect(url, function(err, bd) {
    if (err) console.log(err);
    else{
        obGlobal.bdMongo = bd.db("proiect_web");
    }
});


app.use("/*", function(req, res, next){
    if(req.session.utilizator){
        req.utilizator = res.locals.utilizator = new Utilizator(req.session.utilizator);
        // console.log(res.locals.utilizator.areDreptul(Drepturi.vizualizareUtilizatori))
    }
    res.locals.Drepturi = Drepturi;
    
    client.query("select * from unnest(enum_range(null::categ_carte))", function(err, rezCateg){
        if(err) {
            console.log(err);
            renderError(res, 2);
        } else {
            obGlobal.optiuniMeniu = rezCateg.rows;
            res.locals.optiuniMeniu = obGlobal.optiuniMeniu;
            next();
        }
    });  
});


function getIp(req){//pentru Heroku/Render
    var ip = req.headers["x-forwarded-for"];//ip-ul userului pentru care este forwardat mesajul
    if (ip){
        let vect=ip.split(",");
        return vect[vect.length-1];
    }
    else if (req.ip){
        return req.ip;
    }
    else{
     return req.connection.remoteAddress;
    }
}


app.all("/*", function(req, res, next){
    let id_utiliz = req?.session?.utilizator?.id;
    id_utiliz = id_utiliz ? id_utiliz : null;
    AccesBD.getInstanta().insert({
       tabel:"accesari",
       campuri:["ip", "user_id", "pagina"],
       valori:[`'${getIp(req)}'`, `${id_utiliz}`, `'${req.url}'`]
       }, function(err, rezQuery){
           console.log(err);
       }
   );
    next();
});

function stergeAccesariVechi(){
    AccesBD.getInstanta().delete({
        tabel:"accesari", 
        conditiiAnd:["now()-data_accesare >= interval '10 minutes'"]}, 
        function(err, rez){
            if(err) console.error(err);
        });
}
stergeAccesariVechi();
setInterval(stergeAccesariVechi, 60*60*1000);

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


app.get(["/", "/index", "/home", "/login"], async function(req,res) {
    let sir = req.session.succesLogin;
    req.session.succesLogin = null;
    
    client.query(`SELECT nume, prenume, username FROM utilizatori
    WHERE id in (SELECT user_id FROM accesari 
    WHERE now()-data_accesare <= interval '5.5 minutes' and user_id is not null
    ORDER BY data_accesare ASC)`, 
        function(err, rez){
            let useriOnline = [];
            if(!err && rez.rowCount != 0){
                useriOnline = rez.rows;}
            res.render("pagini/index", {ip: req.ip, useriOnline: useriOnline, optiuniMeniu: obGlobal.optiuniMeniu,imagini: obGlobal.imagini, succesLogin: sir});

    });
    
    // let rez = await instantaBD.selectAsync({tabel:"utilizatori", campuri:["nume"]});
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

// cos virtual
app.post("/produse_cos",function(req, res){
    console.log(req.body);
    if(req.body.ids_prod.length!=0){
        AccesBD.getInstanta().select({
            tabel:"carti", 
            campuri:["*"], 
            conditiiAnd:[`id in (${req.body.ids_prod})`]}, function(err, rez){
                if(err) res.send([]);
                res.send(rez.rows);
            })
    }  
    else{
        res.send([]);
    }
});

cale_qr="./resurse/imagini/qrcode";
if (fs.existsSync(cale_qr))
  fs.rmSync(cale_qr, {force:true, recursive:true});
fs.mkdirSync(cale_qr);

// client.query("select id from carti", function(err, rez){
//     for(let prod of rez.rows){
//         let cale_prod=obGlobal.protocol+obGlobal.numeDomeniu+"/produs/"+prod.id;
//         //console.log(cale_prod);
//         QRCode.toFile(cale_qr+"/"+prod.id+".png",cale_prod);
//     }
// });

client.query("select id from utilizatori", function(err, rez){
    for(let prod of rez.rows){
        let cale_prod=obGlobal.protocol+obGlobal.numeDomeniu+"/produs/"+prod.id;
        //console.log(cale_prod);
        QRCode.toFile(cale_qr+"/"+prod.id+".png",cale_prod);
    }
});



async function genereazaPdf(stringHTML,numeFis, callback) {
    const chrome = await puppeteer.launch();
    const document = await chrome.newPage();
    await document.setContent(stringHTML, {waitUntil:"load"});
    await document.pdf({path: numeFis, format: 'A4'});
    await chrome.close();
    if(callback)
        callback(numeFis);
}

app.post("/cumpara",function(req, res){
    if (req?.utilizator?.areDreptul?.(Drepturi.cumparareProduse)){
        AccesBD.getInstanta().select({
            tabel:"carti",
            campuri:["*"],
            conditiiAnd:[`id in (${req.body.ids_prod})`]
        }, function(err, rez){
            if(!err  && rez.rowCount>0){
                // console.log("produse:", rez.rows);
                let rezFactura= ejs.render(fs.readFileSync("./views/pagini/factura.ejs").toString("utf-8"),{
                    protocol: obGlobal.protocol, 
                    domeniu: obGlobal.numeDomeniu,
                    utilizator: req.session.utilizator,
                    produse: rez.rows,
                    cantitati: req.body.cant_prod,
                    iduri: req.body.ids_prod
                });
                // console.log(rezFactura);
                let numeFis=`./temp/factura${(new Date()).getTime()}.pdf`;
                genereazaPdf(rezFactura, numeFis, function (numeFis){
                    mesajText=`Stimate ${req.session.utilizator.username} aveti mai jos factura.`;
                    mesajHTML=`<h2>Stimate ${req.session.utilizator.username},</h2> aveti mai jos factura.`;
                    req.utilizator.trimiteMail("Factura", mesajText,mesajHTML,[{
                        filename:"factura.pdf",
                        content: fs.readFileSync(numeFis)
                    }] );
                    res.send("Totul e bine!");
                });
                rez.rows.forEach(function (elem){ elem.cantitate=1});
                let jsonFactura= {
                    data: new Date(),
                    username: req.session.utilizator.username,
                    produse:rez.rows,
                    iduri: req.ids_prod,
                    cant: req.cant_prod
                }
                if(obGlobal.bdMongo){
                    obGlobal.bdMongo.collection("facturi").insertOne(jsonFactura, function (err, rezmongo){
                        if (err) console.log(err)
                        else console.log ("Am inserat factura in mongodb");

                        obGlobal.bdMongo.collection("facturi").find({}).toArray(
                            function (err, rezInserare){
                                if (err) console.log(err)
                                else console.log (rezInserare);
                        })
                    })
                }
            }
        })
    }
    else{
        res.send("Nu puteti cumpara daca nu sunteti logat sau nu aveti dreptul!");
    }
    
});


app.get("/grafice", function(req,res){
    if (! (req?.session?.utilizator && req.utilizator.areDreptul(Drepturi.vizualizareGrafice))){
        renderError(res, 403);
        return;
    }
    res.render("pagini/grafice");
});

app.get("/update_grafice",function(req,res){
    obGlobal.bdMongo.collection("facturi").find({}).toArray(function(err, rezultat) {
        res.send(JSON.stringify(rezultat));
    });
});

// Utilizatori

app.post("/inregistrare",function(req, res){
    var username;

    var formular= new formidable.IncomingForm()
    formular.parse(req, function(err, campuriText, campuriFisier ){
        console.log(campuriText);
        var eroare="";
        var utilizNou = new Utilizator();
 
        try{
            utilizNou.setareNume= campuriText.nume
            utilizNou.setareUsername = campuriText.username
            utilizNou.email = campuriText.email
            utilizNou.prenume = campuriText.prenume
            utilizNou.parola = campuriText.parola
            utilizNou.culoare_chat = campuriText.culoare_chat
            utilizNou.poza = campuriFisier.poza.originalFilename
            utilizNou.data_nasterii = campuriText.data_nasterii
            if(campuriText.problema_vedere)
                utilizNou.problema_vedere = true
            else utilizNou.problema_vedere = false
            
            Utilizator.getUtilizDupaUsername(campuriText.username, {}, function(u, parametru, eroareUser){
                if(eroareUser == -1){
                    console.log("Se salveaza!")
                    // nu exista username-ul in baza de date
                    utilizNou.salvareUtilizator();
                }
                else { eroare += "Username deja existent!"; }

                if(!eroare){
                    res.render("pagini/inregistrare", 
                    {raspuns: "Înregistrare cu succes!", 
                    optiuniMeniu: obGlobal.optiuniMeniu,
                    imagini:obGlobal.imagini});
                }   
                else
                    res.render("pagini/inregistrare", 
                    {err: "Eroare: "+eroare, 
                    optiuniMeniu: obGlobal.optiuniMeniu, 
                    imagini:obGlobal.imagini});
            });
        }
        catch(e){ 
            console.log(e.message)
            eroare += "Reveniti mai tarziu"
            res.render("pagini/inregistrare", 
                        {err: "Eroare: "+eroare, 
                        optiuniMeniu: obGlobal.optiuniMeniu, 
                        imagini:obGlobal.imagini});
        }

        
    });
    formular.on("field", function(nume,val){  // 1
        // console.log(`--- ${nume}=${val}`);
        if(nume=="username")
            username=val;
    })
    formular.on("fileBegin", function(nume,fisier){ //2
        // console.log("fileBegin");
        // console.log(nume,fisier);

        let folderUser = path.join(__dirname, "poze_uploadate", username);
        console.log(folderUser);
        if(!fs.existsSync(folderUser))
            fs.mkdirSync(folderUser);
        fisier.filepath = path.join(folderUser, fisier.originalFilename);
 
    })    
    formular.on("file", function(nume,fisier){//3
        // console.log("file");
        // console.log(nume,fisier);
    });
});

app.post("/login",function(req, res){
    var username;
    var formular= new formidable.IncomingForm()
    formular.parse(req, function(err, campuriText, campuriFisier){
        Utilizator.getUtilizDupaUsername(campuriText.username,{
            req: req,
            res: res,
            parola: campuriText.parola
        }, function(u, obparam){
            let parolaCriptata = Utilizator.criptareParola(obparam.parola);
            if(u.parola == parolaCriptata && u.confirmat_mail){
                u.poza = u.poza?path.join("poze_uploadate", u.username, u.poza):"";
                obparam.req.session.utilizator = u;
                obparam.req.session.succesLogin = "Bravo! Te-ai logat!";
                obparam.res.redirect("/index");
            }
            else{
                obparam.req.session.succesLogin="Eroare conectare";
                obparam.res.redirect("/index");
            }
        })
    });
});


app.get("/profil", function(req,res, next){
    if (!req.session.utilizator){
        renderError(res, identificator=403, text="Nu sunteți logat!", titlu="Conectați-va înainte de a accesa profilul!");
    }
    next(); 
})

app.post("/profil", function(req, res){
    console.log("profil");
    if (!req.session.utilizator){
        renderError(res, identificator=403, text="Nu sunteți logat!", titlu="Conectați-va înainte de a accesa profilul!");
        return;
    }

    var formular= new formidable.IncomingForm();
 
    formular.parse(req,function(err, campuriText, campuriFile){
       
        var parolaCriptata=Utilizator.criptareParola(campuriText.parola);
        if(campuriText.problema_vedere)
            campuriText.problema_vedere = true
        else campuriText.problema_vedere = false


        if(!campuriFile.poza.originalFilename)
            campuriFile.poza.originalFilename = ""

        campuriUpdate = ["nume","prenume","email","culoare_chat", "data_nasterii", "problema_vedere", "poza"]
        valoriUpdate = [`'${campuriText.nume}'`,`'${campuriText.prenume}'`,`'${campuriText.email}'`,`'${campuriText.culoare_chat}'`, `'${campuriText.data_nasterii}'`, `${campuriText.problema_vedere}`,`'${campuriFile.poza.originalFilename}'`]

        if(campuriText.mparola){
            // daca s-a completat o parola
            campuriUpdate.push("parola");
            let parolaNoua = Utilizator.criptareParola(campuriText.mparola)
            valoriUpdate.push(`'${parolaNoua}'`)
        }
        
        AccesBD.getInstanta().update(
            {tabel:"utilizatori",
            campuri:campuriUpdate,
            valori:valoriUpdate,
            conditiiAnd:[`parola='${parolaCriptata}'`, `username='${campuriText.username}'`]
        },  function(err, rez){
            if(err){
                console.log(err);
                renderError(res, identificator=2);
                return;
            }
            console.log(rez.rowCount);
            if (rez.rowCount==0){
                res.render("pagini/profil",{mesaj:"Update-ul nu s-a realizat. Verificati parola introdusa."});
                return;
            }
            else{            
                //actualizare sesiune
                req.session.utilizator.nume= campuriText.nume;
                req.session.utilizator.prenume= campuriText.prenume;
                req.session.utilizator.email= campuriText.email;
                req.session.utilizator.culoare_chat= campuriText.culoare_chat;
                req.session.utilizator.data_nasterii = campuriText.data_nasterii;
                req.session.utilizator.problema_vedere = campuriText.problema_vedere;
                req.session.utilizator.poza = campuriFile.poza.originalFilename? 
                        path.join("poze_uploadate", campuriText.username, campuriFile.poza.originalFilename):
                        obGlobal.pozaDefault
                console.log(req.session.utilizator.poza)
                res.locals.utilizator=req.session.utilizator;

                //trimitere mail
                let u = new Utilizator(req.session.utilizator);
                u.trimiteMail("Modificare date", 
                `Salut, ${u.prenume} ${u.nume}! Ti-ai modificat cu succes datele: nume - ${u.nume}, prenume - ${u.prenume}, email - ${u.email}, culoare chat - ${u.culoare_chat}, data nasterii - ${u.data_nasterii}, problema vedere - ${u.problema_vedere}`,
                
                `<h2>Salut, ${u.prenume} ${u.nume}!</h2> <br>Ti-ai modificat cu succes datele:<br> nume - ${u.nume}, <br> prenume - ${u.prenume}, <br> email - ${u.email}, <br> culoare chat - ${u.culoare_chat}, <br> data nasterii - ${u.data_nasterii},<br> problema vedere - ${u.problema_vedere}`)

            }
            res.render("pagini/profil",{mesaj:"Update-ul s-a realizat cu succes."});
 
        });
    });

    formular.on("fileBegin", function(nume,fisier){ 
        let folderUser = path.join(__dirname, "poze_uploadate", req.session.utilizator.username);
        if(!fs.existsSync(folderUser))
            fs.mkdirSync(folderUser);
        fisier.filepath = path.join(folderUser, fisier.originalFilename);
        console.log(fisier.filepath)
    });
});

app.get(["/stergere_cont", "/cos-virtual"], function(req, res, next){
    if (!req.session.utilizator){
        renderError(res, identificator=403, text="Nu sunteți logat!", titlu="Conectați-va înainte de a accesa profilul!");
        return;
    }
    next();
});

app.post("/stergere_cont", function(req, res){
    if (!req.session.utilizator){
        renderError(res, identificator=403, text="Nu sunteți logat!", titlu="Conectați-va înainte de a accesa profilul!");
        return;
    }
    let u = new Utilizator(req.session.utilizator);
    var formular= new formidable.IncomingForm();
    formular.parse(req,function(err, campuriText){
        let parolaCriptata = Utilizator.criptareParola(campuriText.parola);
        AccesBD.getInstanta().delete({
            tabel:"accesari",
            conditiiAnd: [`user_id=${req.session.utilizator.id}`]
        },function(err, rez){
            if(err) console.log(err);
            else {
            AccesBD.getInstanta().delete({
                tabel:"utilizatori",
                conditiiAnd: [`id=${req.session.utilizator.id}`, `parola='${parolaCriptata}'`]
            }, function(err, rez){
                if(err) console.log(err);
                else {
                    res.redirect("/index")
                    //trimitere mail
                    u.trimiteMail(
                        "Cont sters cu succes",
                        `Buna ziua. Va informam ca userul ${u.username} a fost sters!`,
                        `<h2>Buna ziua.</h2>Va informam ca userul ${u.username} a fost sters!`,
                    )

                    //resetare utilizator din sesiune
                    req.session.utilizator = null;
                }
            })
            }
        })
        
    })
})


/********* Administrare utilizatori */
app.get("/useri", function(req, res){
   
    if(req?.utilizator?.areDreptul?.(Drepturi.vizualizareUtilizatori)){
        AccesBD.getInstanta().select({tabel:"utilizatori", campuri:["*"]}, function(err, rezQuery){
            console.log(err);
            res.render("pagini/useri", {useri: rezQuery.rows});
        });
    }
    else{
        renderError(res, 403);
    }
});


app.post("/sterge_utiliz", function(req, res){
    if(req?.utilizator?.areDreptul?.(Drepturi.stergereUtilizatori)){
        var formular= new formidable.IncomingForm();
        formular.parse(req,function(err, campuriText, campuriFile){
            AccesBD.getInstanta().delete({tabel:"utilizatori", conditiiAnd:[`id=${campuriText.id_utiliz}`]}, function(err, rezQuery){
            if(err)console.log(err);
                res.redirect("/useri");
            });
        });
    } else {
        renderError(res, 403);
    }
});


app.post("/sterge_poza", function(req, res){
    if(req?.utilizator?.areDreptul?.(Drepturi.stergereUtilizatori)){

        var formular= new formidable.IncomingForm();
        formular.parse(req,function(err, campuriText, campuriFile){
            // preluarea utilizatorului pentru a-i trimite mail
            AccesBD.getInstanta().select({
                tabel:"utilizatori", 
                campuri:["*"],
                conditiiAnd:[`id=${campuriText.id_utiliz}`]},
                function(err, rezQuery){
                if(err)console.log(err);
                else {
                let u = new Utilizator(rezQuery.rows[0])
                AccesBD.getInstanta().update(
                    {tabel:"utilizatori", 
                    campuri:["poza"],
                    valori:[`null`],
                    conditiiAnd:[`id=${campuriText.id_utiliz}`]}, 
                    function(err, rezQuery){
                        if(err)console.log(err);
                        else {
                            // trimitere mail
                            u.trimiteMail(
                                "Poza stearsa",
                                `Nu ne mai plăcea cum arăți, ${u.prenume} ${u.nume}, așa că ți-am șters poza. Sorry!`,
                                `Nu ne mai plăcea cum arăți,  ${u.prenume} ${u.nume}, așa că ți-am șters poza. Sorry!`,
                            )
                        }
                        res.redirect("/useri");
                    });}
            })
        });
    } else {
        renderError(res, 403);
    }
});


app.get("/logout", function(req, res){
    req.session.destroy();
    res.locals.utilizator=null;
    res.render("pagini/logout");
});


// http://${Utilizator.numeDomeniu}/cod/${utiliz.username}/${token}
app.get("/cod/:username/:token", function(req, res){
    try{
        Utilizator.getUtilizDupaUsername(req.params.username, {res:res, token: req.params.token}, function(u, obparam){
            AccesBD.getInstanta().update({
                tabel:"utilizatori", 
                campuri:['confirmat_mail'], 
                valori:['true'], 
                conditiiAnd:[`cod='${obparam.token}'`]},
                function(err, rezUpdate){
                    if(err || rezUpdate.rowCount == 0){
                        console.log("Cod:", err);
                        renderError(res, 3);
                    }
                    else {
                        res.render("pagini/confirmare.ejs");
                    }
                })
        })
    }
    catch (e){
        console.log(e);
        renderError(res, 2);
    }
    
});



app.get("*/galerie-animata.css",function(req, res){

    var sirScss=fs.readFileSync(__dirname+"/resurse/scss/galerie_animata.scss").toString("utf8");
    rezScss = ejs.render(sirScss, {nrimag: obGlobal.nrimag});
    
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


app.get("/admin_produse", function(req,res){
    if(req?.utilizator?.areDreptul?.(Drepturi.vizualizareUtilizatori)){
        AccesBD.getInstanta().select({tabel:"carti", campuri:["*"]}, function(err, rezQuery){
            console.log(err);
            res.render("pagini/admin_produse", {produse: rezQuery.rows});
        });
    }
    else{
        renderError(res, 403);
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