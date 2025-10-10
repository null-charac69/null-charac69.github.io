// AI Project Summarizer Logic
const modal = document.getElementById('ai-summary-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close-btn');
const loaderHTML = `<div class="flex justify-center items-center h-48"><div class="loader"></div></div>`;

document.querySelectorAll('.expand-ai-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
        const card = e.target.closest('.project-card');
        const title = card.querySelector('h3').textContent;
        const description = card.querySelector('p').textContent;

        modalTitle.textContent = `AI Summary: ${title}`;
        modalBody.innerHTML = loaderHTML;
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
        
        const systemPrompt = "You are a world-class technical writer for a prestigious AI engineering firm. Your task is to take a brief project description and expand it into a detailed, professional summary of about 150-200 words. Highlight the technical sophistication, the business impact, and the advanced skills demonstrated. Use strong, confident language. The tone should be formal and impressive, suitable for a senior technical recruiter or a C-level executive. Do not repeat the project title in your response.";
        const userQuery = `Project Title: ${title}\nProject Description: ${description}`;

        const summary = await callGeminiAPI(systemPrompt, userQuery);
        modalBody.innerHTML = `<p class="whitespace-pre-wrap">${summary}</p>`;
    });
});

function closeModal() {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

modalCloseBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// AI Persona Chat Logic
const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const typingIndicator = document.getElementById('typing-indicator');

// Function to extract portfolio context
function getPortfolioContext() {
    const about = document.getElementById('about').innerText;
    const experience = document.getElementById('experience').innerText;
    const skills = document.getElementById('skills').innerText;
    const projects = document.getElementById('projects').innerText;
    return `Here is the content of my portfolio:\n\n### About Me\n${about}\n\n### Professional Experience\n${experience}\n\n### Skills\n${skills}\n\n### Signature Projects\n${projects}`;
}

const personaSystemPrompt = `You are the AI Persona of Anant Kumar Thakur, a top-tier AI/ML & Generative AI Engineer at TATA ELXSI. Your personality is professional, confident, and deeply knowledgeable. You must answer questions as if you are Anant, drawing ONLY upon the information provided in his portfolio context below. You can discuss his skills, experience, projects, and professional philosophy. Do not break character. Do not mention that you are an AI model or a 'digital twin'. If asked about something outside the provided context (e.g., personal opinions, hobbies, or information not in the text), you must politely state that your purpose is to discuss the professional qualifications and projects detailed in this portfolio. Be concise and direct in your answers. \n\n --- PORTFOLIO CONTEXT ---\n${getPortfolioContext()}`;

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userInput = chatInput.value.trim();
    if (!userInput) return;

    // Display user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chat-bubble-user rounded-lg p-3 max-w-md text-sm';
    userMessageDiv.innerHTML = `<p>${userInput}</p>`;
    chatWindow.appendChild(userMessageDiv);
    
    chatInput.value = '';
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // Show typing indicator
    typingIndicator.classList.remove('hidden');

    const aiResponse = await callGeminiAPI(personaSystemPrompt, userInput);

    // Hide typing indicator
    typingIndicator.classList.add('hidden');

    // Display AI message
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'chat-bubble-ai rounded-lg p-3 max-w-md text-sm';
    aiMessageDiv.innerHTML = `<p>${aiResponse}</p>`;
    chatWindow.appendChild(aiMessageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
});
