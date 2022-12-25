window.addEventListener("DOMContentLoaded", function() {
    window.onresize = function() {
        if(window.innerWidth > 750) {
            document.getElementById("ch-menu").checked = false
        }
    }

    // indicatorLocatie = document.createElement("div");
    // indicatorLocatie.id = "indicator";
    // indicatorLocatie.style = `
    //     position: absolute;
    //     bottom: 5px;
    //     left: 87.5px;
    //     width: 5px;
    //     height: 5px;
    //     background: var(--culoare-text-meniu-highlight);
    //     border-radius: 50%;
    // `;

    locatieMeniu = document.querySelectorAll(`a[href='${window.location.pathname}']`)[0];
    locatieMeniu.style = `
        font-weight: bold;
        color: var(--culoare-text-meniu-highlight);
        font-size: 1.15rem;
    `;

    // locatieMeniu.appendChild(indicatorLocatie);

});