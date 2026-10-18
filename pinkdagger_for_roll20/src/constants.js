// Templates de macros padrão para novos itens
const MACRO_TEMPLATES = {
    anc: `&{template:default} {{name=Nome da Ancestralidade\n}} {{Nome do Efeito 1=Efeito ou bônus concedido.\n}} {{Nome do Efeito 2=Efeito ou bônus concedido.\n}}`,
    com: `&{template:default} {{name=Nome da Comunidade\n}} {{Nome do Efeito=Efeito ou bônus concedido.\n}}`,
    cla: `&{template:default} {{name=Nome da Classe\n}} {{Nome da habilidade=O que a habilidade faz.\n}}`,
    sub: `&{template:default} {{name=Nome da Subclasse\n}} {{Conjuração=Atributo\n}} {{Nome do Efeito=O que a habilidade faz.\n}}`,
    esp: `&{template:default} {{name=Nome da Habilidade\n}} {{O que a habilidade faz.\n}}`,
    wea: `#Atributo-Agilidade &{template:default} {{name=Nome da Arma\n}} {{dano=[[@{proficiência}d8 + 0]]\n}} {{desc=<OPCIONAL> Efeito crítico ou alcance.\n}}`,
    dom: `&{template:default} {{name=Nome da Carta\n}} {{Nível=1\n}} {{Custo=0\n}} {{Descrição=O que a carta de domínio faz.\n}}`,
    exp: `&{template:default} {{name=Nome da Experiência\n}} {{Modificador=+2\n}}`,
    inv: `Itens:`
};

// Atributos principais e recursos/trackers fixos do sistema Daggerheart
const FIXED_TRAITS = ['agilidade', 'força', 'acuidade', 'instinto', 'presença', 'conhecimento'];
const FIXED_TRACKERS = ['vida', 'fadiga', 'armadura', 'esperança'];

