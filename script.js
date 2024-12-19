// levers.js
const supabaseUrl = 'https://kikivfglslrobwttvlvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2l2Zmdsc2xyb2J3dHR2bHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTIwNDQsImV4cCI6MjA1MDA4ODA0NH0.Njo06GXSyZHjpjRwPJ2zpElJ88VYgqN2YYDfTJnBQ6k';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const ACRONYM_DEFINITIONS = {
    amr: "Autonomous Mobile Robot",
    ar: "AR: Quality Assistance",
    kitting: "Kit Preparation Process",
    assembly: "AR: Assembly Assistance",
    mes: "Manufacturing Operation Management",
    pick: "Automatisation",
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

let channel = null;

function handleRealtimeUpdate(payload) {
    if (payload.new && payload.new.name) {
        switchStates[payload.new.name] = payload.new.is_active;
        updateDisplay();
    }
}

async function handleLeverClick(leverName) {
    const newState = !switchStates[leverName];
    
    try {
        const { error } = await supabaseClient
            .from('levers')
            .update({ is_active: newState })
            .eq('name', leverName);

        if (error) throw error;
        
        switchStates[leverName] = newState;
        updateDisplay();
        
    } catch (err) {
        console.error('Error updating lever:', err);
        switchStates[leverName] = !newState;
        updateDisplay();
    }
}

function createLeverButton(lever) {
    const container = document.createElement('div');
    const leverData = ACRONYM_DEFINITIONS[lever];
    
    container.innerHTML = `
        <button class="lever-button ${switchStates[lever] ? 'active' : ''}" data-lever="${lever}">
            <div class="lever-text">${leverData}</div>
        </button>
    `;
    
    const button = container.querySelector('button');
    button.addEventListener('click', () => handleLeverClick(lever));
    
    return container.firstElementChild;
}

function updateDisplay() {
    const leversDiv = document.getElementById("levers");
    if (leversDiv) {
        leversDiv.innerHTML = '';
        Object.keys(ACRONYM_DEFINITIONS).forEach(lever => {
            const button = createLeverButton(lever);
            leversDiv.appendChild(button);
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