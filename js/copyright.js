document.addEventListener("DOMContentLoaded", () => {
    const d = new Date();
    let year = d.getFullYear();
    document.getElementById("currentYear").textContent = year;
});
