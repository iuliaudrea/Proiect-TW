
window.addEventListener("DOMContentLoaded", function() {
    texte = document.getElementsByClassName("accordion-collapse");

    for(let text of texte){
        let afis = false;
        let buton = text.parentElement.getElementsByClassName("accordion-button")[0];

        if(localStorage.getItem(text.id) == "true") {
            text.classList.add("show");
            buton.classList.remove("collapsed");
            buton.ariaExpanded = "true";
            afis = true;
        }

        buton.addEventListener("click", function() {
            if(afis) {
                localStorage.removeItem(text.id);
            } else {
                localStorage.setItem(text.id, "true");
            }

            afis = !afis;
            console.log(afis);
            console.log(localStorage);
        });
    }

});