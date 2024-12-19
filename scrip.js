const supabaseUrl = 'https://kikivfglslrobwttvlvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2l2Zmdsc2xyb2J3dHR2bHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTIwNDQsImV4cCI6MjA1MDA4ODA0NH0.Njo06GXSyZHjpjRwPJ2zpElJ88VYgqN2YYDfTJnBQ6k';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const confirmCard = document.getElementById('confirm-layout');
    const otherOptionsCard = document.getElementById('view-options');

    // Gestion du clic sur "Confirm U-Shape Layout"
    confirmCard.addEventListener('click', async () => {
        try {
            const { error } = await supabaseClient
                .from('levers')
                .update({ is_active: true })
                .eq('name', 'line');

            if (error) throw error;

            // Redirection vers le dashboard après confirmation
            window.location.href = '/dashboard.html';
        } catch (err) {
            console.error('Error updating layout lever:', err);
        }
    });

    // Gestion du hover sur les cartes
    [confirmCard, otherOptionsCard].forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.borderColor = '#005386';
        });
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = 'transparent';
        });
    });

    // Vérification de l'état actuel du levier
    async function checkLayoutStatus() {
        try {
            const { data, error } = await supabaseClient
                .from('levers')
                .select('is_active')
                .eq('name', 'line')
                .single();

            if (error) throw error;

            if (data && data.is_active) {
                confirmCard.style.backgroundColor = '#f0f9ff';
                confirmCard.querySelector('.checkmark').style.color = '#6EBE44';
            }
        } catch (err) {
            console.error('Error checking layout status:', err);
        }
    }

    checkLayoutStatus();
});