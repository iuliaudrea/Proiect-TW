const AccesBD=require('./accesbd.js');
const crypto = require("crypto");   
const nodemailer = require("nodemailer");
const parole = require("./parole.js");
const {RolFactory} = require("./roluri.js");


class Utilizator{
    static tipConexiune="local";
    static tabel = "utilizatori";
    static parolaCriptare = "tehniciweb";
    static lungimeCod = 64
    static emailServer = "gaudeamus.librarie@gmail.com";
    static numeDomeniu = "localhost:8080"
    #eroare;

    constructor({id, username, nume, prenume, email, parola, rol="comun", culoare_chat="black", poza, data_nasterii, problema_vedere}={}) {
        this.id=id;
        try{
            if(this.checkUsername(username))
                this.username = username;
        }
        catch(e) { this.#eroare = e.message }
    
        for(let prop in arguments[0]){
            this[prop] = arguments[0][prop];
        }

        if(rol.cod)
            this.rol = RolFactory.creeazaRol(rol.cod)
        else 
            this.rol = RolFactory.creeazaRol(rol)

        this.#eroare="";
    }

    checkName(nume){
        return nume!="" && nume.match(new RegExp("^[A-Z][a-z]+$"));
    }

    set setareNume(nume){
        if(this.checkName(nume))
            this.nume = nume
        else {
            throw new Error("Nume gresit")
        }
    }

    checkUsername(username){
        return username!="" && username.match(new RegExp("^[A-Za-z0-9]+$"));
    }

    /**
     * folosit doar la inregistrare si modificare profil
     */
    set setareUsername(username){
        if(this.checkUsername(username))
            this.username = username
        else {
            throw new Error("Username gresit")
        }
        
    }

    static criptareParola(parola){
        return crypto.scryptSync(parola, Utilizator.parolaCriptare, Utilizator.lungimeCod).toString("hex");
    }

    salvareUtilizator(){
        let parolaCriptata = Utilizator.criptareParola(this.parola);
        let utiliz = this;
        let token = parole.genereazaToken(100);

        AccesBD.getInstanta(Utilizator.tipConexiune).insert({
            tabel: Utilizator.tabel, 
            campuri:["username", "nume", "prenume", "parola", "email", "culoare_chat", "cod", "poza", "data_nasterii", "problema_vedere"], 
            valori:[`'${this.username}'`, `'${this.nume}'`,`'${this.prenume}'`,
                    `'${parolaCriptata}'`, `'${this.email}'`, `'${this.culoare_chat}'`,
                    `'${token}'`, `'${this.poza}'`, `'${this.data_nasterii}'`, `${this.problema_vedere}`]},
                     function(err, rez){
            if(err){
                console.log(err);
            }
            let data_curenta = new Date();
            utiliz.trimiteMail("Mesaj înregistrare", `Pe gaudeamus.ro, ai username-ul ${utiliz.username}, începând de azi ${data_curenta.toLocaleDateString()}`, `<h1>Salut!</h1><p>Pe gaudeamus.ro, ai username-ul ${utiliz.username}, începând de azi <span style="color:purple;text-decoration:underline">${data_curenta.toLocaleDateString()}</span>.</p> <p><a href='http://${Utilizator.numeDomeniu}/cod/${utiliz.username}/${token}'>Click aici pentru confirmare</a></p>`)
        })
    }

    //O metodă modifica() care primește un obiect cu noile date ale utilizatorului și modifică înregistrarea din tabel corespunzătoare lui. Aruncă o eroare dacă utilizatorul nu există.
    modifica({id, username, nume, prenume, email, parola, rol, culoare_chat, poza, data_nasterii, problema_vedere}={}){
        campuriUtiliz = []
        valoriUtiliz = []
        for(let prop in arguments[0]){
            campuriUtiliz.push(prop)
            valoriUtiliz.push(arguments[0][prop])
        }
        AccesBD.getInstanta(Utilizator.tipConexiune).update({
            tabel: "utilizatori",
            campuri: campuriUtiliz,
            valori: valoriUtiliz,
            conditiiAnd:[`id=${this.id}`]}, 
            function(err, rez){
                if(err)
                    console.log(err)
                if(rez.rowCount == 0)
                    throw new Error("Utilizatorul nu exista sau eroare la baza de date");
            }
        )
    }

    //O metodă sterge() care șterge din tabel utilizatorul curent și aruncă o eroare dacă acesta nu există.
    sterge(){
        AccesBD.getInstanta(Utilizator.tipConexiune).delete({
            tabel: "utilizatori",
            conditiiAnd: `id=${this.id}`
        }, function(err, rez){
            if(err)
                console.log(err)
            if(rez.rowCount == 0)
                throw new Error("Utilizatorul nu exista!")
        }
        );
    }

    static cauta(obParam,callback){
        conditii = [];
        for(let prop in obParam){
            cond = `${prop}='${obParam[prop]}'`
            conditii.push(cond)
        }

        lista = []
        AccesBD.getInstanta(Utilizator.tipConexiune).select({
            tabel: "utilizatori",
            campuri: ['*'],
            conditiiAnd: conditii
        }, function(err, rezSelect){
            if(err) console.log(err);
            for(let i=0; i<rezSelect.rowCount; i++){
                let u = new Utilizator(rezSelect.rows[i])
                lista.push(u)
            }

            callback(err, lista);
        })
    }

    static async cautaAsync(obParam){
        conditii = [];
        for(let prop in obParam){
            cond = `${prop}='${obParam[prop]}'`
            conditii.push(cond)
        }

        lista = []
        try {
            let rezSelect = await AccesBD.getInstanta(Utilizator.tipConexiune).selectAsync(
                {tabel: "utilizatori",
                campuri: ['*'],
                conditiiAnd: conditii
            });

            if(rezSelect.rowCount>0){
                for(let i=0; i<rezSelect.rowCount; i++){
                    let u = new Utilizator(rezSelect.rows[i])
                    lista.push(u)
                }
                return lista;
            } else { 
                console.log("cautaAsync: Nu am gasit utilizatori");
                return null;
            }
        }
        catch(e){
            console.error(e);
            return null;
        }
    }

    async trimiteMail(subiect, mesajText, mesajHtml, atasamente=[]){
        var transp= nodemailer.createTransport({
            service: "gmail",
            secure: false,
            auth:{//date login 
                user: Utilizator.emailServer,
                pass: "gzawnnhiwvkydios"
            },
            tls:{
                rejectUnauthorized:false
            }
        });

        //genereaza html
        await transp.sendMail({
            from: Utilizator.emailServer,
            to: this.email, //TO DO
            subject: subiect,//"Te-ai inregistrat cu succes",
            text: mesajText, //"Username-ul tau este "+username
            html: mesajHtml,// `<h1>Salut!</h1><p style='color:blue'>Username-ul tau este ${username}.</p> <p><a href='http://${numeDomeniu}/cod/${username}/${token}'>Click aici pentru confirmare</a></p>`,
            attachments: atasamente
        })
        console.log("Trimis mail");
    }

    static async getUtilizDupaUsernameAsync(username){
        if(!username) return null;
        
        try {
            let rezSelect = await AccesBD.getInstanta(Utilizator.tipConexiune).selectAsync(
                {tabel:"utilizatori", 
                campuri:["*"], 
                conditiiAnd:[`username='${username}'`]
            });

            if(rezSelect.rowCount !=0){
                return new Utilizator(rezSelect.rows[0]);
            } else { 
                console.log("getUtilizDupaUsernameAsync: Nu am gasit utilizatorul");
                return null;
            }

        }
        catch(e){
            console.error(e);
            return null;
        }
    }

    static getUtilizDupaUsername(username, obparam, proceseazaUtiliz){
        if(!username) return null;
        let eroare = null;
        
        AccesBD.getInstanta(Utilizator.tipConexiune).select({tabel:"utilizatori", campuri:["*"], conditiiAnd:[`username='${username}'`]}, function(err, rezSelect){
            if(err){
                console.error(err);
                console.log(rezSelect.rows.length)
                // throw new Error();
                eroare = -2;
            } else if(rezSelect.rows.length == 0){
                eroare = -1;
            }
            
            let u = new Utilizator(rezSelect.rows[0]);
            proceseazaUtiliz(u, obparam, eroare);
        });
    }

    areDreptul(drept){
        return this.rol.areDreptul(drept);
    }
}

module.exports = {Utilizator:Utilizator}