// src/micsetup.ts

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('enable') as HTMLButtonElement | null;
    const statusEl = document.getElementById('status') as HTMLParagraphElement | null;
  
    if (!btn || !statusEl) return;
  
    btn.addEventListener('click', async () => {
      statusEl.textContent = 'Requesting microphone…';
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach(t => t.stop());
        statusEl.textContent = 'Microphone enabled. You can close this tab.';
        statusEl.className = 'success';
      } catch (e: any) {
        statusEl.textContent = `Mic blocked: ${e?.name || e}. Check Chrome & OS settings.`;
        statusEl.className = 'error';
        console.error('[micsetup] getUserMedia error:', e);
      }
    });
  });
  