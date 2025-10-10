// Background constellation animation
const canvas = document.getElementById('constellation-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createParticles() {
    particles = [];
    let particleCount = Math.floor(canvas.width * canvas.height / 15000);
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 1.5 + 0.5
        });
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 255, 218, 0.5)';
        ctx.fill();
    });
    
    ctx.beginPath();
    for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
            let dist = Math.sqrt(
                (particles[i].x - particles[j].x) ** 2 + 
                (particles[i].y - particles[j].y) ** 2
            );
            if (dist < 100) {
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
            }
        }
    }
    ctx.strokeStyle = 'rgba(100, 255, 218, 0.08)';
    ctx.stroke();
    
    requestAnimationFrame(animate);
}

// Initialize canvas animation
window.addEventListener('resize', () => {
    resizeCanvas();
    createParticles();
});

resizeCanvas();
createParticles();
animate();

// Header scroll effect
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('glass-effect', 'shadow-lg');
    } else {
        header.classList.remove('glass-effect', 'shadow-lg');
    }
});

// Mobile menu toggle
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.add('hidden');
    }
});

// GSAP Animations
gsap.registerPlugin(ScrollTrigger);

// Fade in animations for sections
document.querySelectorAll('.fade-in').forEach(el => {
    gsap.fromTo(el, 
        { opacity: 0, y: 50 },
        {
            opacity: 1,
            y: 0,
            duration: 0.8,
            scrollTrigger: {
                trigger: el,
                start: "top 85%",
                toggleActions: "play none none none"
            }
        }
    );
});

// Signature animation
const signatureSVG = document.getElementById('signature-svg');
const signaturePath = document.getElementById('signature-path');
const pathLength = signaturePath.getTotalLength();

signaturePath.style.strokeDasharray = pathLength;
signaturePath.style.strokeDashoffset = pathLength;

gsap.to(signaturePath, {
    strokeDashoffset: 0,
    duration: 3,
    ease: "power2.inOut",
    scrollTrigger: {
        trigger: signatureSVG,
        start: "top 80%",
        toggleActions: "play none none none"
    }
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 100,
                behavior: 'smooth'
            });
            // Close mobile menu if open
            mobileMenu.classList.add('hidden');
        }
    });
});
