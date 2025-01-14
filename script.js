const supabaseUrl = 'https://kikivfglslrobwttvlvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2l2Zmdsc2xyb2J3dHR2bHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTIwNDQsImV4cCI6MjA1MDA4ODA0NH0.Njo06GXSyZHjpjRwPJ2zpElJ88VYgqN2YYDfTJnBQ6k';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Nouvelles valeurs d'impact sur le coût pour chaque levier
const COST_IMPACTS = {
    kitting: 0.3,     // Kit preparation
    pick: 1,        // Automation
    mes: 0.2,         // MOM
    line: 0.2,        // Layout
    assembly: 0.3     // AR Assembly
};

// Valeur maximale de l'échelle (3%)
const MAX_COST_VALUE = 3;

const CATEGORIES = {
    quality: {
        title: "Quality",
        levers: ["assembly", "kitting"]
    },
    delivery: {
        title: "Delivery",
        levers: ["mes", "pick"]
    },
    cost: {
        title: "Cost",
        levers: ["line"]
    }
};

const ACRONYM_DEFINITIONS = {
    kitting: "Kitting",
    assembly: "Sense Computing",
    mes: "Manufacturing Operation Management",
    pick: "Automation",
    line: "Layout"
};

let switchStates = {
    kitting: false,
    assembly: false,
    mes: false,
    pick: false,
    line: false
};

let linePending = false;
let channel = null;

function handleRealtimeUpdate(payload) {
    if (payload.new && payload.new.name) {
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
            linePending = !linePending;
            updateDisplay();
        } else {
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
        if (switchStates[lever]) {
            classes.push('active');
        } else if (linePending) {
            classes.push('pending');
        }
    } else {
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

function updateCostIndicator() {
    // Calculer le coût total en vérifiant chaque levier actif
    const totalCost = Object.entries(switchStates)
        .reduce((total, [lever, isActive]) => {
            // S'assurer que le levier existe dans COST_IMPACTS
            const impact = COST_IMPACTS[lever] || 0;
            return total + (isActive ? impact : 0);
        }, 0) || 0; // Utiliser 0 comme valeur par défaut si le résultat est NaN

    // Mettre à jour la barre de progression
    const progressBar = document.getElementById('costBar');
    const heightPercentage = Math.max(0, Math.min(100, (totalCost / MAX_COST_VALUE) * 100));
    progressBar.style.height = `${heightPercentage}%`;

    // Mettre à jour la valeur affichée
    const costValue = document.getElementById('costValue');
    costValue.textContent = `${totalCost.toFixed(2)}%`;
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
    updateCostIndicator();
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

document.addEventListener('DOMContentLoaded', () => {
    updateDisplay();
    fetchLevers();
    setupRealtimeSubscription();
});