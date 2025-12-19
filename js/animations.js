gsap.registerPlugin(ScrollTrigger);

const aiResponse = document.getElementById('ai-response');
const typingIndicator = document.getElementById('typing-indicator');
const chatHistoryContainer = document.getElementById('chat-history-container');
const userMessageTemplate = document.getElementById('user-message-template');
let state = 'typing';

const scrollToBottom = () => {
    gsap.to(chatHistoryContainer, {
        scrollTop: chatHistoryContainer.scrollHeight,
        duration: 0.5,
        ease: "power2.out"
    });
};

const startLoop = () => {
    if (!document.getElementById('chat-container').classList.contains('gsap-active')) return;

    if (state === 'typing') {
        gsap.to(aiResponse, { duration: 0.3, opacity: 0, onComplete: () => aiResponse.classList.add('hidden') });
        typingIndicator.classList.remove('hidden');
        gsap.fromTo(typingIndicator, { opacity: 0, scale: 0.9 }, { duration: 0.3, opacity: 1, scale: 1, ease: "back.out(1.7)" });
        scrollToBottom();
        
        state = 'response';
        setTimeout(startLoop, 3500);
    } else {
        typingIndicator.classList.add('hidden');
        aiResponse.classList.remove('hidden');
        gsap.fromTo(aiResponse, { opacity: 0, y: 10 }, { duration: 0.5, opacity: 1, y: 0, ease: "power2.out" });
        scrollToBottom();

        state = 'typing';
        setTimeout(() => {
            if (userMessageTemplate.parentElement) userMessageTemplate.remove();
            if (aiResponse.parentElement) aiResponse.remove();
            
            chatHistoryContainer.appendChild(userMessageTemplate);
            chatHistoryContainer.appendChild(aiResponse);

            startLoop(); 
        }, 7000);
    }
};

/* GSAP Animatie Instellingen */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        aiResponse.classList.add('hidden');
        typingIndicator.classList.remove('hidden');
        startLoop(); 
    }, 100);

    gsap.from("#animated-title", {
        duration: 1.5,
        y: -50,
        opacity: 0,
        ease: "power3.out"
    });
    
    const chatTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#ai-chat-section",
            start: "top 70%",
            toggleActions: "play none none none"
        }
    });

    chatTimeline
        .to("#ai-title", { duration: 0.8, opacity: 1, y: 0, ease: "power2.out" }, 0.2)
        .to("#chat-container", { 
            duration: 1, 
            opacity: 1, 
            y: 0, 
            ease: "power3.out",
            onComplete: () => {
                document.getElementById('chat-container').classList.add('gsap-active');
                if(state === 'typing') startLoop();
            }
        }, 0);

    const projectTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#projects-section",
            start: "top 70%",
            toggleActions: "play none none none"
        }
    });

    projectTimeline
        .to("#projects-title, #projects-subtitle", { 
            duration: 0.6, 
            opacity: 1, 
            y: 0, 
            ease: "power2.out", 
            stagger: 0.1 
        })
        .to(".project-card", {
            duration: 0.8,
            opacity: 1,
            y: 0,
            stagger: 0.2,
            ease: "back.out(1.2)"
        }, "-=0.4");
});
