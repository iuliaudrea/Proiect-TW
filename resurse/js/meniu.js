window.addEventListener("DOMContentLoaded", function() {
    window.onresize = function() {
        if(window.innerWidth > 750) {
            document.getElementById("ch-menu").checked = false
        }
    }
});