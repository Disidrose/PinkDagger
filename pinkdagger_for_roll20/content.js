(function () {
    'use strict';

    if (window.__daggerheart_tab_initialized) return;
    window.__daggerheart_tab_initialized = true;

    const MACRO_TEMPLATES = {
        anc: `&{template:default} {{name=Nome da Ancestralidade\n}} {{Descrição=Efeito ou bônus concedido.\n}}`,
        com: `&{template:default} {{name=Nome da Comunidade\n}} {{Nome do Efeito=Efeito ou bônus concedido.\n}}`,
        cla: `&{template:default} {{name=Nome da Habilidade\n}} {{Nome do Efeito=O que a habilidade faz.\n}}`,
        wea: `&{template:default} {{name=Nome da Arma\n}} {{Atributo=#Atributo-Agilidade\n}} {{dano=[[@{proficiência}d8 + 0]]\n}} {{desc=<OPCIONAL> Efeito crítico ou alcance.\n}}`,
        dom: `&{template:default} {{name=Nome da Carta\n}} {{Nível=1\n}} {{Custo=2 Esperança\n}} {{Descrição=O que a carta de domínio faz.\n}}`,
        exp: `&{template:default} {{name=Nome da Experiência\n}} {{Modificador=+2\n}}`,
        inv: ``
    };

    function injectStyles(doc) {
        if (doc.getElementById('daggerheart-custom-css')) return;
        const linkEl = doc.createElement('link');
        linkEl.id = 'daggerheart-custom-css';
        linkEl.rel = 'stylesheet';
        linkEl.type = 'text/css';
        linkEl.href = chrome.runtime.getURL('styles.css');
        doc.head.appendChild(linkEl);
    }

    function initDaggerheartTab(doc) {
        const navTabs = doc.querySelector('.nav.nav-tabs');
        const tabContent = doc.querySelector('#tab-content');

        if (!navTabs || !tabContent || doc.querySelector('.daggerheart-nav-item')) {
            return;
        }

        injectStyles(doc);

        const daggerheartNavItem = doc.createElement('li');
        daggerheartNavItem.className = 'daggerheart-nav-item';
        daggerheartNavItem.innerHTML = `<a href="javascript:void(0);" data-tab="daggerheart" style="color: #E85D9E; font-weight: bold;">PinkDagger</a>`;
        navTabs.appendChild(daggerheartNavItem);

        const daggerheartPane = doc.createElement('div');
        daggerheartPane.className = 'daggerheart tab-pane';
        daggerheartPane.style.display = 'none';
        daggerheartPane.innerHTML = `
            <div class="dh-container">
                <div class="dh-title-bar">
                    <h2 id="dh-char-name">PinkDagger</h2>
                    <div class="dh-header-meta">
                        <span>Nível: <strong id="dh-char-nivel">-</strong></span>
                        <span>Proficiência: <strong id="dh-char-prof">-</strong></span>
                    </div>
                </div>
                <div id="dh-content-root"></div>
            </div>
        `;
        tabContent.appendChild(daggerheartPane);

        const allNavs = navTabs.querySelectorAll('li');
        const allPanes = tabContent.querySelectorAll('.tab-pane');

        daggerheartNavItem.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            allNavs.forEach(nav => nav.classList.remove('active', '"active"'));
            allPanes.forEach(pane => {
                pane.style.display = 'none';
                pane.classList.remove('active');
            });

            daggerheartNavItem.classList.add('active');
            daggerheartPane.style.display = 'block';
            daggerheartPane.classList.add('active');

            populateDaggerheartData(doc);
        });

        allNavs.forEach(nav => {
            if (nav !== daggerheartNavItem) {
                nav.addEventListener('click', function () {
                    daggerheartPane.style.display = 'none';
                    daggerheartNavItem.classList.remove('active');
                });
            }
        });
    }

    function formatTextWithNewlines(text) {
        if (!text) return '';
        return text
            .replace(/\\n/g, '\n')
            .replace(/^\n+|\n+$/g, '')
            .trim();
    }

    function extractMacroFields(macroText) {
        const fields = {};
        let index = 0;

        while (index < macroText.length) {
            let start = macroText.indexOf('{{', index);
            if (start === -1) break;
            start += 2;

            let end = macroText.indexOf('}}', start);
            if (end === -1) break;

            let content = macroText.substring(start, end);
            let equalIndex = content.indexOf('=');
            if (equalIndex !== -1) {
                let key = content.substring(0, equalIndex).trim().toLowerCase();
                let val = content.substring(equalIndex + 1).trim();
                fields[key] = val;
            }
            index = end + 2;
        }
        return fields;
    }

    function renderCheckboxesInText(text, abilIndex) {
        if (!text) return '';
        let cbCount = 0;
        let formatted = formatTextWithNewlines(text);

        return formatted.replace(/\(\s*[xX]?\s*\)/g, (match) => {
            const isChecked = match.toLowerCase().includes('x');
            const html = `<input type="checkbox" class="dh-level-checkbox" data-abil-idx="${abilIndex}" data-cb-idx="${cbCount}" ${isChecked ? 'checked' : ''}>`;
            cbCount++;
            return html;
        });
    }

    function formatDamageFormula(damageText, profVal) {
        if (!damageText) return '-';
        
        let clean = damageText
            .replace(/\[\[/g, '') .replace(/\]\]/g, '')
            .replace(/@\{proficiência\}/gi, profVal !== '-' ? `${profVal}` : '')
            .replace(/@\{proficiencia\}/gi, profVal !== '-' ? `${profVal}` : '')
            .replace(/\s+/g, ' ')
            .trim();

        return clean || '-';
    }

    function addNewMacroToRoll20(doc, prefix, promptMessage, customFullName = null) {
        const navTabs = doc.querySelector('.nav.nav-tabs');
        if (!navTabs) return;

        const attrTabNav = navTabs.querySelector('a[data-tab="attributesabilities"]');
        const pinkDaggerNav = navTabs.querySelector('a[data-tab="daggerheart"]');
        if (!attrTabNav) return;

        attrTabNav.click();

        setTimeout(() => {
            let fullMacroName = customFullName;
            let cleanName = '';

            if (!fullMacroName) {
                const itemName = prompt(promptMessage);
                if (!itemName || !itemName.trim()) {
                    if (pinkDaggerNav) pinkDaggerNav.click();
                    return;
                }
                cleanName = itemName.trim();
                fullMacroName = `${prefix}_${cleanName}`;
            } else {
                cleanName = customFullName;
            }

            const addAbilBtn = doc.querySelector('.attributesabilities .addabil') || doc.querySelector('.addabil');
            if (!addAbilBtn) {
                if (pinkDaggerNav) pinkDaggerNav.click();
                return;
            }

            addAbilBtn.click();

            setTimeout(() => {
                const abils = doc.querySelectorAll('.attributesabilities .abilities .abil');
                const newAbil = abils[abils.length - 1];

                if (newAbil) {
                    const editBtn = newAbil.querySelector('.editabil');
                    if (editBtn) editBtn.click();

                    setTimeout(() => {
                        const nameInput = newAbil.querySelector('.abilname input') || newAbil.querySelector('input.abilname');
                        const macroTextarea = newAbil.querySelector('textarea.action') || newAbil.querySelector('textarea');

                        if (nameInput) {
                            nameInput.value = fullMacroName;
                            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                            nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                            nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
                        }

                        if (macroTextarea) {
                            let templateKey = prefix;
                            let defaultTemplate = MACRO_TEMPLATES[templateKey] || MACRO_TEMPLATES.exp;
                            let customizedTemplate = defaultTemplate.replace(/\{\{name=[^\n\}]*/, `{{name=${cleanName}`);

                            macroTextarea.value = customizedTemplate;
                            macroTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                            macroTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                            macroTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
                        }

                        const saveBtn = newAbil.querySelector('.saveabil');
                        if (saveBtn) saveBtn.click();

                        setTimeout(() => {
                            if (pinkDaggerNav) pinkDaggerNav.click();
                            populateDaggerheartData(doc);
                        }, 200);
                    }, 150);
                } else {
                    if (pinkDaggerNav) pinkDaggerNav.click();
                    populateDaggerheartData(doc);
                }
            }, 200);
        }, 150);
    }

    function addNewAttributeToRoll20(doc, attrName, promptMessage, defaultVal = "0", hasMax = false) {
        const navTabs = doc.querySelector('.nav.nav-tabs');
        if (!navTabs) return;

        const attrTabNav = navTabs.querySelector('a[data-tab="attributesabilities"]');
        const pinkDaggerNav = navTabs.querySelector('a[data-tab="daggerheart"]');
        if (!attrTabNav) return;

        attrTabNav.click();

        setTimeout(() => {
            const userVal = prompt(promptMessage, defaultVal);
            if (userVal === null) {
                if (pinkDaggerNav) pinkDaggerNav.click();
                return;
            }

            const cleanVal = userVal.trim() || defaultVal;

            const addAttribBtn = doc.querySelector('.attributesabilities .addattrib') || doc.querySelector('.addattrib');
            if (!addAttribBtn) {
                if (pinkDaggerNav) pinkDaggerNav.click();
                return;
            }

            addAttribBtn.click();

            setTimeout(() => {
                const attribs = doc.querySelectorAll('.attributesabilities .attributes .attrib');
                const newAttrib = attribs[attribs.length - 1];

                if (newAttrib) {
                    const nameInput = newAttrib.querySelector('.attrname input') || newAttrib.querySelector('.attrname');
                    const currentInput = newAttrib.querySelector('.current input');
                    const maxInput = newAttrib.querySelector('.max input');

                    if (nameInput) {
                        if (nameInput.tagName.toLowerCase() === 'input') {
                            nameInput.value = attrName;
                        } else {
                            nameInput.innerText = attrName;
                        }
                        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                        nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
                    }

                    if (currentInput) {
                        currentInput.value = cleanVal;
                        currentInput.dispatchEvent(new Event('input', { bubbles: true }));
                        currentInput.dispatchEvent(new Event('change', { bubbles: true }));
                        currentInput.dispatchEvent(new Event('blur', { bubbles: true }));
                    }

                    if (maxInput && hasMax) {
                        maxInput.value = cleanVal;
                        maxInput.dispatchEvent(new Event('input', { bubbles: true }));
                        maxInput.dispatchEvent(new Event('change', { bubbles: true }));
                        maxInput.dispatchEvent(new Event('blur', { bubbles: true }));
                    }
                }

                if (pinkDaggerNav) {
                    pinkDaggerNav.click();
                }
                populateDaggerheartData(doc);
            }, 200);
        }, 150);
    }

    function populateDaggerheartData(doc) {
        const root = doc.getElementById('dh-content-root');
        if (!root) return;

        const nameInput = doc.querySelector('input.name');
        const charNameElem = doc.getElementById('dh-char-name');
        if (charNameElem && nameInput) {
            charNameElem.innerText = nameInput.value || 'Personagem sem Nome';
        }

        const attributeElements = doc.querySelectorAll('.attributesabilities .attributes .attrib');
        
        const fixedTraits = ['agilidade', 'força', 'acuidade', 'instinto', 'presença', 'conhecimento'];
        const fixedTrackers = ['vida', 'fadiga', 'armadura', 'esperança'];

        let traitsMap = {};
        let trackersMap = {};
        let defenses = { evasao: null, menor: null, maior: null };
        let unmappedStats = [];
        let moneyMap = { 
            punhado: { val: 0, input: null, exists: false }, 
            bolsa: { val: 0, input: null, exists: false }, 
            bau: { val: 0, input: null, exists: false } 
        };
        let nivelVal = null;
        let profVal = null;

        attributeElements.forEach(attr => {
            const nameElem = attr.querySelector('.attrname');
            const name = nameElem?.innerText?.trim() || (attr.querySelector('.attrname input')?.value?.trim() || '');
            const currentInput = attr.querySelector('.current input');
            const currentSpan = attr.querySelector('.current span');
            const currentVal = currentInput ? currentInput.value : (currentSpan ? currentSpan.innerText : '-');
            
            const maxInput = attr.querySelector('.max input');
            const maxSpan = attr.querySelector('.max span');
            const maxVal = maxInput ? maxInput.value : (maxSpan ? maxSpan.innerText : null);

            const lowerName = name.toLowerCase();

            if (fixedTraits.includes(lowerName)) {
                traitsMap[lowerName] = { current: currentVal, originalName: name, exists: true };
            } else if (fixedTrackers.includes(lowerName)) {
                trackersMap[lowerName] = { 
                    current: parseInt(currentVal, 10) || 0, 
                    max: parseInt(maxVal || currentVal, 10) || 0,
                    exists: true
                };
            } else if (lowerName === 'evasão' || lowerName === 'evasao') {
                defenses.evasao = { val: currentVal, exists: true };
            } else if (lowerName === 'limiar-menor' || lowerName === 'limiar menor') {
                defenses.menor = { val: currentVal, exists: true };
            } else if (lowerName === 'limiar-maior' || lowerName === 'limiar maior') {
                defenses.maior = { val: currentVal, exists: true };
            } else if (lowerName === 'nivel' || lowerName === 'nível') {
                nivelVal = currentVal;
            } else if (lowerName === 'proficiência' || lowerName === 'proficiencia') {
                profVal = currentVal;
            } else if (lowerName === 'punhado' || lowerName === 'moeda_punhado') {
                moneyMap.punhado = { val: parseInt(currentVal, 10) || 0, input: currentInput, exists: true };
            } else if (lowerName === 'bolsa' || lowerName === 'moeda_bolsa') {
                moneyMap.bolsa = { val: parseInt(currentVal, 10) || 0, input: currentInput, exists: true };
            } else if (lowerName === 'baú' || lowerName === 'bau' || lowerName === 'moeda_bau') {
                moneyMap.bau = { val: parseInt(currentVal, 10) || 0, input: currentInput, exists: true };
            } else if (name) {
                unmappedStats.push({ name, current: currentVal, max: maxVal, originalInput: currentInput });
            }
        });

        const nivelElem = doc.getElementById('dh-char-nivel');
        const profElem = doc.getElementById('dh-char-prof');

        if (nivelElem) {
            if (nivelVal !== null) {
                nivelElem.innerText = nivelVal;
            } else {
                nivelElem.innerHTML = `<button class="dh-add-missing-btn" id="dh-add-nivel-btn">+</button>`;
                doc.getElementById('dh-add-nivel-btn')?.addEventListener('click', () => {
                    addNewAttributeToRoll20(doc, "Nível", "Digite o Nível do personagem:", "1");
                });
            }
        }

        if (profElem) {
            if (profVal !== null) {
                profElem.innerText = profVal;
            } else {
                profElem.innerHTML = `<button class="dh-add-missing-btn" id="dh-add-prof-btn">+</button>`;
                doc.getElementById('dh-add-prof-btn')?.addEventListener('click', () => {
                    addNewAttributeToRoll20(doc, "Proficiência", "Digite a Proficiência do personagem:", "1");
                });
            }
        }

        let traitsHTML = '<div class="dh-section-title"><span>Atributos Principais</span></div><div class="dh-traits-grid" id="dh-traits-container">';
        fixedTraits.forEach(traitKey => {
            const data = traitsMap[traitKey];
            const displayName = traitKey.charAt(0).toUpperCase() + traitKey.slice(1);
            if (data && data.exists) {
                traitsHTML += `<div class="dh-trait-card" data-trait="${traitKey}"><div class="dh-trait-name">${displayName}</div><div class="dh-trait-val">${data.current}</div></div>`;
            } else {
                traitsHTML += `<div class="dh-trait-card" data-missing-attr="${traitKey}"><div class="dh-trait-name">${displayName}</div><button class="dh-add-missing-btn" style="margin-top:4px;">+</button></div>`;
            }
        });
        traitsHTML += '</div>';

        let statsHTML = '<div class="dh-section-title"><span>Recursos e Status</span></div><div class="dh-stats-grid">';
        fixedTrackers.forEach(trackerKey => {
            const item = trackersMap[trackerKey];
            const displayName = trackerKey.charAt(0).toUpperCase() + trackerKey.slice(1);
            
            if (item && item.exists) {
                const totalDots = Math.max(item.max, item.current, 1);
                let dotsHTML = '';
                for (let i = 1; i <= totalDots; i++) {
                    const isActive = i <= item.current ? 'active' : 'inactive';
                    dotsHTML += `<div class="dh-dot ${trackerKey} ${isActive}"></div>`;
                }
                statsHTML += `
                    <div class="dh-stat-box">
                        <div class="dh-stat-header">
                            <span class="dh-stat-label">${displayName}</span>
                            <span class="dh-stat-value">${item.current} / ${item.max}</span>
                        </div>
                        <div class="dh-dots-container">${dotsHTML}</div>
                    </div>
                `;
            } else {
                statsHTML += `
                    <div class="dh-stat-box">
                        <div class="dh-stat-header">
                            <span class="dh-stat-label">${displayName}</span>
                            <button class="dh-add-missing-btn" data-missing-tracker="${trackerKey}">+ Adicionar</button>
                        </div>
                        <div style="font-size: 0.75em; color: #718096; margin-top: 4px;">Não cadastrado</div>
                    </div>
                `;
            }
        });
        statsHTML += '</div>';

        const getDefHTML = (label, key) => {
            const def = defenses[key];
            if (def && def.exists) {
                return `<div class="dh-defense-item"><div class="dh-defense-sublabel">${label}</div><div class="dh-defense-val">${def.val}</div></div>`;
            } else {
                return `<div class="dh-defense-item"><div class="dh-defense-sublabel">${label}</div><button class="dh-add-missing-btn" data-missing-def="${key}">+</button></div>`;
            }
        };

        const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');
        let expCardsHTML = '';
        let expCount = 0;
        let heritageCardsHTML = '';
        let heritageCount = 0;
        let classCardsHTML = '';
        let classCount = 0;
        let weaponCardsHTML = '';
        let weaponCount = 0;
        let domainCardsHTML = '';
        let domainCount = 0;
        let levelCardsHTML = '';
        let levelCount = 0;
        let generalAbilitiesHTML = '<div class="dh-section-title"><span>Outros Macros</span></div><ul class="dh-abilities-list" id="dh-other-macros-container">';
        let validAbilitiesCount = 0;
        
        let inventoryText = '';
        let inventoryTextareaElem = null;

        if (abilityElements.length > 0) {
            abilityElements.forEach((abil, abilIdx) => {
                const nameElem = abil.querySelector('.abilname');
                const rawName = nameElem?.innerText?.trim() || (abil.querySelector('.abilname input')?.value?.trim() || '');
                const lowerName = rawName.toLowerCase();

                if (rawName.startsWith('=====')) {
                    return;
                }

                if (lowerName.startsWith('exp_')) {
                    expCount++;
                    const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                    const macroContent = macroTextarea ? macroTextarea.value : '';

                    const fields = extractMacroFields(macroContent);
                    const expName = fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.substring(4).trim();
                    const expMod = fields['modificador'] || fields['mod'] || '+0';

                    expCardsHTML += `
                        <div class="dh-exp-card" data-card-fullname="${rawName}">
                            <span class="dh-exp-name">${expName}</span>
                            <span class="dh-exp-mod">${expMod}</span>
                        </div>
                    `;
                } else if (lowerName.startsWith('anc_') || lowerName.startsWith('com_')) {
                    heritageCount++;
                    let typeTag = lowerName.startsWith('anc_') ? 'ANCESTRALIDADE' : 'COMUNIDADE';

                    const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                    const macroContent = macroTextarea ? macroTextarea.value : '';

                    const fields = extractMacroFields(macroContent);
                    let cardTitle = fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.substring(4).trim();
                    let effectsHTML = '';

                    Object.keys(fields).forEach(key => {
                        if (key !== 'name') {
                            const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                            effectsHTML += `<div class="dh-heritage-effect"><span class="dh-heritage-effect-name">${formattedKey}:</span>${formatTextWithNewlines(fields[key])}</div>`;
                        }
                    });

                    heritageCardsHTML += `<div class="dh-heritage-card" data-card-fullname="${rawName}"><div class="dh-heritage-tag">${typeTag}</div><div class="dh-heritage-title">${cardTitle}</div>${effectsHTML || '<div class="dh-heritage-effect">Sem efeitos informados.</div>'}</div>`;
                } else if (lowerName.startsWith('cla_')) {
                    classCount++;
                    const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                    const macroContent = macroTextarea ? macroTextarea.value : '';

                    const fields = extractMacroFields(macroContent);
                    let cardTitle = fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.substring(4).trim();
                    let effectsHTML = '';

                    Object.keys(fields).forEach(key => {
                        if (key !== 'name') {
                            const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                            effectsHTML += `<div class="dh-heritage-effect"><span class="dh-heritage-effect-name">${formattedKey}:</span>${formatTextWithNewlines(fields[key])}</div>`;
                        }
                    });

                    classCardsHTML += `<div class="dh-heritage-card" data-card-fullname="${rawName}"><div class="dh-heritage-tag">CLASSE</div><div class="dh-heritage-title">${cardTitle}</div>${effectsHTML || '<div class="dh-heritage-effect">Sem efeitos informados.</div>'}</div>`;
                } else if (lowerName.startsWith('lvl_')) {
                    levelCount++;
                    const fallbackName = rawName.substring(4).trim();
                    const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                    const macroContent = macroTextarea ? macroTextarea.value : '';

                    const fields = extractMacroFields(macroContent);
                    const levelTitle = fields['name'] ? formatTextWithNewlines(fields['name']) : fallbackName;
                    let blocksHTML = '';

                    Object.keys(fields).forEach(key => {
                        if (key !== 'name') {
                            const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                            const renderedText = renderCheckboxesInText(fields[key], abilIdx);
                            blocksHTML += `
                                <div class="dh-level-block">
                                    <span class="dh-level-block-name">${formattedKey}:</span>
                                    <div class="dh-level-block-text">${renderedText}</div>
                                </div>
                            `;
                        }
                    });

                    levelCardsHTML += `
                        <div class="dh-level-card" data-abil-idx="${abilIdx}">
                            <div class="dh-level-title">${levelTitle}</div>
                            ${blocksHTML || '<div class="dh-level-block">Sem dados.</div>'}
                        </div>
                    `;
                } else if (lowerName === 'inventario' || lowerName === 'inventário' || lowerName === 'inv_inventario') {
                    inventoryTextareaElem = abil.querySelector('textarea, input[name*="action"]');
                    inventoryText = inventoryTextareaElem ? inventoryTextareaElem.value : '';
                } else if (lowerName.startsWith('wea_')) {
                    weaponCount++;
                    const fallbackName = rawName.substring(4).trim();
                    const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                    const macroContent = macroTextarea ? macroTextarea.value : '';

                    const traitMatch = macroContent.match(/#Atributo-([^\s{]+)/i);
                    const weaponTrait = traitMatch ? traitMatch[1].trim() : 'ATAQUE';

                    const fields = extractMacroFields(macroContent);
                    const weaponTitle = fields['name'] ? formatTextWithNewlines(fields['name']) : fallbackName;
                    const weaponDamageRaw = fields['dano'] || fields['damage'] || '';
                    const weaponDesc = fields['desc'] || fields['descrição'] || fields['descricao'] || '';

                    const formattedDamage = formatDamageFormula(weaponDamageRaw, profVal || '-');

                    weaponCardsHTML += `
                        <div class="dh-weapon-card" data-card-fullname="${rawName}">
                            <div class="dh-weapon-header">
                                <span class="dh-weapon-trait-tag">${weaponTrait}</span>
                                <span class="dh-weapon-damage-tag">${formattedDamage}</span>
                            </div>
                            <div class="dh-weapon-title">${weaponTitle}</div>
                            ${weaponDesc ? `<div class="dh-weapon-desc">${formatTextWithNewlines(weaponDesc)}</div>` : ''}
                        </div>
                    `;
                } else if (lowerName.startsWith('dom_')) {
                    domainCount++;
                    const cardName = rawName.substring(4).trim();
                    const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                    const macroContent = macroTextarea ? macroTextarea.value : '';

                    const fields = extractMacroFields(macroContent);
                    const cardNivel = fields['nível'] || fields['nivel'] ? formatTextWithNewlines(fields['nível'] || fields['nivel']) : '-';
                    const cardCusto = fields['custo'] ? formatTextWithNewlines(fields['custo']) : '-';
                    const cardDesc = fields['descrição'] || fields['descricao'] ? formatTextWithNewlines(fields['descrição'] || fields['descricao']) : 'Sem descrição.';

                    domainCardsHTML += `<div class="dh-domain-card" data-card-fullname="${rawName}"><div class="dh-domain-header"><span>Nível: ${cardNivel}</span><span>Custo: ${cardCusto}</span></div><div class="dh-domain-name">${cardName}</div><div class="dh-domain-desc">${cardDesc}</div></div>`;
                } else if (!fixedTraits.includes(lowerName) && rawName !== '') {
                    validAbilitiesCount++;
                    generalAbilitiesHTML += `<li class="dh-ability-item" data-card-fullname="${rawName}"><span>${rawName}</span></li>`;
                }
            });
        }

        let defensesHTML = `
            <div class="dh-top-row-grid">
                <div class="dh-defenses-box">
                    <div class="dh-defenses-header">Defesas e Limiares</div>
                    <div class="dh-defenses-content">
                        <div class="dh-defense-row-full">
                            ${getDefHTML('Evasão', 'evasao')}
                        </div>
                        <div class="dh-defense-row-split">
                            ${getDefHTML('L. Menor', 'menor')}
                            ${getDefHTML('L. Maior', 'maior')}
                        </div>
                    </div>
                </div>
                <div class="dh-experiences-box">
                    <div class="dh-experiences-header">
                        <span>Experiências</span>
                        <button class="dh-add-btn" id="dh-add-exp" title="Adicionar Experiência">+</button>
                    </div>
                    <div class="dh-experiences-grid" id="dh-experiences-container">
                        ${expCount > 0 ? expCardsHTML : '<span style="color: #718096; font-size: 0.8em;">Nenhuma experiência cadastrada.</span>'}
                    </div>
                </div>
            </div>
        `;

        let othersHTML = '';
        if (unmappedStats.length > 0) {
            othersHTML = '<div class="dh-section-title"><span>Outros Atributos e Recursos (Personalizados)</span></div><div class="dh-others-grid" id="dh-others-container">';
            unmappedStats.forEach((stat, index) => {
                othersHTML += `
                    <div class="dh-other-box" data-index="${index}">
                        <span><strong>${stat.name}:</strong></span>
                        <div class="dh-spinner-group">
                            <input type="text" class="dh-spinner-input" value="${stat.current}" readonly>
                            <div class="dh-spinner-btns">
                                <button class="dh-spin-btn dh-btn-up">▲</button>
                                <button class="dh-spin-btn dh-btn-down">▼</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            othersHTML += '</div>';
        }

        let finalHeritageHTML = `
            <div class="dh-section-title">
                <span>Herança (Ancestralidade & Comunidade)</span>
                <div style="display: flex; gap: 5px;">
                    <button class="dh-add-btn" id="dh-add-anc" title="Adicionar Ancestralidade" style="font-size: 0.75em; padding: 2px 6px;">+ Ancestralidade</button>
                    <button class="dh-add-btn" id="dh-add-com" title="Adicionar Comunidade" style="font-size: 0.75em; padding: 2px 6px;">+ Comunidade</button>
                </div>
            </div>
            <div class="dh-heritage-grid" id="dh-heritage-container">
                ${heritageCount > 0 ? heritageCardsHTML : '<span style="color: #718096; font-size: 0.8em; grid-column: 1/-1;">Nenhuma herança cadastrada.</span>'}
            </div>
        `;

        let finalClassHTML = `
            <div class="dh-section-title">
                <span>Classe</span>
                <button class="dh-add-btn" id="dh-add-class" title="Adicionar Habilidade de Classe">+</button>
            </div>
            <div class="dh-heritage-grid" id="dh-class-container">
                ${classCount > 0 ? classCardsHTML : '<span style="color: #718096; font-size: 0.8em; grid-column: 1/-1;">Nenhuma habilidade de classe cadastrada.</span>'}
            </div>
        `;

        let finalWeaponsHTML = `
            <div class="dh-section-title">
                <span>Armas</span>
                <button class="dh-add-btn" id="dh-add-weapon" title="Adicionar Arma">+</button>
            </div>
            <div class="dh-weapons-grid" id="dh-weapons-container">
                ${weaponCount > 0 ? weaponCardsHTML : '<span style="color: #718096; font-size: 0.8em; grid-column: 1/-1;">Nenhuma arma cadastrada.</span>'}
            </div>
        `;

        let finalDomainsHTML = `
            <div class="dh-section-title">
                <span>Cartas de Domínio</span>
                <button class="dh-add-btn" id="dh-add-domain" title="Adicionar Carta de Domínio">+</button>
            </div>
            <div class="dh-domains-grid" id="dh-domains-container">
                ${domainCount > 0 ? domainCardsHTML : '<span style="color: #718096; font-size: 0.8em; grid-column: 1/-1;">Nenhuma carta de domínio cadastrada.</span>'}
            </div>
        `;

        const getMoneyHtml = (key, label) => {
            const m = moneyMap[key];
            if (m.exists) {
                return `
                    <div class="dh-money-item">
                        <span class="dh-money-label">${label}</span>
                        <div class="dh-spinner-group">
                            <input type="text" class="dh-spinner-input" id="dh-money-${key}" value="${m.val}" readonly>
                            <div class="dh-spinner-btns">
                                <button class="dh-spin-btn" id="dh-${key}-up">▲</button>
                                <button class="dh-spin-btn" id="dh-${key}-down">▼</button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="dh-money-item">
                        <span class="dh-money-label">${label}</span>
                        <button class="dh-add-missing-btn" data-missing-money="${key}">+ Adicionar</button>
                    </div>
                `;
            }
        };

        const inventoryHTML = `
            <div class="dh-section-title">
                <span>Inventário e Moedas</span>
                ${!inventoryTextareaElem ? '<button class="dh-add-btn" id="dh-add-inv" title="Criar Campo de Inventário no Roll20">+</button>' : ''}
            </div>
            <div class="dh-inventory-grid">
                <div class="dh-inventory-textbox">
                    <span class="dh-inventory-label">Inventário</span>
                    <textarea class="dh-inventory-textarea" id="dh-inv-text" ${!inventoryTextareaElem ? 'disabled' : ''} placeholder="${inventoryTextareaElem ? 'Digite os itens do inventário aqui...' : 'Clique no botão + acima para criar o campo de inventário primeiro.'}">${inventoryText}</textarea>
                </div>
                <div class="dh-money-box" id="dh-money-container">
                    <span class="dh-inventory-label" style="text-align: center;">Dinheiro</span>
                    ${getMoneyHtml('punhado', 'Punhado')}
                    ${getMoneyHtml('bolsa', 'Bolsa')}
                    ${getMoneyHtml('bau', 'Baú')}
                </div>
            </div>
        `;

        let finalLevelHTML = '';
        if (levelCount > 0) {
            finalLevelHTML = `<div class="dh-section-title"><span>Passando de Nível</span></div><div class="dh-level-grid" id="dh-level-container">${levelCardsHTML}</div>`;
        }

        if (validAbilitiesCount === 0) {
            generalAbilitiesHTML += '<li style="color: #718096; padding: 5px;">Nenhum outro macro cadastrado.</li>';
        }
        generalAbilitiesHTML += '</ul>';

        root.innerHTML = traitsHTML + statsHTML + defensesHTML + othersHTML + finalHeritageHTML + finalClassHTML + finalWeaponsHTML + finalDomainsHTML + inventoryHTML + generalAbilitiesHTML + finalLevelHTML;

        const invTextarea = root.querySelector('#dh-inv-text');
        if (invTextarea && inventoryTextareaElem) {
            invTextarea.addEventListener('input', () => {
                updateOriginalInput(inventoryTextareaElem, invTextarea.value);
            });
        }

        const addInvBtn = root.querySelector('#dh-add-inv');
        if (addInvBtn) {
            addInvBtn.addEventListener('click', () => {
                addNewMacroToRoll20(doc, 'inv', null, 'inventario');
            });
        }

        root.querySelectorAll('[data-missing-attr]').forEach(el => {
            el.querySelector('button').addEventListener('click', () => {
                const attrName = el.getAttribute('data-missing-attr');
                const properName = attrName.charAt(0).toUpperCase() + attrName.slice(1);
                addNewAttributeToRoll20(doc, properName, `Valor inicial para ${properName}:`, "0", false);
            });
        });

        root.querySelectorAll('[data-missing-tracker]').forEach(btn => {
            btn.addEventListener('click', () => {
                const trackerName = btn.getAttribute('data-missing-tracker');
                const properName = trackerName.charAt(0).toUpperCase() + trackerName.slice(1);
                addNewAttributeToRoll20(doc, properName, `Valor total/máximo de ${properName}:`, "6", true);
            });
        });

        root.querySelectorAll('[data-missing-def]').forEach(btn => {
            btn.addEventListener('click', () => {
                const defKey = btn.getAttribute('data-missing-def');
                let attrName = "Evasão";
                let defaultVal = "10";
                if (defKey === 'menor') { attrName = "Limiar-Menor"; defaultVal = "5"; }
                if (defKey === 'maior') { attrName = "Limiar-Maior"; defaultVal = "10"; }
                addNewAttributeToRoll20(doc, attrName, `Valor inicial para ${attrName}:`, defaultVal, false);
            });
        });

        root.querySelectorAll('[data-missing-money]').forEach(btn => {
            btn.addEventListener('click', () => {
                const moneyKey = btn.getAttribute('data-missing-money');
                const properName = moneyKey.charAt(0).toUpperCase() + moneyKey.slice(1);
                addNewAttributeToRoll20(doc, `moeda_${moneyKey}`, `Quantidade inicial de moedas em ${properName}:`, "0", false);
            });
        });

        const addExpBtn = root.querySelector('#dh-add-exp');
        if (addExpBtn) addExpBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'exp', 'Nome da nova Experiência:'));

        const addAncBtn = root.querySelector('#dh-add-anc');
        if (addAncBtn) addAncBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'anc', 'Nome da nova Ancestralidade:'));

        const addComBtn = root.querySelector('#dh-add-com');
        if (addComBtn) addComBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'com', 'Nome da nova Comunidade:'));

        const addClassBtn = root.querySelector('#dh-add-class');
        if (addClassBtn) addClassBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'cla', 'Nome da nova Habilidade de Classe:'));

        const addWeaponBtn = root.querySelector('#dh-add-weapon');
        if (addWeaponBtn) addWeaponBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'wea', 'Nome da nova Arma:'));

        const addDomainBtn = root.querySelector('#dh-add-domain');
        if (addDomainBtn) addDomainBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'dom', 'Nome da nova Carta de Domínio:'));

        if (moneyMap.punhado.exists) setupMoneyControl(root, 'punhado', moneyMap.punhado);
        if (moneyMap.bolsa.exists) setupMoneyControl(root, 'bolsa', moneyMap.bolsa);
        if (moneyMap.bau.exists) setupMoneyControl(root, 'bau', moneyMap.bau);

        const traitsContainer = root.querySelector('#dh-traits-container');
        if (traitsContainer) {
            traitsContainer.querySelectorAll('.dh-trait-card[data-trait]').forEach(card => {
                card.addEventListener('click', () => {
                    const traitKey = card.getAttribute('data-trait');
                    triggerRollForAbilityName(doc, traitKey);
                });
            });
        }

        const experiencesContainer = root.querySelector('#dh-experiences-container');
        if (experiencesContainer) {
            experiencesContainer.querySelectorAll('.dh-exp-card').forEach(card => {
                card.addEventListener('click', () => {
                    const fullName = card.getAttribute('data-card-fullname');
                    triggerRollForAbilityName(doc, fullName);
                });
            });
        }

        const heritageContainer = root.querySelector('#dh-heritage-container');
        if (heritageContainer) {
            heritageContainer.querySelectorAll('.dh-heritage-card').forEach(card => {
                card.addEventListener('click', () => {
                    const fullName = card.getAttribute('data-card-fullname');
                    triggerRollForAbilityName(doc, fullName);
                });
            });
        }

        const classContainer = root.querySelector('#dh-class-container');
        if (classContainer) {
            classContainer.querySelectorAll('.dh-heritage-card').forEach(card => {
                card.addEventListener('click', () => {
                    const fullName = card.getAttribute('data-card-fullname');
                    triggerRollForAbilityName(doc, fullName);
                });
            });
        }

        const weaponsContainer = root.querySelector('#dh-weapons-container');
        if (weaponsContainer) {
            weaponsContainer.querySelectorAll('.dh-weapon-card').forEach(card => {
                card.addEventListener('click', () => {
                    const fullName = card.getAttribute('data-card-fullname');
                    triggerRollForAbilityName(doc, fullName);
                });
            });
        }

        const domainsContainer = root.querySelector('#dh-domains-container');
        if (domainsContainer) {
            domainsContainer.querySelectorAll('.dh-domain-card').forEach(card => {
                card.addEventListener('click', () => {
                    const fullName = card.getAttribute('data-card-fullname');
                    triggerRollForAbilityName(doc, fullName);
                });
            });
        }

        const otherMacrosContainer = root.querySelector('#dh-other-macros-container');
        if (otherMacrosContainer) {
            otherMacrosContainer.querySelectorAll('.dh-ability-item').forEach(item => {
                item.addEventListener('click', () => {
                    const fullName = item.getAttribute('data-card-fullname');
                    if (fullName) {
                        triggerRollForAbilityName(doc, fullName);
                    }
                });
            });
        }

        const levelContainer = root.querySelector('#dh-level-container');
        if (levelContainer) {
            levelContainer.querySelectorAll('.dh-level-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const abilIdx = cb.getAttribute('data-abil-idx');
                    const targetAbil = abilityElements[abilIdx];
                    if (!targetAbil) return;

                    const macroTextarea = targetAbil.querySelector('textarea, input[name*="action"]');
                    if (!macroTextarea) return;

                    let currentVal = macroTextarea.value;
                    let targetCbIndex = parseInt(cb.getAttribute('data-cb-idx'), 10);
                    let count = 0;

                    let newVal = currentVal.replace(/\(\s*[xX]?\s*\)/g, (match) => {
                        if (count === targetCbIndex) {
                            count++;
                            return e.target.checked ? '(X)' : '( )';
                        }
                        count++;
                        return match;
                    });

                    updateOriginalInput(macroTextarea, newVal);
                });
            });
        }

        if (unmappedStats.length > 0) {
            const othersContainer = root.querySelector('#dh-others-container');
            othersContainer.querySelectorAll('.dh-other-box').forEach(box => {
                const index = box.getAttribute('data-index');
                const statObj = unmappedStats[index];
                const inputElem = box.querySelector('.dh-spinner-input');

                box.querySelector('.dh-btn-up').addEventListener('click', () => {
                    let val = parseInt(inputElem.value, 10);
                    if (isNaN(val)) val = 0;
                    val++;
                    inputElem.value = val;
                    updateOriginalInput(statObj.originalInput, val);
                });

                box.querySelector('.dh-btn-down').addEventListener('click', () => {
                    let val = parseInt(inputElem.value, 10);
                    if (isNaN(val)) val = 0;
                    val--;
                    inputElem.value = val;
                    updateOriginalInput(statObj.originalInput, val);
                });
            });
        }
    }

    function setupMoneyControl(root, key, moneyObj) {
        const inputElem = root.querySelector(`#dh-money-${key}`);
        const btnUp = root.querySelector(`#dh-${key}-up`);
        const btnDown = root.querySelector(`#dh-${key}-down`);

        if (btnUp && btnDown && inputElem) {
            btnUp.addEventListener('click', () => {
                let val = parseInt(inputElem.value, 10);
                if (isNaN(val)) val = 0;
                val++;
                inputElem.value = val;
                if (moneyObj.input) updateOriginalInput(moneyObj.input, val);
            });

            btnDown.addEventListener('click', () => {
                let val = parseInt(inputElem.value, 10);
                if (isNaN(val)) val = 0;
                if (val > 0) val--;
                inputElem.value = val;
                if (moneyObj.input) updateOriginalInput(moneyObj.input, val);
            });
        }
    }

    function triggerRollForAbilityName(doc, targetName) {
        const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');
        let targetFound = false;
        const normalizedTarget = targetName.trim().toLowerCase();

        abilityElements.forEach(abil => {
            const nameElem = abil.querySelector('.abilname');
            const name = nameElem?.innerText?.trim().toLowerCase() || (abil.querySelector('input.abilname')?.value?.trim().toLowerCase() || '');

            if (name === normalizedTarget) {
                const rollBtn = abil.querySelector('button[type="roll"], .btn, a, [role="button"]') || nameElem;
                if (rollBtn) {
                    rollBtn.click();
                    targetFound = true;
                }
            }
        });

        if (!targetFound) {
            console.warn(`Habilidade/Rolagem "${targetName}" não foi encontrada na aba nativa de Habilidades.`);
        }
    }

    function updateOriginalInput(originalInput, newValue) {
        if (!originalInput) return;
        originalInput.value = newValue;
        originalInput.dispatchEvent(new Event('input', { bubbles: true }));
        originalInput.dispatchEvent(new Event('change', { bubbles: true }));
        originalInput.blur();
    }

    setInterval(() => {
        initDaggerheartTab(document);

        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                if (iframe.contentDocument) {
                    initDaggerheartTab(iframe.contentDocument);
                }
            } catch (err) {}
        });
    }, 1000);

})();