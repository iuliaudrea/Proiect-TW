window.addEventListener("DOMContentLoaded", function() {
    vector_teme = ["dark", "christmas"];

    temaCurenta = localStorage.getItem("tema");
    if(temaCurenta)
        document.body.classList.add(temaCurenta);

    sel = document.getElementById("tema");
    if(temaCurenta == null)
        sel.value = "light"
    else sel.value = temaCurenta

    document.getElementById("tema").onchange = function() {
        let temaSelectata = sel.value;

        for (tema of vector_teme)
            if(document.body.classList.contains(tema)) {
                if(tema != temaSelectata) {
                    document.body.classList.remove(tema);
                    localStorage.removeItem("tema");
                }
            } 

        if(temaSelectata != "light"){
            document.body.classList.add(temaSelectata);
            localStorage.setItem("tema", temaSelectata);
        }
    }
});