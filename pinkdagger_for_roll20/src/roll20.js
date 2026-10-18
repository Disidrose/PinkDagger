function updateOriginalInput(originalInput, newValue) {
    if (!originalInput) return;
    originalInput.value = newValue;
    originalInput.dispatchEvent(new Event('input', { bubbles: true }));
    originalInput.dispatchEvent(new Event('change', { bubbles: true }));
    originalInput.blur();
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

function createAttributeMacroInRoll20(doc, attrName, callback) {
    const addAbilBtn = doc.querySelector('.attributesabilities .addabil') || doc.querySelector('.addabil');
    if (!addAbilBtn) {
        if (callback) callback();
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
                    nameInput.value = attrName.toLowerCase();
                    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
                }

                if (macroTextarea) {
                    macroTextarea.value = `#Atributo-${attrName}`;
                    macroTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                    macroTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                    macroTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
                }

                const saveBtn = newAbil.querySelector('.saveabil');
                if (saveBtn) saveBtn.click();

                setTimeout(() => {
                    if (callback) callback();
                }, 150);
            }, 150);
        } else {
            if (callback) callback();
        }
    }, 150);
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

function addNewAttributeToRoll20(doc, attrName, promptMessage, defaultVal = "0", hasMax = false, isPrincipalTrait = false) {
    const navTabs = doc.querySelector('.nav.nav-tabs');
    if (!navTabs) return;

    const attrTabNav = navTabs.querySelector('a[data-tab="attributesabilities"]');
    const pinkDaggerNav = navTabs.querySelector('a[data-tab="daggerheart"]');
    if (!attrTabNav) return;

    attrTabNav.click();

    setTimeout(() => {
        // Se attrName não foi informado, pede o nome ao usuário
        let resolvedAttrName = attrName;
        if (!resolvedAttrName) {
            resolvedAttrName = prompt(promptMessage);
            if (!resolvedAttrName || !resolvedAttrName.trim()) {
                if (pinkDaggerNav) pinkDaggerNav.click();
                return;
            }
            resolvedAttrName = resolvedAttrName.trim();
        }

        const userVal = prompt(`Valor inicial para ${resolvedAttrName}:`, defaultVal);
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
                        nameInput.value = resolvedAttrName;
                    } else {
                        nameInput.innerText = resolvedAttrName;
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

            // Se for um Atributo Principal, adiciona o macro correspondente (#Atributo-Nome)
            if (isPrincipalTrait) {
                createAttributeMacroInRoll20(doc, resolvedAttrName, () => {
                    if (pinkDaggerNav) pinkDaggerNav.click();
                    populateDaggerheartData(doc);
                });
            } else {
                if (pinkDaggerNav) pinkDaggerNav.click();
                populateDaggerheartData(doc);
            }
        }, 200);
    }, 150);
}

