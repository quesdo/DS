let isProcessing = false;
let lastCheckedCheckbox = null;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function toggleVisibility(actorName, visible) {
    window.parent.postMessage(JSON.stringify({
        action: "toggleVisibility",
        actor: actorName,
        visible: visible
    }), "*");
}
// Fonction pour sauvegarder l'état
async function saveClickState(data) {
    const { error } = await supabase
        .from('click_state')
        .upsert([{ id: 'current_state', state: data }]);
    if (error) {
        console.error('Erreur de sauvegarde:', error);
    }
}

// Fonction pour charger l'état
async function loadClickState() {
    const { data, error } = await supabase
        .from('click_state')
        .select('state')
        .eq('id', 'current_state')
        .single();
    if (data) {
        console.log('État chargé:', data.state);
        applyState(data.state);
    } else if (error) {
        console.error('Erreur de chargement:', error);
    }
}

// Appliquer l'état chargé (exemple)
function applyState(state) {
    if (state.clicked) {
        document.getElementById('landingLogo').classList.add('shrink');
        document.getElementById('w-assistant').classList.remove('hidden');
    }
}

// Charger l'état au démarrage
document.addEventListener('DOMContentLoaded', loadClickState);

// Exemple de sauvegarde de l'état lorsqu'un clic est effectué
document.getElementById('landingLogo').onclick = () => {
    saveClickState({ clicked: true });
};

async function typeMessage(element, text, speed = 20) {
    let index = 0;
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}

async function addMessage(message, type = 'w', shouldType = true) {
    while (isProcessing) {
        await sleep(100);
    }
    
    isProcessing = true;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    if (type === 'w') {
        const avatar = document.createElement('div');
        avatar.className = 'w-avatar';
        avatar.innerHTML = '<img src="logo.png" alt="W">';
        messageDiv.appendChild(avatar);
        
        if (shouldType) {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'typing';
            typingDiv.innerHTML = '<span></span><span></span><span></span>';
            messageDiv.appendChild(typingDiv);
        }
    }

    if (typeof message === 'string' && type === 'w' && shouldType) {
        const textDiv = document.createElement('div');
        messageDiv.appendChild(textDiv);
        document.getElementById('chatMessages').appendChild(messageDiv);
        messageDiv.scrollIntoView({ behavior: 'smooth' });
        
        await typeMessage(textDiv, message);
        messageDiv.querySelector('.typing')?.remove();
        await sleep(500);
    } else {
        if (typeof message === 'string') {
            messageDiv.innerHTML += message;
        } else {
            messageDiv.appendChild(message);
        }
        document.getElementById('chatMessages').appendChild(messageDiv);
        messageDiv.scrollIntoView({ behavior: 'smooth' });
        await sleep(500);
    }

    isProcessing = false;
    return messageDiv;
}

async function initChatWithRecommendation() {
    

    
    toggleVisibility("WebPage", false);
    await addMessage("Based on your production line analysis, I recommend the U-Shape layout. ", 'w', true);
	
    await sleep(500);
	toggleVisibility("UShape_Ghost", true);
    const confirmationButtons = document.createElement('div');
    confirmationButtons.className = 'options-grid';

    const confirmButton = document.createElement('div');
    confirmButton.className = 'option-card';
    confirmButton.innerHTML = `
        <h3><i class="fas fa-check"></i> Confirm U-Shape Layout</h3>
        <p>Proceed with the recommended layout</p>
    `;
    confirmButton.onclick = async () => {
        await addMessage("I confirm the U-Shape layout choice", 'user', false);
        await sleep(500);

        toggleVisibility("UShape_Ghost", false);
        toggleVisibility("Dollhouse",false);
        toggleVisibility("TO BE LINE", true);
		toggleVisibility("WebPage2", false);

        await addMessage("Perfect! The U-Shape layout is now being displayed. Let me guide you through its implementation and key features.");
    };

    const otherOptionsButton = document.createElement('div');
    otherOptionsButton.className = 'option-card';
    otherOptionsButton.innerHTML = `
        <h3><i class="fas fa-sync-alt"></i> View Other Options</h3>
        <p>Explore alternative layouts</p>
    `;
    otherOptionsButton.onclick = async () => {
        toggleVisibility("UShape_Ghost", false);
        await addMessage("I'd like to see other options", 'user', false);
        await sleep(500);
        await addMessage("Here are all available layout options:");
        await sleep(500);
        await addMessage(createLayoutChoiceButtons());
    };

    confirmationButtons.appendChild(confirmButton);
    confirmationButtons.appendChild(otherOptionsButton);

    await addMessage(confirmationButtons);
}

function createLayoutChoiceButtons() {
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'options-grid';

    const layouts = [
        { title: "U-Shape Layout", id: "UShape_Ghost", icon: "square-u", recommended: true },
        { title: "I-Shape Layout", id: "IShape_Ghost", icon: "grip-lines-vertical" },
        { title: "L-Shape Layout", id: "LShape_Ghost", icon: "l" }
    ];

    layouts.forEach(layout => {
        const card = document.createElement('div');
        card.className = 'option-card';
        card.innerHTML = `
            <h3><i class="fas fa-${layout.icon}"></i> ${layout.title}</h3>
            <p>${layout.desc || 'Click to select this layout'}</p>
            ${layout.recommended ? '<p class="recommended">Recommended</p>' : ''}
        `;
        card.onclick = () => handleLayoutChoice(layout.title, layout.id);
        buttonsContainer.appendChild(card);
    });

    return buttonsContainer;
}

async function handleLayoutChoice(layoutTitle, layoutId) {
    await addMessage(`I'd like to try the ${layoutTitle}`, 'user', false);
    
    // Hide all layouts first
    ["UShape_Ghost", "IShape_Ghost", "LShape_Ghost"].forEach(id => {
        toggleVisibility(id, false);
    });
    
    // Show selected layout
    toggleVisibility(layoutId, true);
    
    await addMessage(`Here's a preview of the ${layoutTitle}. Would you like to proceed with this configuration?`);
    await addMessage(createConfirmationButtons(layoutTitle, layoutId));
}

function createConfirmationButtons(layoutTitle, layoutId) {
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'options-grid';
    
    const confirmButton = document.createElement('div');
    confirmButton.className = 'option-card';
    confirmButton.innerHTML = `
        <h3><i class="fas fa-check"></i> Confirm ${layoutTitle}</h3>
        <p>Proceed with this layout</p>
    `;
    confirmButton.onclick = () => handleConfirmation(true, layoutTitle, layoutId);
    
    const backButton = document.createElement('div');
    backButton.className = 'option-card';
    backButton.innerHTML = `
        <h3><i class="fas fa-arrow-left"></i> Back to Options</h3>
        <p>View other layouts</p>
    `;
    backButton.onclick = () => handleConfirmation(false);
    
    buttonsContainer.appendChild(confirmButton);
    buttonsContainer.appendChild(backButton);
    
    return buttonsContainer;
}

async function handleConfirmation(confirmed, layoutTitle, layoutId) {
    if (confirmed) {
        toggleVisibility(layoutId, false);
        toggleVisibility("Dollhouse", true);
        toggleVisibility("TO BE U Shape", true);
        
        await addMessage(`Excellent choice! Let's proceed with the ${layoutTitle}. I'll guide you through the implementation process.`);
    } else {
        toggleVisibility(layoutId, false);
        await addMessage("Let's look at the other options:", 'w', true);
        await addMessage(createLayoutChoiceButtons());
    }
}

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    const landingLogo = document.getElementById('landingLogo');
    landingLogo.onclick = startChat;
});