anime.timeline({ loop: false })
    .add({
        targets: 'div.loadView .circle-white',
        scale: [0, 3],
        opacity: [1, 0],
        easing: "easeInOutExpo",
        rotateZ: 360,
        duration: 1800
    }).add({
        targets: 'div.loadView .circle-container',
        scale: [0, 1],
        duration: 1100,
        easing: "easeInOutExpo",
        offset: '-=1000'
    }, '-=1000').add({
        targets: 'div.loadView>#centerBall>div',
        scale: [0, 1],
        duration: 1100,
        easing: "easeOutExpo",
        offset: '-=600'
    }, '-=600').add({
        targets: 'div.loadView img.logo',
        scale: [0, 1],
        duration: 1200,
        offset: '-=550'
    }, '-=550').add({
        targets: '#line-container',
        scale: [2, 1],
        easing: "easeOutExpo",
        duration: 1200,
        offset: '-=550'
    }, '-=550').add({
        targets: 'div#ul a',
        width: ["0%", "100%"],
        opacity: [0, 1],
        duration: 1200,
        easing: "easeOutExpo",
        delay: anime.stagger(300, { start: -50 })
    }, '-=550').add({
        targets: 'div.loadView .bang',
        scale: [0, 1],
        rotateZ: [45, 15],
        duration: 1200,
        offset: '-=1000'
    });

anime({
    targets: 'div.loadView .circle-dark-dashed',
    rotateZ: 360,
    duration: 24000,
    easing: "linear",
    loop: true
});

const centerBall = document.querySelector('#centerBall');
const logo = document.querySelector('img.logo');


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
    logo.style.top = `${dy/3}px`;
    logo.style.left = `${dx/3}px`;
});