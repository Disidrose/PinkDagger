function normalizePdfText(text) {
    if (!text) return '';
    return text
        .replace(/[\uFB00]/g, 'ff')
        .replace(/[\uFB01]/g, 'fi')
        .replace(/[\uFB02]/g, 'fl')
        .replace(/[\uFB03]/g, 'ffi')
        .replace(/[\uFB04]/g, 'ffl')
        .replace(/[\u2212\u2013\u2014]/g, '-') // Converte travessões e sinal matemático de menos para '-'
        .replace(/Difi\s*culdade/gi, 'Dificuldade')
        // Ligaduras do PDF que viram "fi éis", "fi cam", "infl uência" ao copiar
        .replace(/(f[il]) (?=[a-zà-ÿ])/g, '$1')
        .replace(/[ \t]+/g, ' ')
        .replace(/\r\n/g, '\n');
}

function parseNpcBookText(rawInput) {
    if (!rawInput) return null;
    const text = normalizePdfText(rawInput);
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('___'));

    if (lines.length === 0) return null;

    const result = {
        name: '',
        tipo: '',
        tier: '',
        flavor: '',
        motiv_tatic: '',
        dificuldade: '',
        limiares: '',
        vida: '',
        fadiga: '',
        atq: '',
        nome_ataque: '',
        alcance: '',
        dano: '',
        tipo_dano: '',
        experiencias: [], // { name, mod }
        habilidades: []   // { name, desc }
    };

    let lineIndex = 0;

    // 1. Linha do Nome (geralmente a primeira linha)
    const patamarRegex = /(Solo|Lacaio|Bruto|Líder|Lider|Atirador|Capanga|Elite|Apoio|[A-Za-zÀ-ÿ]+)\s*\((?:(\d+)[ºªo]?\s*patamar|Tier\s*(\d+))\)/i;

    if (lines.length > 1 && patamarRegex.test(lines[1])) {
        result.name = lines[0].replace(/,\s*$/, '').trim();
        lineIndex = 1;
    } else if (patamarRegex.test(lines[0])) {
        lineIndex = 0;
    } else {
        result.name = lines[0];
        lineIndex = 1;
    }

    // 2. Tipo e Tier
    if (lineIndex < lines.length) {
        const typeMatch = lines[lineIndex].match(patamarRegex);
        if (typeMatch) {
            result.tipo = typeMatch[1].trim();
            result.tier = typeMatch[2] || typeMatch[3] || '1';
            lineIndex++;
        }
    }

    // 3. Flavor (Descrição) e Motivações e Táticas
    const flavorLines = [];
    let motivFound = false;

    for (; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        if (/dificuldade/i.test(line) || (/\bPV\b/i.test(line) && /\bPF\b/i.test(line))) {
            break;
        }
        if (/^ATQ:/i.test(line)) {
            break;
        }
        if (/^HABILIDADES/i.test(line)) {
            break;
        }

        const motivMatch = line.match(/^Motivações\s+e\s+táticas:\s*(.*)$/i) || line.match(/^Motivacoes\s+e\s+taticas:\s*(.*)$/i);
        if (motivMatch) {
            motivFound = true;
            result.motiv_tatic = motivMatch[1].trim();
            continue;
        }

        if (motivFound) {
            result.motiv_tatic += (result.motiv_tatic ? ' ' : '') + line;
        } else {
            flavorLines.push(line);
        }
    }

    result.flavor = flavorLines.join(' ').trim();

    // 4. Dificuldade, Limiares, Vida (PV), Fadiga (PF)
    for (; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        if (/^ATQ:/i.test(line) || /^HABILIDADES/i.test(line)) break;

        const difMatch = line.match(/dificuldade:\s*(\d+)/i);
        if (difMatch) {
            result.dificuldade = difMatch[1];
        }

        const limMatch = line.match(/Limiar(?:es)?:\s*([^\s|]+)/i);
        if (limMatch) {
            result.limiares = limMatch[1].trim();
        }

        const pvMatch = line.match(/(\d+)\s*PV\b/i);
        if (pvMatch) {
            result.vida = pvMatch[1];
        }

        const pfMatch = line.match(/(\d+)\s*PF\b/i);
        if (pfMatch) {
            result.fadiga = pfMatch[1];
        }
    }

    // 5. Linha de ATQ (Ataque, Alcance, Dano, Tipo do Dano)
    for (; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        if (/^Experiências:/i.test(line) || /^HABILIDADES/i.test(line)) break;

        if (/^ATQ:/i.test(line)) {
            const parts = line.split('|').map(p => p.trim());
            const atqMatch = parts[0].match(/ATQ:\s*([+-]?\d+)/i);
            if (atqMatch) {
                result.atq = atqMatch[1].replace(/^\+/, '');
            }

            if (parts.length > 1) {
                const weaponPart = parts[1];
                const colonIdx = weaponPart.indexOf(':');
                if (colonIdx !== -1) {
                    result.nome_ataque = weaponPart.substring(0, colonIdx).trim();
                    result.alcance = weaponPart.substring(colonIdx + 1).trim();
                } else {
                    result.nome_ataque = weaponPart;
                }
            }

            if (parts.length > 2) {
                const damagePart = parts[2].trim();
                const dmgMatch = damagePart.match(/^([0-9dD+\- ]+)\s*(.*)$/);
                if (dmgMatch) {
                    result.dano = dmgMatch[1].replace(/\s+/g, '').trim();
                    result.tipo_dano = dmgMatch[2] ? dmgMatch[2].trim() : '';
                } else {
                    result.dano = damagePart;
                }
            }
        }
    }

    // 6. Experiências (podem quebrar em mais de uma linha)
    let expText = '';
    for (; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        if (/^HABILIDADES/i.test(line)) break;

        const expMatch = line.match(/^Experi[êe]ncias:\s*(.+)$/i);
        if (expMatch) {
            expText = expMatch[1];
        } else if (expText) {
            expText += ' ' + line;
        }
    }
    expText.split(',').forEach(item => {
        const m = item.trim().match(/^(.+?)\s*([+-]\d+)$/);
        if (m) {
            result.experiencias.push({
                name: m[1].trim(),
                mod: m[2].trim()
            });
        }
    });

    // 7. Habilidades
    let inHabilidades = false;
    let currentHab = null;

    for (; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        if (/^HABILIDADES/i.test(line)) {
            inHabilidades = true;
            continue;
        }

        if (!inHabilidades) continue;

        const habStartMatch = line.match(/^([A-ZÀ-ÿ0-9][^:\n]+?\s*\([^)]+\)(?:\s*\([^)]+\))*):\s*(.*)$/);
        const habAltMatch = !habStartMatch ? line.match(/^([A-ZÀ-ÿ0-9][^:\n]{2,40}):\s*(.*)$/) : null;
        const matched = habStartMatch || habAltMatch;

        if (matched) {
            if (currentHab) {
                result.habilidades.push(currentHab);
            }
            currentHab = {
                name: matched[1].trim(),
                desc: matched[2].trim()
            };
        } else if (currentHab) {
            currentHab.desc += (currentHab.desc ? ' ' : '') + line;
        }
    }

    if (currentHab) {
        result.habilidades.push(currentHab);
    }

    return result;
}

