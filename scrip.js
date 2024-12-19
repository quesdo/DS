const supabaseUrl = 'https://kikivfglslrobwttvlvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2l2Zmdsc2xyb2J3dHR2bHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTIwNDQsImV4cCI6MjA1MDA4ODA0NH0.Njo06GXSyZHjpjRwPJ2zpElJ88VYgqN2YYDfTJnBQ6k';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

let channel = null;

function handleRealtimeUpdate(payload) {
    if (payload.new && payload.new.name === 'line') {
        updateCardState(payload.new.is_active);
    }
}

function updateCardState(isActive) {
    const card = document.getElementById('layout-card');
    if (isActive) {
        card.classList.add('active');
    } else {
        card.classList.remove('active');
    }
}

async function handleCardClick() {
    const card = document.getElementById('layout-card');
    const currentState = card.classList.contains('active');
    const newState = !currentState;

    try {
        const { error } = await supabaseClient
            .from('levers')
            .update({ is_active: newState })
            .eq('name', 'line');

        if (error) throw error;
        
        updateCardState(newState);
        
    } catch (err) {
        console.error('Error updating layout lever:', err);
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
        .subscribe();
}

async function fetchInitialState() {
    try {
        const { data, error } = await supabaseClient
            .from('levers')
            .select('is_active')
            .eq('name', 'line')
            .single();

        if (error) throw error;

        if (data) {
            updateCardState(data.is_active);
        }
    } catch (err) {
        console.error('Error fetching initial state:', err);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    const layoutCard = document.getElementById('layout-card');
    layoutCard.addEventListener('click', handleCardClick);
    
    fetchInitialState();
    setupRealtimeSubscription();
});