const supabaseUrl = 'https://kikivfglslrobwttvlvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2l2Zmdsc2xyb2J3dHR2bHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTIwNDQsImV4cCI6MjA1MDA4ODA0NH0.Njo06GXSyZHjpjRwPJ2zpElJ88VYgqN2YYDfTJnBQ6k';

// Création du client Supabase
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let isUpdating = false;
let channel = null;

function handleRealtimeUpdate(payload) {
    console.log('Realtime update received:', payload);
    if (payload.new && payload.new.name === 'line') {
        updateCardState(payload.new.is_active);
    }
}

function updateCardState(isActive) {
    console.log('Updating card state to:', isActive);
    const card = document.getElementById('layout-card');
    if (isActive) {
        card.classList.add('active');
    } else {
        card.classList.remove('active');
    }
}

async function handleCardClick() {
    if (isUpdating) {
        console.log('Update in progress, ignoring click');
        return;
    }

    isUpdating = true;
    const card = document.getElementById('layout-card');
    const currentState = card.classList.contains('active');
    const newState = !currentState;

    try {
        console.log('Sending update to Supabase, new state:', newState);
        const { data, error } = await supabaseClient
            .from('levers')
            .update({ is_active: newState })
            .eq('name', 'line')
            .select();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Update successful:', data);
        updateCardState(newState);
        
    } catch (err) {
        console.error('Error updating layout lever:', err);
        // Revert visual state on error
        updateCardState(currentState);
    } finally {
        isUpdating = false;
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
            console.log('Realtime subscription status:', status);
        });
}

async function fetchInitialState() {
    try {
        console.log('Fetching initial state...');
        const { data, error } = await supabaseClient
            .from('levers')
            .select('*')
            .eq('name', 'line')
            .single();

        if (error) throw error;

        if (data) {
            console.log('Initial state:', data);
            updateCardState(data.is_active);
        }
    } catch (err) {
        console.error('Error fetching initial state:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');
    const layoutCard = document.getElementById('layout-card');
    layoutCard.addEventListener('click', handleCardClick);
    
    fetchInitialState();
    setupRealtimeSubscription();
});