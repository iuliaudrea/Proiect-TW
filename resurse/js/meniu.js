window.addEventListener("DOMContentLoaded", function() {
    window.onresize = function() {
        if(window.innerWidth > 750) {
            document.getElementById("ch-menu").checked = false
        }
    }

    locatieMeniu = document.querySelectorAll(`a[href='${window.location.pathname}']`)[0];
    if(locatieMeniu){
        locatieMeniu.style = `
        font-weight: bold;
        color: var(--culoare-text-meniu-highlight);
        font-size: 1.15rem;
    `;
    }

    let linkuri = document.querySelectorAll('a[href^="#"], a[href^="' + window.location.pathname + '#"]');
    for (link of linkuri) {
        link.addEventListener('click', function(){
            let targetId = "#" + this.getAttribute('href').split("#")[1];
            if (targetId != "#"){
                // console.log(targetId)
                document.querySelector(targetId).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
      }

});