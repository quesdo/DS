const supabaseUrl = 'https://kikivfglslrobwttvlvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2l2Zmdsc2xyb2J3dHR2bHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTIwNDQsImV4cCI6MjA1MDA4ODA0NH0.Njo06GXSyZHjpjRwPJ2zpElJ88VYgqN2YYDfTJnBQ6k';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const CATEGORIES = {
    quality: {
        title: "Quality",
        levers: ["ar", "assembly"]
    },
    delivery: {
        title: "Delivery",
        levers: ["mes", "amr"]
    },
    cost: {
        title: "Cost",
        levers: ["kitting", "pick", "line"]
    }
};

const ACRONYM_DEFINITIONS = {
    amr: "Autonomous Mobile Robot",
    ar: "AR: Quality Assistance",
    kitting: "Kit Preparation Process",
    assembly: "AR: Assembly Assistance",
    mes: "Manufacturing Operation Management",
    pick: "Automation",
    line: "Layout"
};

let switchStates = {
    amr: false,
    ar: false,
    kitting: false,
    assembly: false,
    mes: false,
    pick: false,
    line: false
};

// Variable pour suivre l'état pending du bouton line
let linePending = false;

let channel = null;

function handleRealtimeUpdate(payload) {
    if (payload.new && payload.new.name) {
        // Si le changement concerne 'kitting', mettre à jour l'état pending du layout
        if (payload.new.name === 'kitting') {
            linePending = payload.new.is_active;
        }
        switchStates[payload.new.name] = payload.new.is_active;
        updateDisplay();
    }
}

async function updateLeverState(leverName, newState) {
    try {
        const { error } = await supabaseClient
            .from('levers')
            .update({ is_active: newState })
            .eq('name', leverName);

        if (error) throw error;
        
        switchStates[leverName] = newState;
        
    } catch (err) {
        console.error('Error updating lever:', err);
        throw err;
    }
}

async function handleLeverClick(leverName) {
    const newState = !switchStates[leverName];
    try {
        await updateLeverState(leverName, newState);
        updateDisplay();
    } catch (err) {
        switchStates[leverName] = !newState;
        updateDisplay();
    }
}

async function handleCategoryClick(categoryName) {
    const category = CATEGORIES[categoryName];
    if (!category) return;

    try {
        if (categoryName === 'cost') {
            // Pour la catégorie Cost, on gère uniquement kitting et pick
            const kittingCurrentState = switchStates['kitting'];
            
            // Mettre à jour kitting et pick (inverse de l'état actuel)
            await updateLeverState('kitting', !kittingCurrentState);
            await updateLeverState('pick', !kittingCurrentState);
            
            // Mettre à jour l'état pending du layout
            linePending = !kittingCurrentState;
        } else {
            // Pour les autres catégories, on garde le comportement normal
            const allActive = category.levers.every(lever => switchStates[lever]);
            const newState = !allActive;
            
            for (const lever of category.levers) {
                await updateLeverState(lever, newState);
            }
        }
        updateDisplay();
    } catch (err) {
        console.error('Error updating category:', err);
        updateDisplay();
    }
}

function createLeverButton(lever) {
    const container = document.createElement('div');
    const leverData = ACRONYM_DEFINITIONS[lever];
    
    let classes = [];
    
    if (lever === 'line') {
        // Pour le bouton Layout
        if (switchStates[lever]) {
            // Si le bouton est activé -> bleu
            classes.push('active');
        } else if (linePending) {
            // Si le bouton n'est pas activé mais Cost est activé -> orange
            classes.push('pending');
        }
        // Si aucune condition n'est remplie -> blanc (par défaut)
    } else {
        // Pour tous les autres boutons, comportement normal
        if (switchStates[lever]) {
            classes.push('active');
        }
    }
    
    container.innerHTML = `
        <button class="lever-button ${classes.join(' ')}" data-lever="${lever}">
            <div class="lever-text">${leverData}</div>
        </button>
    `;
    
    const button = container.querySelector('button');
    button.addEventListener('click', () => handleLeverClick(lever));
    
    return container.firstElementChild;
}

function createCategorySection(category, categoryData) {
    const section = document.createElement('div');
    section.className = 'category-section';
    
    section.innerHTML = `
        <h2 class="category-title">${categoryData.title}</h2>
        <div class="category-levers"></div>
    `;
    
    const titleElement = section.querySelector('.category-title');
    titleElement.addEventListener('click', () => handleCategoryClick(category));
    
    const leversContainer = section.querySelector('.category-levers');
    categoryData.levers.forEach(lever => {
        const button = createLeverButton(lever);
        leversContainer.appendChild(button);
    });
    
    return section;
}

function updateDisplay() {
    const leversDiv = document.getElementById("levers");
    if (leversDiv) {
        leversDiv.innerHTML = '';
        Object.entries(CATEGORIES).forEach(([category, categoryData]) => {
            const section = createCategorySection(category, categoryData);
            leversDiv.appendChild(section);
        });
    }
}

function setupRealtimeSubscription() {
    if (channel) {
        channel.unsubscribe();
    }

    channel = supabaseClient
        .channel('levers-channel')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'levers'
            },
            handleRealtimeUpdate
        )
        .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
                setTimeout(setupRealtimeSubscription, 5000);
            }
        });
}

async function fetchLevers() {
    try {
        const { data, error } = await supabaseClient
            .from('levers')
            .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
            switchStates = data.reduce((acc, lever) => {
                acc[lever.name] = lever.is_active;
                return acc;
            }, {...switchStates});
            updateDisplay();
        }
    } catch (err) {
        console.error('Error fetching levers:', err);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    updateDisplay();
    fetchLevers();
    setupRealtimeSubscription();
});