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
        } else {
            let val = content.trim();
            if (val) {
                fields['__raw_desc__'] = val;
            }
        }
        index = end + 2;
    }
    return fields;
}

function extractMacroFieldsList(macroText) {
    const fieldsList = [];
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
            let key = content.substring(0, equalIndex).trim();
            let val = content.substring(equalIndex + 1).trim();
            fieldsList.push({
                key: key,
                value: val,
                isName: key.toLowerCase() === 'name'
            });
        } else {
            let val = content.trim();
            if (val) {
                fieldsList.push({
                    key: 'Efeito',
                    value: val,
                    isName: false
                });
            }
        }
        index = end + 2;
    }
    return fieldsList;
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

function resolveMacroVariables(text, attrMap = {}) {
    if (!text) return '';
    let result = text;
    // Substitui variáveis do Roll20 @{nome}
    result = result.replace(/@\{([^}]+)\}/gi, (match, attrName) => {
        const cleanKey = attrName.trim().toLowerCase();
        if (attrMap[cleanKey] !== undefined && attrMap[cleanKey] !== null && attrMap[cleanKey] !== '') {
            return attrMap[cleanKey];
        }
        return '';
    });
    // Remove os colchetes inline roll [[ e ]]
    result = result.replace(/\[\[/g, '').replace(/\]\]/g, '');
    // Limpa espaços duplicados
    result = result.replace(/\s+/g, ' ').trim();
    return result;
}

