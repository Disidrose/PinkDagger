function openEditWeaponModal(doc, abilIdx, rawName, weaponData) {
    const existingModal = doc.getElementById('dh-weapon-edit-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-weapon-edit-modal';
    modalOverlay.className = 'dh-modal-overlay';

    const traitsList = ['Agilidade', 'Força', 'Acuidade', 'Instinto', 'Presença', 'Conhecimento'];
    let traitOptionsHTML = '';
    const currentTraitLower = (weaponData.trait || '').toLowerCase();
    let traitMatched = false;

    traitsList.forEach(t => {
        const isSelected = t.toLowerCase() === currentTraitLower;
        if (isSelected) traitMatched = true;
        traitOptionsHTML += `<option value="${t}" ${isSelected ? 'selected' : ''}>${t}</option>`;
    });

    if (!traitMatched && weaponData.trait && weaponData.trait !== 'ATAQUE') {
        traitOptionsHTML += `<option value="${weaponData.trait}" selected>${weaponData.trait}</option>`;
    }

    modalOverlay.innerHTML = `
        <div class="dh-modal-box">
            <h3 class="dh-modal-title">Editar Arma: ${weaponData.title || 'Arma'}</h3>
            <div class="dh-modal-field">
                <label>Atributo de Ataque:</label>
                <select class="dh-modal-select" id="dh-edit-weapon-trait">
                    ${traitOptionsHTML}
                </select>
            </div>
            <div class="dh-modal-field">
                <label>Fórmula de Dano:</label>
                <input type="text" class="dh-modal-input" id="dh-edit-weapon-damage" value="${weaponData.damageRaw || ''}" placeholder="Ex: [[@{proficiência}d8 + 0]]">
            </div>
            <div class="dh-modal-field">
                <label>Descrição / Efeito:</label>
                <textarea class="dh-modal-textarea" id="dh-edit-weapon-desc" placeholder="Ex: Alcance corpo a corpo, efeito crítico...">${weaponData.desc || ''}</textarea>
            </div>
            <div class="dh-modal-actions">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-edit-weapon-cancel">Cancelar</button>
                <button type="button" class="dh-modal-btn dh-modal-btn-save" id="dh-edit-weapon-save">Salvar</button>
            </div>
        </div>
    `;

    doc.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();

    modalOverlay.querySelector('#dh-edit-weapon-cancel').addEventListener('click', closeModal);

    modalOverlay.querySelector('#dh-edit-weapon-save').addEventListener('click', () => {
        const newTrait = modalOverlay.querySelector('#dh-edit-weapon-trait').value.trim();
        const newDamage = modalOverlay.querySelector('#dh-edit-weapon-damage').value.trim();
        const newDesc = modalOverlay.querySelector('#dh-edit-weapon-desc').value.trim();

        saveWeaponChanges(doc, abilIdx, rawName, newTrait, newDamage, newDesc);
        closeModal();
    });
}

function saveWeaponChanges(doc, abilIdx, rawName, newTrait, newDamage, newDesc) {
    const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');
    let targetAbil = abilityElements[abilIdx];

    if (!targetAbil && rawName) {
        abilityElements.forEach(abil => {
            const nameElem = abil.querySelector('.abilname');
            const name = nameElem?.innerText?.trim().toLowerCase() || (abil.querySelector('input.abilname')?.value?.trim().toLowerCase() || '');
            if (name === rawName.toLowerCase()) {
                targetAbil = abil;
            }
        });
    }

    if (!targetAbil) {
        console.error("Habilidade da arma não encontrada para salvar.");
        return;
    }

    const macroTextarea = targetAbil.querySelector('textarea, input[name*="action"]');
    if (!macroTextarea) {
        console.error("Campo de texto da macro da arma não encontrado.");
        return;
    }

    let updatedMacro = macroTextarea.value || '';

    // 1. Atualiza Atributo: #Atributo-Nome
    if (newTrait) {
        if (/#Atributo-[^\s{]+/i.test(updatedMacro)) {
            updatedMacro = updatedMacro.replace(/#Atributo-[^\s{]+/i, `#Atributo-${newTrait}`);
        } else {
            updatedMacro = `#Atributo-${newTrait} ` + updatedMacro.trim();
        }
    }

    // 2. Atualiza Dano: {{dano=...}} ou {{damage=...}}
    if (/\{\{\s*(?:dano|damage)\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*(?:dano|damage)\s*=[\s\S]*?\}\}/i, `{{dano=${newDamage}\n}}`);
    } else {
        if (/\{\{\s*(?:desc|descrição|descricao)\s*=/i.test(updatedMacro)) {
            updatedMacro = updatedMacro.replace(/(\{\{\s*(?:desc|descrição|descricao)\s*=)/i, `{{dano=${newDamage}\n}} $1`);
        } else {
            updatedMacro += ` {{dano=${newDamage}\n}}`;
        }
    }

    // 3. Atualiza Descrição: {{desc=...}} ou {{descrição=...}} ou {{descricao=...}}
    if (/\{\{\s*(?:desc|descrição|descricao)\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*(?:desc|descrição|descricao)\s*=[\s\S]*?\}\}/i, `{{desc=${newDesc}\n}}`);
    } else {
        if (newDesc) {
            updatedMacro += ` {{desc=${newDesc}\n}}`;
        }
    }

    // Se o macro estava vazio ou sem template
    if (!updatedMacro.includes('&{template:default}')) {
        const fallbackTitle = rawName.startsWith('wea_') ? rawName.substring(4).trim() : rawName;
        updatedMacro = `#Atributo-${newTrait} &{template:default} {{name=${fallbackTitle}\n}} {{dano=${newDamage}\n}} {{desc=${newDesc}\n}}`;
    }

    updateOriginalInput(macroTextarea, updatedMacro);

    const saveBtn = targetAbil.querySelector('.saveabil');
    if (saveBtn) saveBtn.click();

    setTimeout(() => {
        populateDaggerheartData(doc);
    }, 150);
}

function handleCardEditClick(doc, btn, abilityElements) {
    const abilIdx = parseInt(btn.getAttribute('data-abil-idx'), 10);
    const rawName = btn.getAttribute('data-card-fullname');
    const cardType = btn.getAttribute('data-card-type') || 'Carta';

    const targetAbil = abilityElements[abilIdx];
    const macroTextarea = targetAbil?.querySelector('textarea, input[name*="action"]');
    const macroContent = macroTextarea ? macroTextarea.value : '';

    const fieldsList = extractMacroFieldsList(macroContent);

    let cardTitle = '';
    const nameField = fieldsList.find(f => f.isName);
    if (nameField) {
        cardTitle = formatTextWithNewlines(nameField.value);
    } else {
        cardTitle = rawName.substring(4).trim();
    }

    const effectsList = fieldsList.filter(f => !f.isName);
    if (effectsList.length === 0) {
        effectsList.push({ key: 'Efeito', value: '' });
    }

    openEditGeneralCardModal(doc, abilIdx, rawName, cardType, cardTitle, effectsList);
}

function openEditGeneralCardModal(doc, abilIdx, rawName, cardType, cardTitle, effectsList) {
    const existingModal = doc.getElementById('dh-general-card-edit-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-general-card-edit-modal';
    modalOverlay.className = 'dh-modal-overlay';

    let effectsHTML = '';
    effectsList.forEach((eff, idx) => {
        effectsHTML += createEffectItemHTML(idx, eff.key, eff.value);
    });

    modalOverlay.innerHTML = `
        <div class="dh-modal-box">
            <h3 class="dh-modal-title">Editar ${cardType}: ${cardTitle || rawName}</h3>
            <div class="dh-modal-field">
                <label>Nome / Título:</label>
                <input type="text" class="dh-modal-input" id="dh-edit-card-name" value="${cardTitle || ''}" placeholder="Nome da carta">
            </div>
            <div class="dh-modal-field">
                <label>Efeitos / Regras:</label>
                <div class="dh-effects-container" id="dh-effects-container">
                    ${effectsHTML}
                </div>
                <button type="button" class="dh-add-effect-btn" id="dh-add-effect-btn">+ Adicionar Outro Efeito</button>
            </div>
            <div class="dh-modal-actions">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-edit-card-cancel">Cancelar</button>
                <button type="button" class="dh-modal-btn dh-modal-btn-save" id="dh-edit-card-save">Salvar</button>
            </div>
        </div>
    `;

    doc.body.appendChild(modalOverlay);

    const effectsContainer = modalOverlay.querySelector('#dh-effects-container');
    const addEffectBtn = modalOverlay.querySelector('#dh-add-effect-btn');

    function attachRemoveListeners() {
        effectsContainer.querySelectorAll('.dh-effect-remove-btn').forEach(btn => {
            btn.onclick = () => {
                const item = btn.closest('.dh-effect-item');
                if (item) item.remove();
            };
        });
    }
    attachRemoveListeners();

    let effectCounter = effectsList.length;
    addEffectBtn.addEventListener('click', () => {
        const tempDiv = doc.createElement('div');
        tempDiv.innerHTML = createEffectItemHTML(effectCounter++, 'Efeito', '');
        const newElem = tempDiv.firstElementChild;
        effectsContainer.appendChild(newElem);
        attachRemoveListeners();
        newElem.querySelector('.dh-effect-val-textarea')?.focus();
    });

    const closeModal = () => modalOverlay.remove();

    modalOverlay.querySelector('#dh-edit-card-cancel').addEventListener('click', closeModal);

    modalOverlay.querySelector('#dh-edit-card-save').addEventListener('click', () => {
        const newName = modalOverlay.querySelector('#dh-edit-card-name').value.trim() || cardTitle || rawName;

        const updatedEffects = [];
        effectsContainer.querySelectorAll('.dh-effect-item').forEach(item => {
            const keyInput = item.querySelector('.dh-effect-key-input');
            const valTextarea = item.querySelector('.dh-effect-val-textarea');
            const k = keyInput ? keyInput.value.trim() : '';
            const v = valTextarea ? valTextarea.value.trim() : '';
            if (k || v) {
                updatedEffects.push({ key: k || 'Efeito', val: v });
            }
        });

        saveGeneralCardChanges(doc, abilIdx, rawName, newName, updatedEffects);
        closeModal();
    });
}

function createEffectItemHTML(index, key, value) {
    const cleanVal = formatTextWithNewlines(value);
    return `
        <div class="dh-effect-item" data-effect-idx="${index}">
            <div class="dh-effect-item-header">
                <input type="text" class="dh-modal-input dh-effect-key-input" value="${key || ''}" placeholder="Nome do Efeito (ex: Habilidade, Conjuração)">
                <button type="button" class="dh-effect-remove-btn" title="Remover efeito">🗑️</button>
            </div>
            <textarea class="dh-modal-textarea dh-effect-val-textarea" placeholder="O que este efeito faz...">${cleanVal}</textarea>
        </div>
    `;
}

function saveGeneralCardChanges(doc, abilIdx, rawName, newName, effectsList) {
    const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');
    let targetAbil = abilityElements[abilIdx];

    if (!targetAbil && rawName) {
        abilityElements.forEach(abil => {
            const nameElem = abil.querySelector('.abilname');
            const name = nameElem?.innerText?.trim().toLowerCase() || (abil.querySelector('input.abilname')?.value?.trim().toLowerCase() || '');
            if (name === rawName.toLowerCase()) {
                targetAbil = abil;
            }
        });
    }

    if (!targetAbil) {
        console.error("Habilidade da carta não encontrada para salvar.");
        return;
    }

    const macroTextarea = targetAbil.querySelector('textarea, input[name*="action"]');
    if (!macroTextarea) {
        console.error("Campo de texto da macro da carta não encontrado.");
        return;
    }

    let updatedMacro = `&{template:default} {{name=${newName}\n}}`;
    effectsList.forEach(eff => {
        updatedMacro += ` {{${eff.key}=${eff.val}\n}}`;
    });

    updateOriginalInput(macroTextarea, updatedMacro);

    const saveBtn = targetAbil.querySelector('.saveabil');
    if (saveBtn) saveBtn.click();

    setTimeout(() => {
        populateDaggerheartData(doc);
    }, 150);
}

function openEditDomainModal(doc, abilIdx, rawName, domainData) {
    const existingModal = doc.getElementById('dh-domain-edit-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-domain-edit-modal';
    modalOverlay.className = 'dh-modal-overlay';

    modalOverlay.innerHTML = `
        <div class="dh-modal-box">
            <h3 class="dh-modal-title">Editar Carta de Domínio: ${domainData.name || 'Domínio'}</h3>
            <div class="dh-modal-field">
                <label>Nome da Carta:</label>
                <input type="text" class="dh-modal-input" id="dh-edit-domain-name" value="${domainData.name || ''}" placeholder="Nome da carta de domínio">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="dh-modal-field">
                    <label>Nível:</label>
                    <input type="text" class="dh-modal-input" id="dh-edit-domain-nivel" value="${domainData.nivel || ''}" placeholder="Ex: 1">
                </div>
                <div class="dh-modal-field">
                    <label>Custo:</label>
                    <input type="text" class="dh-modal-input" id="dh-edit-domain-custo" value="${domainData.custo || ''}" placeholder="Ex: 0, 1 Esperança...">
                </div>
            </div>
            <div class="dh-modal-field">
                <label>Descrição / Efeito:</label>
                <textarea class="dh-modal-textarea" id="dh-edit-domain-desc" placeholder="O que a carta de domínio faz...">${domainData.desc || ''}</textarea>
            </div>
            <div class="dh-modal-actions">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-edit-domain-cancel">Cancelar</button>
                <button type="button" class="dh-modal-btn dh-modal-btn-save" id="dh-edit-domain-save">Salvar</button>
            </div>
        </div>
    `;

    doc.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();

    modalOverlay.querySelector('#dh-edit-domain-cancel').addEventListener('click', closeModal);

    modalOverlay.querySelector('#dh-edit-domain-save').addEventListener('click', () => {
        const newName = modalOverlay.querySelector('#dh-edit-domain-name').value.trim() || domainData.name || rawName;
        const newNivel = modalOverlay.querySelector('#dh-edit-domain-nivel').value.trim() || '1';
        const newCusto = modalOverlay.querySelector('#dh-edit-domain-custo').value.trim() || '0';
        const newDesc = modalOverlay.querySelector('#dh-edit-domain-desc').value.trim();

        saveDomainChanges(doc, abilIdx, rawName, newName, newNivel, newCusto, newDesc);
        closeModal();
    });
}

function saveDomainChanges(doc, abilIdx, rawName, newName, newNivel, newCusto, newDesc) {
    const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');
    let targetAbil = abilityElements[abilIdx];

    if (!targetAbil && rawName) {
        abilityElements.forEach(abil => {
            const nameElem = abil.querySelector('.abilname');
            const name = nameElem?.innerText?.trim().toLowerCase() || (abil.querySelector('input.abilname')?.value?.trim().toLowerCase() || '');
            if (name === rawName.toLowerCase()) {
                targetAbil = abil;
            }
        });
    }

    if (!targetAbil) {
        console.error("Habilidade da carta de domínio não encontrada para salvar.");
        return;
    }

    const macroTextarea = targetAbil.querySelector('textarea, input[name*="action"]');
    if (!macroTextarea) {
        console.error("Campo de texto da macro da carta de domínio não encontrado.");
        return;
    }

    let updatedMacro = macroTextarea.value || '';

    // 1. Atualiza name
    if (/\{\{\s*name\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*name\s*=[\s\S]*?\}\}/i, `{{name=${newName}\n}}`);
    } else {
        updatedMacro += ` {{name=${newName}\n}}`;
    }

    // 2. Atualiza nível
    if (/\{\{\s*(?:nível|nivel)\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*(?:nível|nivel)\s*=[\s\S]*?\}\}/i, `{{Nível=${newNivel}\n}}`);
    } else {
        updatedMacro += ` {{Nível=${newNivel}\n}}`;
    }

    // 3. Atualiza custo
    if (/\{\{\s*custo\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*custo\s*=[\s\S]*?\}\}/i, `{{Custo=${newCusto}\n}}`);
    } else {
        updatedMacro += ` {{Custo=${newCusto}\n}}`;
    }

    // 4. Atualiza descrição
    if (/\{\{\s*(?:descrição|descricao|desc)\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*(?:descrição|descricao|desc)\s*=[\s\S]*?\}\}/i, `{{Descrição=${newDesc}\n}}`);
    } else {
        if (newDesc) {
            updatedMacro += ` {{Descrição=${newDesc}\n}}`;
        }
    }

    // Se o macro estava vazio ou sem template
    if (!updatedMacro.includes('&{template:default}')) {
        updatedMacro = `&{template:default} {{name=${newName}\n}} {{Nível=${newNivel}\n}} {{Custo=${newCusto}\n}} {{Descrição=${newDesc}\n}}`;
    }

    updateOriginalInput(macroTextarea, updatedMacro);

    const saveBtn = targetAbil.querySelector('.saveabil');
    if (saveBtn) saveBtn.click();

    setTimeout(() => {
        populateDaggerheartData(doc);
    }, 150);
}




function openImportNpcModal(doc) {
    const existingModal = doc.getElementById('dh-import-npc-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-import-npc-modal';
    modalOverlay.className = 'dh-modal-overlay';

    modalOverlay.innerHTML = `
        <div class="dh-modal-box dh-import-npc-modal-box">
            <h3 class="dh-modal-title">🐉 Importar Ficha de Monstro / NPC</h3>
            <div style="font-size: 0.85em; color: #cbd5e0; line-height: 1.4;">
                Copie o texto da ficha diretamente do livro/PDF de Daggerheart (<kbd>Ctrl+C</kbd>) e cole abaixo (<kbd>Ctrl+V</kbd>).
                O parser irá identificar automaticamente <strong>Nome, Tipo, Tier, Descrição, Motivações, Atributos, Ataque, Experiências</strong> e todas as <strong>Habilidades</strong>!
            </div>
            
            <div class="dh-modal-field" style="margin-top: 6px;">
                <label>Texto da Ficha (Livro ou PDF):</label>
                <textarea class="dh-modal-textarea dh-import-textarea" id="dh-import-npc-text" rows="12" placeholder="Exemplo:
EXALTADO, SOLDADO
Lacaio (4º patamar)
Almas de fiéis abençoados com armamento divino.
Motivações e táticas: aglomerar, obedecer, manobrar melhor, punir
Dificuldade: 18 | Limiar: nenhum | 1 PV | 2 PF
ATQ: +2 | Espada e escudo: corpo a corpo | 10 fís
HABILIDADES
Lacaio (13) (passiva): o soldado é derrotado..."></textarea>
            </div>

            <div id="dh-import-status" style="font-size: 0.84em; color: #f1c40f; font-weight: bold; min-height: 20px;"></div>

            <div class="dh-modal-actions" style="justify-content: space-between; align-items: center; margin-top: 8px;">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-import-blank-btn" title="Criar ficha de NPC vazia para preencher manualmente">Criar em Branco</button>
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-import-cancel-btn">Cancelar</button>
                    <button type="button" class="dh-modal-btn dh-modal-btn-save" id="dh-import-confirm-btn">🪄 Importar e Preencher</button>
                </div>
            </div>
        </div>
    `;

    doc.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();
    const cancelBtn = modalOverlay.querySelector('#dh-import-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Criar em branco (sem importar)
    const blankBtn = modalOverlay.querySelector('#dh-import-blank-btn');
    if (blankBtn) {
        blankBtn.addEventListener('click', () => {
            closeModal();
            addNewAttributeToRoll20(doc, 'pinkdagger_npc', null, '1', false, false, true);
        });
    }

    // Importar e preencher
    const confirmBtn = modalOverlay.querySelector('#dh-import-confirm-btn');
    const textarea = modalOverlay.querySelector('#dh-import-npc-text');
    const statusElem = modalOverlay.querySelector('#dh-import-status');

    if (confirmBtn && textarea) {
        confirmBtn.addEventListener('click', async () => {
            const rawText = textarea.value.trim();
            if (!rawText) {
                if (statusElem) {
                    statusElem.style.color = '#e74c3c';
                    statusElem.innerText = 'Cole o texto da ficha copiado do livro antes de importar.';
                }
                return;
            }

            const parsed = parseNpcBookText(rawText);
            if (!parsed || (!parsed.tipo && !parsed.dificuldade && !parsed.atq)) {
                if (statusElem) {
                    statusElem.style.color = '#e74c3c';
                    statusElem.innerText = 'Não foi possível reconhecer o formato da ficha. Verifique se o texto copiado inclui Tipo/Patamar, Dificuldade ou Ataque.';
                }
                return;
            }

            confirmBtn.disabled = true;
            if (cancelBtn) cancelBtn.disabled = true;
            if (blankBtn) blankBtn.disabled = true;
            textarea.disabled = true;

            if (statusElem) {
                statusElem.style.color = '#f1c40f';
                statusElem.innerText = 'Iniciando importação para o Roll20...';
            }

            try {
                await importNpcBatchToRoll20(doc, parsed, (msg) => {
                    if (statusElem) statusElem.innerText = msg;
                });
                closeModal();
            } catch (err) {
                console.error('Erro na importação de NPC:', err);
                if (statusElem) {
                    statusElem.style.color = '#e74c3c';
                    statusElem.innerText = 'Ocorreu um erro durante a importação. Verifique o console.';
                }
                confirmBtn.disabled = false;
                if (cancelBtn) cancelBtn.disabled = false;
                if (blankBtn) blankBtn.disabled = false;
                textarea.disabled = false;
            }
        });
    }
}
