const centerBall = document.querySelector('#centerBall');
const logo = document.querySelector('#logo>img');


document.addEventListener('mousemove', e => {
    const x = e.clientX;
    const y = e.clientY;
    let vw = window.innerWidth / 2;
    let vh = window.innerHeight / 2;
    // transform
    let d = -.08;
    const dx = (x - vw) * d;
    const dy = (y - vh) * d;
    centerBall.style.transform = `translate(${dx}px, ${dy}px)`;
    logo.style.transform = `translate(${dx /2}px, ${dy/2}px)`;
});