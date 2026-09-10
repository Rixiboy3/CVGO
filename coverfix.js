(() => {
  const $ = id => document.getElementById(id);
  const val = id => $(id)?.value?.trim() || '';

  function profileData() {
    const experience = [];
    document.querySelectorAll('#experience .item').forEach(item => {
      experience.push({
        position: item.querySelector('.ep')?.value?.trim() || '',
        company: item.querySelector('.ec')?.value?.trim() || '',
        dates: [item.querySelector('.ef')?.value?.trim() || '', item.querySelector('.et')?.value?.trim() || ''].filter(Boolean).join(' – '),
        description: item.querySelector('.ed')?.value?.trim() || ''
      });
    });
    const education = [];
    document.querySelectorAll('#education .item').forEach(item => {
      education.push({
        title: item.querySelector('.etitle')?.value?.trim() || '',
        school: item.querySelector('.eschool')?.value?.trim() || '',
        year: item.querySelector('.eyear')?.value?.trim() || ''
      });
    });
    return {
      name: val('name'),
      role: val('role'),
      email: val('email'),
      phone: val('phone'),
      city: val('city'),
      linkedin: val('linkedin'),
      summary: val('summary'),
      skills: val('skills'),
      experience,
      education
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }

  function showError(message) {
    const out = $('coverOut');
    if (!out) return;
    out.innerHTML = `<div class="item" style="border-color:#fecdca;background:#fff7f6;color:#b42318"><b>No se ha podido generar la carta</b><p style="margin-bottom:0">${escapeHtml(message)}</p></div>`;
  }

  window.makeCover = async function () {
    const button = document.querySelector('#coverTab button.primary');
    const offer = val('job');
    if (offer.length < 20) {
      showError('Pega una oferta de empleo suficientemente completa para poder personalizar la carta.');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Generando carta…';
    }
    const out = $('coverOut');
    if (out) out.innerHTML = '<div class="item"><p style="margin:0">✦ Analizando la oferta y adaptando la carta a tu perfil…</p></div>';

    try {
      const response = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({offer, profile: profileData()})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.error === 'TRIAL_EXPIRED') throw new Error('Tu prueba gratuita ha terminado. Activa PRO para seguir utilizando esta función.');
        if (data.error === 'LOGIN_REQUIRED') throw new Error('Inicia sesión para generar una carta.');
        throw new Error(data.detail || 'No se ha podido generar la carta. Inténtalo de nuevo.');
      }

      const letter = String(data.letter || '').trim();
      if (!letter) throw new Error('La IA no ha devuelto una carta válida. Inténtalo de nuevo.');

      // Client-side guard: the visible letter must not talk about the candidate in third person.
      const lower = letter.toLowerCase();
      const forbidden = ['el candidato', 'la candidata', 'el/la candidato', 'cuenta con experiencia', 'está preparado/a', 'está preparado para', 'esta preparado para'];
      if (forbidden.some(x => lower.includes(x))) {
        throw new Error('La carta generada no cumple el formato de primera persona. Inténtalo de nuevo.');
      }

      const paragraphs = escapeHtml(letter).split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
      if (out) {
        out.innerHTML = `<div class="item cover-result"><h2>Carta de presentación</h2>${paragraphs}<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="smallbtn" id="copyCoverBtn">Copiar carta</button></div></div>`;
        $('copyCoverBtn')?.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(letter);
            $('copyCoverBtn').textContent = '✓ Copiada';
            setTimeout(() => { if ($('copyCoverBtn')) $('copyCoverBtn').textContent = 'Copiar carta'; }, 1800);
          } catch (_) {}
        });
      }
    } catch (error) {
      showError(error?.message || 'No se ha podido generar la carta. Inténtalo de nuevo.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Generar carta';
      }
    }
  };
})();
