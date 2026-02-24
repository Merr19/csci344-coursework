function toggleMenu()
{
    const menu = document.getElementById('nav-links');
    const button = document.getElementById('menu-toggle');

    menu.classList.toggle('active');
    button.classList.toggle('active');
};