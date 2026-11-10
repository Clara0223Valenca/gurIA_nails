import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../frontend/', import.meta.url));
const slug = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const categories = [
  ['classics', 'Clássicos', '✦', 'Francesinha tradicional|Francesinha diagonal|Francesinha reversa|Francesinha dupla|Francesinha ondulada|Francesinha em V|Francesinha colorida|Francesinha sorriso|Rendas|Triângulos|Bolinha|Estrelas|Estrelas cadentes|Corações|Meias-luas|Linhas verticais|Linhas horizontais|Linhas diagonais|Linhas onduladas|Linhas curvas|Ondas|Xadrez|Listras|Poá|Geométricos abstratos|Formas orgânicas|Pontilhados|Losangos|Quadrados|Círculos|Pérolas|Laços minimalistas|Linhas finas'],
  ['effects', 'Efeitos', '◌', 'Blur|Mistura de cores|Degradê linear|Degradê radial|Marmorizado|Efeito aquarela|Efeito esfumaçado|Efeito cromado|Efeito respingado|Efeito salpicado|Efeito riscado|Efeito tinta escorrida|Efeito aurora|Efeito galáxia|Efeito fumaça|Brilhos delicados'],
  ['animals', 'Animais', '♡', 'Panda|Gato|Coelho|Cachorro|Patinhas|Borboleta|Urso|Capivara|Cobra|Arara|Calopsita|Cavalo|Joaninha|Vaca'],
  ['florals', 'Florais & Laços', '❀', 'Rosas|Margaridas|Girassóis|Tulipas|Lírios|Orquídeas|Lavandas|Hibiscos|Flores de cerejeira|Flores tropicais|Flores silvestres|Flores pequenas|Flores abstratas|Flores vintage|Flores em aquarela|Folhagens|Ramos de folhas|Samambaias|Trevos|Folhas de monstera|Vinhas e trepadeiras|Galhos floridos|Pétalas soltas|Buquês|Coroas de flores|Rosas espinhosas|Laços delicados|Laços grandes|Laços de cetim|Laços de renda|Laços de fita|Laços duplos|Laços estilo coquette|Laços com pedrarias|Laços de coração|Flor cheia|Flor tradicional|Rosa vermelha'],
  ['fruits', 'Frutas', '◉', 'Morango|Cereja|Melancia|Limão siciliano|Limão|Laranja|Uva|Maçã|Pera|Abacaxi|Manga|Banana|Kiwi|Pêssego|Amora|Framboesa|Mirtilo|Ameixa|Coco|Maracujá|Pitaya|Romã|Mamão|Melão|Abacate|Caju|Acerola|Goiaba|Carambola|Frutas em fatias|Ramos de frutas|Cestas de frutas|Frutas com flores'],
  ['seasons', 'Estações do Ano', '☼', 'Flores de primavera|Borboletas de primavera|Margaridas de primavera|Abelhas de primavera|Folhas de primavera|Arco-íris de primavera|Jardim de primavera|Sol de verão|Conchas|Estrelas-do-mar|Ondas do mar|Coqueiros|Óculos de sol|Sorvete|Praia|Frutas tropicais|Folhas secas de outono|Abóboras de outono|Cogumelos|Pinhas|Galhos de outono|Esquilos de outono|Tons terrosos|Flocos de neve|Cristais de gelo|Luvas de inverno|Cachecóis|Gorros|Pinheiros de inverno|Neve|Estrelas de inverno'],
  ['dates', 'Datas Comemorativas', '♡', 'Papai Noel|Árvore de Natal|Rena|Presente de Natal|Bengala doce|Estrela de Natal|Sino de Natal|Floco de neve natalino|Guirlanda|Fogos de artifício|Taças de Ano Novo|Champanhe|Estrelas de Ano Novo|Relógio da virada|Confetes de Ano Novo|Números do ano|Coelho de Páscoa|Ovos decorados|Cenoura de Páscoa|Pintinho|Chocolate de Páscoa|Orelhas de coelho|Abóbora de Halloween|Fantasma|Morcego|Aranha|Teia de aranha|Caveira de Halloween|Chapéu de bruxa|Gato preto|Poção|Coração de Dia dos Namorados|Cupido|Flecha de amor|Rosa romântica|Carta de amor|Cadeado de coração|Lábios|Flores para mães|Coração para mães|Presente para mães|Laço para mães|Mensagem delicada para mães|Gravata para pais|Bigode|Ferramentas para pais|Relógio para pais|Presente para pais|Máscara de Carnaval|Confetes de Carnaval|Serpentina|Plumas de Carnaval|Brilho de Carnaval|Estrela de Carnaval|Bandeirinhas juninas|Fogueira junina|Balão junino|Chapéu de palha|Milho junino|Girassol junino|Lua mística|Cristais místicos|Gato místico|Símbolos esotéricos|Flores para o Dia da Mulher|Laço para o Dia da Mulher|Símbolo feminino|Elementos delicados para o Dia da Mulher|Bolo de aniversário|Velas de aniversário|Balões de aniversário|Presente de aniversário|Confetes de aniversário|Cupcake'],
  ['films', 'Filmes', '▣', 'Princesas e castelos encantados|Sapatinho de cristal|Maçã envenenada|Coroa real|Varinha mágica|Poção mágica|Varinhas e estrelas mágicas|Espaço sideral|Sabres de luz|Robôs|Dinossauros de cinema|Super-heróis|Escudos heroicos|Símbolos heroicos|Magia e feitiçaria|Fantasmas divertidos|Monstros fofos|Piratas|Navios e tesouros|Contos de fadas|Ursinhos e personagens fofinhos|Balões e casas voadoras|Elementos de animações|Elementos de filmes de terror|Elementos de romances|Fantasia medieval|Claquete'],
  ['alternative', 'Alternativo', '☾', 'Caveiras|Ossos|Aranhas góticas|Teias góticas|Cruzes góticas|Rosas negras|Corações partidos|Chamas|Espinhos|Correntes|Algemas|Lâminas|Punhais|Arame farpado|Asas de morcego|Asas negras|Luas crescentes|Sol negro|Olhos místicos|Lágrimas|Raios|Símbolos ocultistas|Pentagramas|Sigilos|Cartas de tarô|Mãos esqueléticas|Anjos sombrios|Demônios estilizados|Borboletas dark|Laços pretos|Corações anatômicos|Chamas góticas|Estrelas punk|Alfinetes|Correntes de segurança|Estética grunge|Estética emo|Estética punk|Estética cyberpunk|Estética dark romantic|Estética witchy'],
  ['objects', 'Objetos', '⌂', 'Coroas|Pérolas|Diamantes|Cristais|Pedrarias|Anéis|Correntes|Relógios|Óculos|Bolsas|Sapatos|Saltos altos|Perfumes|Batons|Maquiagens|Espelhos|Pentes|Esmaltes|Pincéis de maquiagem|Câmeras|Fones de ouvido|Celulares|Computadores|Notas musicais|Fones de música|Microfones|Guitarras|Discos de vinil|Livros|Canetas|Cartas|Dados|Xadrez|Chaves|Cadeados|Velas|Incensos|Cristais místicos|Conchas|Estrelas-do-mar|Guarda-chuvas|Borboletas decorativas|Balões|Presentes|Corações|Nuvens|Sol|Lua|Arco-íris|Planetas|Estrelas|Cometas|Foguetes'],
  ['countries', 'Países', '◎', 'Bandeira do Brasil|Bandeira dos Estados Unidos|Bandeira do Reino Unido|Bandeira da França|Bandeira da Itália|Bandeira da Alemanha|Bandeira de Portugal|Bandeira da Espanha|Bandeira do Japão|Bandeira da Coreia do Sul|Bandeira da China|Bandeira do México|Bandeira da Argentina|Bandeira do Uruguai|Bandeira do Chile|Bandeira do Canadá|Bandeira da Austrália|Bandeira da Grécia|Bandeira da Suíça|Bandeira da Índia|Bandeira da Rússia|Bandeira da Irlanda|Bandeira da Suécia|Bandeira da Noruega|Bandeira da Holanda|Bandeira da Colômbia|Bandeira do Peru|Bandeira da África do Sul|Torre Eiffel|Big Ben|Estátua da Liberdade|Coliseu|Torre de Pisa|Pirâmides do Egito|Esfinge|Taj Mahal|Cristo Redentor|Pão de Açúcar|Arco do Triunfo|Moinho holandês|Cerejeiras japonesas|Monte Fuji|Arco japonês Torii|Cactos mexicanos|Sombrero|Mapa-múndi|Globo terrestre|Mapas de países|Elementos culturais e arquitetônicos']
].map(([id, name, icon, entries]) => ({ id, name, icon, entries: entries.split('|') }));

const legacy = new Map([
  ['classics|Francesinha tradicional', 'french'], ['classics|Bolinha', 'dots'], ['classics|Estrelas', 'star'], ['classics|Linhas finas', 'linework'],
  ['effects|Marmorizado', 'marble'], ['effects|Brilhos delicados', 'sparkles'],
  ['animals|Panda', 'animals-panda-01'], ['animals|Gato', 'cat'], ['animals|Coelho', 'bunny'], ['animals|Cachorro', 'animals-cachorro-04'],
  ['animals|Patinhas', 'paw'], ['animals|Borboleta', 'butterfly'], ['animals|Urso', 'animals-urso-35'], ['animals|Capivara', 'animals-capivara-24'], ['animals|Cobra', 'animals-cobra-19'],
  ['florals|Margaridas', 'daisy'], ['florals|Flor cheia', 'camellia'], ['florals|Folhagens', 'leaves'], ['florals|Laços delicados', 'bow'],
  ['fruits|Morango', 'strawberry'], ['fruits|Cereja', 'cherries'], ['seasons|Sol de verão', 'sun'], ['seasons|Flocos de neve', 'snowflake'],
  ['dates|Coração de Dia dos Namorados', 'heart'], ['films|Claquete', 'film-reel'], ['alternative|Luas crescentes', 'moon'],
  ['alternative|Chamas', 'flame'], ['objects|Coroas', 'crown'], ['countries|Bandeira do Brasil', 'brazil'], ['countries|Bandeira da França', 'france']
]);
const importedAssets = new Map([
  ['animals|Panda', 'panda'], ['animals|Gato', 'gato'], ['animals|Coelho', 'coelho'],
  ['animals|Cachorro', 'cachorro'], ['animals|Borboleta', 'borboleta'], ['animals|Capivara', 'capivara'],
  ['animals|Arara', 'arara'], ['animals|Calopsita', 'calopsita'], ['animals|Cavalo', 'cavalo'],
  ['animals|Joaninha', 'joaninha'], ['animals|Vaca', 'vaca'],
  ['florals|Rosas', 'rosa'], ['florals|Girassóis', 'girassol'],
  ['florals|Flor tradicional', 'flor-tradicional'], ['florals|Rosa vermelha', 'rosa-vermelha']
]);
const colors = {
  classics: ['#71452F', '#D5A98E', '#E6C77E'], effects: ['#62547B', '#BA81A7', '#E6C66F'],
  animals: ['#503A34', '#C8A48F', '#D4B878'], florals: ['#58704E', '#D88FA1', '#E8C777'],
  fruits: ['#9F4551', '#668950', '#F0CB72'], seasons: ['#557165', '#D3A889', '#E8C876'],
  dates: ['#75473D', '#D88880', '#E9C66D'], films: ['#5C4A71', '#C99E73', '#D8C56E'],
  alternative: ['#392E3B', '#815968', '#B49A66'], objects: ['#704A3A', '#CF9E7B', '#E2C17A'],
  countries: ['#52645F', '#C6866F', '#D9BA76']
};
const FLAG_COLORS = {
  'brasil': ['#16823B', '#F7D447', '#1769AA'], 'estados unidos': ['#B22234', '#FFFFFF', '#3C3B6E'], 'reino unido': ['#24447B', '#FFFFFF', '#C8102E'],
  'frança': ['#1E4A9A', '#FFFFFF', '#E43D4B'], 'itália': ['#16834A', '#FFFFFF', '#D94343'], 'alemanha': ['#1C1C1C', '#D43A35', '#E7B84B'],
  'portugal': ['#16844A', '#D64743', '#F0CD65'], 'espanha': ['#B33135', '#E8C650', '#B33135'], 'japão': ['#FFFFFF', '#C83847', '#FFFFFF'],
  'coreia do sul': ['#FFFFFF', '#C83847', '#23579B'], 'china': ['#D33E39', '#F2C848', '#D33E39'], 'méxico': ['#178550', '#FFFFFF', '#CE4242'],
  'argentina': ['#7BC4E8', '#FFFFFF', '#7BC4E8'], 'uruguai': ['#FFFFFF', '#80C6E4', '#FFFFFF'], 'chile': ['#FFFFFF', '#D5454B', '#2462A0'],
  'canadá': ['#D83D48', '#FFFFFF', '#D83D48'], 'austrália': ['#1D3C7A', '#FFFFFF', '#D13F4B'], 'grécia': ['#2862A5', '#FFFFFF', '#2862A5'],
  'suíça': ['#D23C43', '#FFFFFF', '#D23C43'], 'índia': ['#E58A43', '#FFFFFF', '#36815A'], 'rússia': ['#FFFFFF', '#3562A3', '#D34A4A'],
  'irlanda': ['#1E8A57', '#FFFFFF', '#E58A43'], 'suécia': ['#2E67A7', '#F1C953', '#2E67A7'], 'noruega': ['#C93B43', '#FFFFFF', '#224D86'],
  'holanda': ['#C84046', '#FFFFFF', '#2861A0'], 'colômbia': ['#E6C143', '#2D68AE', '#C54142'], 'peru': ['#D84348', '#FFFFFF', '#D84348'],
  'áfrica do sul': ['#D14747', '#F3CE4F', '#2D6A53']
};
const P = 'var(--guria-primary, #71452F)', S = 'var(--guria-secondary, #D5A98E)', D = 'var(--guria-detail, #E6C77E)';
const el = (name, attrs) => '<' + name + ' ' + attrs + '/>';
const path = (d, fill = 'none', stroke = P, width = 2, extra = '') => el('path', 'd="' + d + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round" ' + extra);
const circle = (x, y, r, fill, stroke = 'none', width = 1) => el('circle', 'cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + width + '"');
const ellipse = (x, y, rx, ry, fill, stroke = 'none', width = 1, transform = '') => el('ellipse', 'cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + width + '" transform="' + transform + '"');
const rect = (x, y, w, h, fill, stroke = 'none', radius = 0) => el('rect', 'x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + radius + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"');
const line = (x1, y1, x2, y2, color = P, width = 2) => path('M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2, 'none', color, width);
function star(x, y, r, fill, stroke = 'none') {
  const points = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? r * .43 : r;
    return (x + Math.cos(a) * radius).toFixed(1) + ',' + (y + Math.sin(a) * radius).toFixed(1);
  }).join(' ');
  return el('polygon', 'points="' + points + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.4" stroke-linejoin="round"');
}
function svg(body, defs = '') { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + (defs ? '<defs>' + defs + '</defs>' : '') + body + '</svg>\n'; }
function framed(body) { return svg(path('M50 5V12M50 88V95M5 50H12M88 50H95', 'none', D, 1.3) + body); }
function paletteFor(cat, name) {
  const scheme = colors[cat];
  if (cat === 'countries' && name.toLowerCase().startsWith('bandeira')) {
    const countryName = name.toLowerCase().replace(/^bandeira (dos |do |da |de )?/, '');
    return FLAG_COLORS[countryName] || scheme;
  }
  if (cat === 'fruits' && /limão|kiwi|maçã verde|abacate/.test(name.toLowerCase())) return ['#557B51', '#AFC46A', '#E7CD78'];
  if (cat === 'alternative') return ['#342A37', '#785466', '#B49A66'];
  return scheme;
}
function applyTheme(source, cat, name) {
  const scheme = paletteFor(cat, name);
  return source
    .replace(/var\(--guria-primary, #[0-9a-f]{6}\)/gi, 'var(--guria-primary, ' + scheme[0] + ')')
    .replace(/var\(--guria-secondary, #[0-9a-f]{6}\)/gi, 'var(--guria-secondary, ' + scheme[1] + ')')
    .replace(/var\(--guria-detail, #[0-9a-f]{6}\)/gi, 'var(--guria-detail, ' + scheme[2] + ')');
}

function classic(name, seed) {
  const n = name.toLowerCase();
  if (n.includes('francesinha')) {
    const d = n.includes('diagonal') ? 'M18 71Q50 45 82 25' : n.includes('reversa') ? 'M17 36Q50 15 83 36' : n.includes('em v') ? 'M18 29L50 72 82 29' : n.includes('ondulada') ? 'M16 61Q27 48 38 61T60 61T84 61' : n.includes('dupla') ? 'M17 67Q50 88 83 67M19 59Q50 78 81 59' : 'M17 62Q50 86 83 62';
    return framed(path(d, 'none', P, 7) + path(d, 'none', S, 2) + star(50, 27, 3.5, D));
  }
  if (n.includes('renda')) return framed(path('M18 80C18 60 34 58 34 42S18 24 18 11M82 80C82 60 66 58 66 42S82 24 82 11M24 76Q50 60 76 76M24 24Q50 40 76 24M50 12V88', 'none', P, 2) + circle(34, 50, 2.5, D) + circle(66, 50, 2.5, D) + circle(50, 38, 2, S) + circle(50, 62, 2, S));
  if (n.includes('laço')) return framed(path('M47 47C32 21 12 20 16 39Q19 53 46 52C24 58 20 78 33 80Q45 79 50 55Q55 79 67 80Q80 78 76 58C54 52 81 53 84 39Q88 20 68 21L53 49Z', S, P, 2) + circle(50, 50, 7, D, P, 1.4));
  if (n.includes('coração')) return framed(path('M50 79C42 69 19 53 20 36C21 18 41 17 50 32C59 17 80 20 80 37C79 54 59 70 50 79Z', S, P, 2) + path('M33 37Q39 27 45 33', 'none', '#fffaf4', 2));
  if (n.includes('estrela')) return framed(star(50, 49, 25, S, P) + (n.includes('cadente') ? path('M19 74Q34 64 43 55M15 84Q30 77 37 68', 'none', D, 2) : star(76, 24, 5, D)));
  if (n.includes('onda') || n.includes('ondulada') || n.includes('curvas')) return framed(path('M14 31C28 12 40 50 54 31S78 14 87 30M14 50C28 31 40 69 54 50S78 33 87 49M14 69C28 50 40 88 54 69S78 52 87 68', 'none', P, 2.4) + path('M20 80Q48 72 78 80', 'none', S, 2));
  if (n.includes('linha')) return framed((n.includes('verticais') ? [28, 50, 72].map((x) => line(x, 18, x, 82, P, 2.2)) : n.includes('horizontais') ? [30, 50, 70].map((y) => line(18, y, 82, y, P, 2.2)) : n.includes('diagonais') || n.includes('finas') ? [0, 1, 2].map((i) => line(20 + i * 13, 78, 50 + i * 10, 22, P, 2)) : [0, 1, 2].map((i) => path('M18 ' + (37 + i * 13) + 'Q34 ' + (20 + i * 14) + ' 50 ' + (40 + i * 10) + 'T82 ' + (36 + i * 13), 'none', P, 2))).join('') + circle(50, 50, 2.5, D));
  if (n.includes('bolinha') || n.includes('poá') || n.includes('pontilh')) return framed(Array.from({ length: 25 }, (_, i) => circle(22 + (i % 5) * 14 + (Math.floor(i / 5) % 2) * 4, 22 + Math.floor(i / 5) * 14, 1.5 + ((i + seed) % 3), i % 4 ? P : D)).join(''));
  if (n.includes('pérola')) return framed(Array.from({ length: 9 }, (_, i) => circle(19 + i * 7.7, 50 + Math.sin(i * .72) * 16, 4, S, P, 1.1) + circle(18 + i * 7.7, 48 + Math.sin(i * .72) * 16, 1.1, '#fffaf4')).join(''));
  if (n.includes('meia-lua')) return framed(path('M62 21A31 31 0 1 0 79 68A25 25 0 0 1 62 21Z', S, P, 2) + star(35, 30, 4, D));
  if (n.includes('triângulo')) return framed(path('M50 17L83 78H17Z', 'none', P, 2.5) + path('M50 32L70 70H30Z', S, P, 1.5) + circle(50, 58, 3, D));
  if (n.includes('losango')) return framed(path('M50 14L82 50 50 86 18 50Z', 'none', P, 2.5) + path('M50 28L70 50 50 72 30 50Z', S, P, 1.5) + circle(50, 50, 3, D));
  if (n.includes('quadrado') || n.includes('xadrez')) return framed(rect(23, 23, 54, 54, 'none', P, 3) + rect(31, 31, 19, 19, S) + rect(50, 50, 19, 19, D) + line(50, 23, 50, 77, P, 1.5) + line(23, 50, 77, 50, P, 1.5));
  if (n.includes('círculo')) return framed(circle(50, 50, 28, 'none', P, 2.5) + circle(50, 50, 20, 'none', S, 2) + circle(50, 50, 5, D));
  if (n.includes('listra')) return framed([26, 42, 58, 74].map((x, i) => line(x, 20, x, 80, i % 2 ? P : S, 4)).join(''));
  return framed(path('M17 30L50 16L83 30L77 68L50 84L23 68Z', 'none', P, 2.5) + path('M26 36L50 25L74 36L70 63L50 75L30 63Z', S, P, 1.4) + star(50, 50, 8, D));
}

function effect(name, seed) {
  const n = name.toLowerCase();
  if (/degradê|mistura|blur|aurora|cromado/.test(n)) {
    const id = 'gradient';
    const radial = /radial|blur|aurora/.test(n);
    const defs = '<' + (radial ? 'radialGradient' : 'linearGradient') + ' id="' + id + '" ' + (radial ? 'cx="30%" cy="30%" r="80%"' : 'x1="0%" y1="100%" x2="100%" y2="0%"') + '><stop offset="0" stop-color="' + S + '"/><stop offset=".52" stop-color="' + D + '"/><stop offset="1" stop-color="' + P + '"/></' + (radial ? 'radialGradient' : 'linearGradient') + '>';
    return svg(rect(18, 15, 64, 70, 'url(#' + id + ')', 'none', 30) + path('M28 65Q49 23 73 39M30 73Q53 39 74 30', 'none', '#fffaf4', 2, 'opacity=".7"'), defs);
  }
  if (n.includes('marmoriz')) return framed(path('M17 23Q34 34 26 45T38 69Q48 78 40 85M42 16Q57 29 48 41T63 58Q72 66 63 82M66 20Q54 31 72 44T70 62', 'none', P, 2.4) + path('M20 32Q40 40 32 53M57 25Q68 38 57 50T72 72', 'none', S, 2) + circle(49, 50, 3, D));
  if (n.includes('escorr')) return framed(path('M19 24H81L76 52Q72 58 68 50L65 77Q61 86 56 77L53 44Q49 39 46 47L42 69Q38 77 34 68L30 45Z', S, P, 2) + [28, 45, 64, 74].map((x, i) => line(x, 23, x, 34 + i % 3 * 7, D, 1.5)).join(''));
  if (n.includes('riscado')) return framed(rect(20, 20, 60, 60, S, 'none', 10) + [0, 1, 2, 3, 4, 5].map((i) => line(22 + i * 10, 76, 42 + i * 7, 23, P, 2)).join(''));
  const spots = Array.from({ length: 15 }, (_, i) => circle(18 + (i * 29 + seed * 7) % 64, 18 + (i * 37 + seed * 11) % 64, 2 + i % 4 * 1.5, i % 3 ? S : P).replace('/>', ' opacity="' + (.24 + i % 4 * .12) + '"/>')).join('');
  return framed(spots + path('M17 68Q34 37 49 58T81 35M21 80Q46 52 78 68', 'none', D, 1.5) + star(50, 50, 5, '#fffaf4'));
}

function flower(name, seed) {
  const n = name.toLowerCase();
  if (n.includes('laço')) return framed(path('M50 48C40 24 17 24 18 42Q20 55 46 52C26 60 20 77 32 80Q45 80 50 55Q55 80 68 80Q80 77 74 60C54 52 80 55 82 42Q83 24 60 24Z', S, P, 2) + circle(50, 50, 7, D, P, 1.5) + path('M50 58L40 84M50 58L62 83', 'none', D, 1.8));
  if (/folha|samambaia|vinha|trevo|galho|ramo/.test(n)) {
    const leaves = Array.from({ length: 6 }, (_, i) => {
      const y = 25 + i * 10, dir = i % 2 ? 1 : -1, x = 50 + dir * 18;
      return path('M50 ' + y + 'Q' + x + ' ' + (y - 13) + ' ' + (50 + dir * 28) + ' ' + y + 'Q' + x + ' ' + (y + 13) + ' 50 ' + (y + 3), S, P, 1.5) + line(50, y + 2, 50 + dir * 23, y, D, 1);
    }).join('');
    return framed(path('M50 91Q45 57 50 15', 'none', P, 2.5) + leaves);
  }
  if (n.includes('rosa') && !n.includes('espinho')) return framed(path('M50 51Q28 33 42 23Q54 15 59 29Q73 18 79 32Q84 46 57 54Q79 60 70 75Q63 85 51 62Q44 84 30 74Q20 65 43 53Z', S, P, 2) + path('M50 60Q43 77 50 92M50 82Q35 70 25 82M51 78Q68 65 77 74', 'none', P, 2));
  if (n.includes('espinho')) return framed(path('M50 64Q33 45 42 31Q48 19 59 29Q73 21 77 34Q81 47 55 62M50 62Q44 78 50 91M50 73L39 66L35 74L29 70M51 81L62 73L66 80L74 74', S, P, 2) + path('M43 37Q50 27 57 37Q66 28 71 39Q72 48 53 52Z', S, P, 1.5));
  if (/tulipa|lírio/.test(n)) return framed(path('M50 51Q30 46 31 23Q41 28 50 39Q59 28 69 23Q70 46 50 51ZM50 50Q40 39 41 22M50 50Q60 39 59 22M50 50V91M49 76Q34 64 24 73Q31 84 49 81M51 83Q66 67 77 76Q68 89 51 88', S, P, 2));
  if (/orquídea|hibisco/.test(n)) return framed(path('M50 42Q37 18 30 29Q25 42 45 50Q20 50 27 64Q33 76 49 57Q45 82 58 78Q71 75 56 55Q80 65 78 49Q76 35 55 46Q67 21 54 20Q45 19 50 42Z', S, P, 1.8) + path('M50 49Q58 53 58 61M54 60L68 68M57 57L71 55', 'none', D, 2) + circle(51, 51, 4, D, P, 1));
  if (/lavanda/.test(n)) return framed(path('M50 89Q47 59 50 25M50 68Q37 55 36 40M50 59Q63 48 64 33M49 78Q38 68 38 57M51 71Q61 61 62 51', 'none', P, 2) + [[50, 25], [36, 40], [64, 33], [38, 57], [62, 51], [50, 42]].map(([x, y], i) => ellipse(x, y, 4.3, 7.2, i % 2 ? D : S, P, 1.1, 'rotate(' + (i % 2 ? -25 : 25) + ' ' + x + ' ' + y + ')')).join('') + path('M31 91Q50 85 70 91', 'none', D, 1.5));
  if (/cerejeira|silvestres|tropicais|vintage|aquarela/.test(n)) {
    const count = n.includes('cerejeira') ? 5 : 7;
    const petals = Array.from({ length: count }, (_, i) => ellipse(50, 34, 9, 16, S, P, 1.5, 'rotate(' + i * 360 / count + ' 50 50)')).join('');
    return framed(path('M50 59Q47 72 50 92M48 77Q35 68 26 77Q34 87 49 82M51 83Q66 70 76 78Q68 89 51 89', 'none', P, 2) + petals + circle(50, 50, 8, D, P, 1.4) + [0, 1, 2, 3, 4].map((i) => circle(50 + Math.cos(i * 1.25) * 4, 50 + Math.sin(i * 1.25) * 4, 1.2, P)).join(''));
  }
  if (/buquê|coroa de flores/.test(n)) return framed(path('M27 79Q50 90 73 79M34 78L47 55M50 81V49M66 78L54 56', 'none', P, 1.8) + [[36, 51], [50, 43], [64, 51]].map(([x, y], i) => circle(x, y, i ? 12 : 10, S, P, 1.5) + circle(x, y, 4, D, P, 1)).join('') + path('M36 64Q27 55 23 63M63 65Q75 55 78 65', 'none', P, 1.5));
  const count = n.includes('girassol') ? 12 : n.includes('margarida') ? 10 : n.includes('cerejeira') ? 5 : 7 + seed % 3;
  const petals = Array.from({ length: count }, (_, i) => ellipse(50, 32, n.includes('pequenas') ? 6 : 8, 16, S, P, 1.4, 'rotate(' + i * 360 / count + ' 50 50)')).join('');
  const center = circle(50, 50, n.includes('girassol') ? 11 : 8, D, P, 1.5) + Array.from({ length: 7 }, (_, i) => circle((50 + Math.cos(i * Math.PI * 2 / 7) * 5).toFixed(1), (50 + Math.sin(i * Math.PI * 2 / 7) * 5).toFixed(1), 1.2, P)).join('');
  const stem = path('M50 58Q48 73 50 92M49 76Q31 63 24 74Q32 88 49 81M50 83Q67 66 77 75Q70 88 50 88', 'none', P, 2);
  return framed(stem + petals + center);
}

function animalLegacy(name, seed) {
  const n = name.toLowerCase();
  const ink = P, mid = S, glint = D;
  const eye = (x, y, r = 1.8) => ellipse(x, y, r * 1.25, r, ink, 'none') + circle(x - .4, y - .45, .55, '#fffaf4');
  const noFrame = (body) => svg(body);
  const curve = (d, color = ink, width = 1.7) => path(d, 'none', color, width);

  // Animal print swatches stay transparent and have no crop-mark frame.
  if (n.includes('estampas de')) {
    if (/onça|leopardo/.test(n)) {
      return noFrame(Array.from({ length: 12 }, (_, i) => {
        const x = 19 + (i % 4) * 21 + (Math.floor(i / 4) % 2) * 8, y = 19 + Math.floor(i / 4) * 27;
        return ellipse(x, y, 6.5 + i % 2, 5.5, 'none', i % 3 ? ink : glint, 1.4, 'rotate(' + (i * 17) + ' ' + x + ' ' + y + ')') +
          curve('M' + (x - 3.5) + ' ' + (y - 1) + 'Q' + x + ' ' + (y - 5) + ' ' + (x + 3.5) + ' ' + (y - 1), mid, 1.1) + circle(x, y + 1.5, 1.2, ink);
      }).join(''));
    }
    if (/zebra/.test(n)) return noFrame(Array.from({ length: 11 }, (_, i) => {
      const x = 4 + i * 8.5;
      return curve('M' + x + ' 5Q' + (x + 8) + ' 22 ' + (x + 2) + ' 38T' + (x + 5) + ' 69T' + (x + 1) + ' 96', i % 2 ? ink : mid, i % 3 ? 2.2 : 1.3);
    }).join(''));
    if (/tigre/.test(n)) return noFrame(Array.from({ length: 10 }, (_, i) => {
      const x = 5 + i * 8;
      return curve('M' + x + ' 8Q' + (x + 13) + ' 20 ' + (x + 5) + ' 35Q' + (x + 1) + ' 45 ' + (x + 12) + ' 52Q' + (x + 18) + ' 57 ' + (x + 9) + ' 66', i % 2 ? ink : mid, 2.3);
    }).join(''));
    if (/vaca/.test(n)) return noFrame([path('M17 25Q23 14 36 20L40 33Q35 43 22 39Q13 35 17 25Z', mid, ink, 1.2), path('M58 19Q74 13 82 27L76 41Q63 45 55 35Z', glint, ink, 1.2), path('M31 60Q42 50 51 58L50 75Q39 82 29 72Z', glint, ink, 1.2), path('M66 62Q76 57 84 67L81 79Q69 84 62 76Z', mid, ink, 1.2)].join(''));
    if (/cobra|escamas/.test(n)) return noFrame(Array.from({ length: 7 }, (_, row) => Array.from({ length: 6 }, (_, col) => {
      const x = 12 + col * 13 + (row % 2) * 6, y = 9 + row * 13;
      return path('M' + (x - 7) + ' ' + y + 'Q' + x + ' ' + (y + 15) + ' ' + (x + 7) + ' ' + y, 'none', (row + col) % 3 ? ink : glint, 1.15);
    }).join('')).join(''));
    if (/girafa/.test(n)) return noFrame(Array.from({ length: 12 }, (_, i) => {
      const x = 17 + (i % 4) * 22 + (Math.floor(i / 4) % 2) * 6, y = 15 + Math.floor(i / 4) * 27;
      return path('M' + (x - 8) + ' ' + (y - 5) + 'L' + (x + 4) + ' ' + (y - 8) + 'L' + (x + 9) + ' ' + (y + 1) + 'L' + (x + 3) + ' ' + (y + 8) + 'L' + (x - 7) + ' ' + (y + 6) + 'Z', i % 2 ? mid : glint, ink, 1);
    }).join(''));
    if (/tartaruga/.test(n)) return noFrame(ellipse(50, 50, 39, 31, mid, ink, 1.7) + path('M50 20L38 32L40 48L50 58L61 48L63 32ZM38 32L25 29M40 48L20 51M50 58L37 77M61 48L81 51M63 32L76 29', 'none', glint, 1.4) + [25, 75].map((x) => ellipse(x, 51, 9, 14, 'none', ink, 1.3)).join(''));
    if (/penas/.test(n)) return noFrame(Array.from({ length: 7 }, (_, i) => {
      const x = 16 + i * 11;
      return path('M' + x + ' 88Q' + (x + 1) + ' 43 ' + (x + 7) + ' 12Q' + (x + 18) + ' 39 ' + x + ' 68Z', i % 2 ? mid : 'none', ink, 1.2) + curve('M' + x + ' 88L' + (x + 7) + ' 15M' + (x + 2) + ' 65L' + (x - 3) + ' 48M' + (x + 4) + ' 54L' + (x + 12) + ' 37M' + (x + 4) + ' 42L' + (x - 1) + ' 30', glint, 1);
    }).join(''));
    if (/borboleta/.test(n)) return noFrame(Array.from({ length: 2 }, (_, row) => [0, 1, 2].map((i) => {
      const x = 24 + i * 25, y = 28 + row * 43;
      return ellipse(x, y, 12, 17, 'none', ink, 1.4, 'rotate(' + (i % 2 ? 24 : -24) + ' ' + x + ' ' + y + ')') + ellipse(x, y, 6, 9, 'none', glint, 1);
    }).join('')).join('') + curve('M12 50Q50 45 88 50', mid, 1));
    return noFrame(Array.from({ length: 7 }, (_, i) => {
      const x = 15 + i * 12;
      return curve('M' + x + ' 91Q' + (x + 7) + ' 52 ' + (x + 4) + ' 14', i % 2 ? mid : ink, 1.5) + ellipse(x + 5, 41 + (i % 3) * 9, 3, 10, glint, ink, .8, 'rotate(' + (-28 + i * 8) + ' ' + (x + 5) + ' 41');
    }).join(''));
  }

  if (n.includes('patinhas')) {
    const paw = (x, y, scale) => '<g transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">' +
      path('M18 22Q18 12 27 14Q36 16 34 26Q31 33 24 30Q18 29 18 22ZM39 18Q39 8 48 10Q57 12 54 22Q51 29 44 26Q39 25 39 18ZM60 22Q59 12 68 14Q77 16 74 26Q71 33 65 30Q60 29 60 22ZM81 28Q80 19 89 21Q98 23 94 32Q91 38 85 35Q81 34 81 28ZM56 46Q45 38 36 43Q28 47 31 58Q35 70 53 75Q70 71 74 59Q77 48 69 43Q63 40 56 46Z', mid, ink, 2) + '</g>';
    return noFrame(paw(1, 1, .72) + paw(44, 30, .56) + paw(0, 62, .46));
  }

  if (/borboleta|mariposa/.test(n)) {
    const moth = n.includes('mariposa');
    const wings = moth
      ? path('M47 47C36 18 18 17 14 29Q11 43 43 53C23 54 18 68 26 78Q35 87 49 59C52 76 65 88 75 78Q83 68 57 53C86 43 85 28 76 22Q65 14 53 47Z', mid, ink, 1.8)
      : path('M47 48C37 18 20 15 14 27Q8 42 43 53C19 54 15 69 25 78Q36 87 49 59C52 77 64 86 75 78Q85 68 57 53C88 42 84 27 76 21Q64 14 53 48Z', mid, ink, 1.8);
    const veins = curve('M48 51Q34 36 19 27M46 53Q28 52 17 43M48 56Q34 66 27 77M52 51Q66 35 77 23M54 53Q72 50 82 40M52 57Q67 67 74 78M50 28V74', glint, 1.25);
    const eyespots = [circle(30, 38, moth ? 3.5 : 4.2, glint, ink, 1), circle(70, 38, moth ? 3.5 : 4.2, glint, ink, 1), circle(32, 68, 2.4, ink), circle(68, 68, 2.4, ink)].join('');
    return noFrame(wings + veins + eyespots + ellipse(50, 53, 3.2, 22, ink) + curve('M48 32Q38 17 32 21M52 32Q62 17 68 21', ink, 1.4) + circle(32, 21, 1.2, glint) + circle(68, 21, 1.2, glint));
  }

  if (n.includes('abelha')) return noFrame(
    ellipse(50, 52, 15, 24, glint, ink, 1.7, 'rotate(18 50 52)') +
    ellipse(38, 35, 12, 7, '#fffaf4', mid, 1.1, 'rotate(-34 38 35)') + ellipse(62, 35, 12, 7, '#fffaf4', mid, 1.1, 'rotate(34 62 35)') +
    path('M43 33Q34 20 29 25M57 33Q66 20 71 25', 'none', ink, 1.3) +
    curve('M41 43Q50 47 59 43M39 52Q50 56 61 52M42 61Q50 64 58 61', ink, 2) + circle(50, 27, 7, mid, ink, 1.5) + eye(47, 27, 1));
  if (n.includes('joaninha')) return noFrame(
    path('M23 65Q18 38 37 28Q50 20 63 28Q82 38 77 65Q68 80 50 82Q32 80 23 65Z', mid, ink, 1.8) +
    path('M50 29V77', 'none', ink, 1.5) + [circle(36, 43, 3, glint), circle(64, 43, 3, glint), circle(34, 62, 2.5, glint), circle(66, 62, 2.5, glint), circle(50, 52, 2.5, glint)].join('') +
    path('M29 35Q22 28 18 34M71 35Q78 28 82 34', 'none', ink, 1.5) + ellipse(50, 30, 10, 8, ink, 'none') + eye(46, 29, 1.1) + eye(54, 29, 1.1));
  if (n.includes('libélula')) return noFrame(
    ellipse(50, 56, 3, 25, mid, ink, 1.4) + circle(50, 28, 5, glint, ink, 1.2) +
    path('M46 42C28 12 15 18 25 40Q34 49 47 48M54 42C72 12 85 18 75 40Q66 49 53 48M47 50C26 42 21 58 39 64Q46 63 49 57M53 50C74 42 79 58 61 64Q54 63 51 57', '#fffaf4', mid, 1.3) +
    curve('M47 44L29 25M53 44L71 25M47 52L34 54M53 52L66 54M48 61L45 79M52 61L55 79', glint, 1.1) +
    curve('M47 25Q41 17 37 20M53 25Q59 17 63 20', ink, 1.1));

  if (/panda|gato|coelho|cachorro/.test(n)) {
    let head, features = '';
    if (n.includes('panda')) {
      head = path('M27 43Q16 28 27 20Q39 14 44 31Q50 28 56 31Q62 14 74 20Q85 28 73 44Q81 62 69 75Q59 85 50 84Q39 85 29 75Q19 62 27 43Z', '#fffaf4', ink, 1.8);
      features = ellipse(38, 50, 7, 10, ink, 'none', 0, 'rotate(25 38 50)') + ellipse(62, 50, 7, 10, ink, 'none', 0, 'rotate(-25 62 50)') + eye(38, 50, 1.7) + eye(62, 50, 1.7) + path('M46 62Q50 58 54 62Q53 68 50 68Q47 68 46 62Z', ink, 'none') + curve('M50 67V72M50 72Q45 76 42 72M50 72Q55 76 58 72', ink, 1.2) + ellipse(29, 26, 4, 3, mid, 'none') + ellipse(71, 26, 4, 3, mid, 'none');
    } else if (n.includes('gato')) {
      head = path('M25 43L22 17L44 32Q50 29 56 32L78 17L75 45Q82 66 66 78Q57 84 50 84Q42 84 33 78Q18 65 25 43Z', mid, ink, 1.8);
      features = path('M29 38L27 24L40 34M71 38L73 24L60 34', 'none', glint, 1.2) + eye(39, 52, 1.7) + eye(61, 52, 1.7) + path('M45 62Q50 58 55 62L50 67Z', ink, 'none') + curve('M50 67V72M50 72Q45 76 42 72M50 72Q55 76 58 72M37 64L20 61M37 68L20 70M63 64L80 61M63 68L80 70', ink, 1.1) + curve('M45 43Q50 39 55 43', glint, 1);
    } else if (n.includes('coelho')) {
      head = path('M32 39C22 13 26 4 36 10Q47 17 46 38M54 38Q53 17 65 10Q75 4 68 39Q80 51 74 67Q68 83 50 84Q32 83 26 67Q20 51 32 39Z', '#fffaf4', ink, 1.8);
      features = path('M33 31Q33 14 37 15Q43 21 42 34M58 34Q57 21 63 15Q67 14 67 31', 'none', mid, 2) + eye(40, 53, 1.6) + eye(60, 53, 1.6) + ellipse(50, 63, 4, 3, glint, ink, 1) + curve('M50 66V71M50 71Q45 75 42 71M50 71Q55 75 58 71', ink, 1.1) + curve('M39 65L27 63M39 68L27 69M61 65L73 63M61 68L73 69', mid, 1);
    } else {
      head = path('M28 39Q14 25 19 17Q27 10 40 34Q50 28 60 34Q73 10 81 17Q86 26 72 42Q80 56 70 73Q61 84 50 83Q36 83 28 73Q19 59 28 39Z', mid, ink, 1.8);
      features = path('M26 25Q30 29 33 36M74 25Q70 29 67 36', 'none', glint, 1.4) + eye(40, 51, 1.6) + eye(60, 51, 1.6) + path('M38 62Q50 55 62 62Q60 73 50 74Q40 73 38 62Z', '#fffaf4', ink, 1.2) + ellipse(50, 62, 4, 2.5, ink, 'none') + curve('M50 65V69M50 69Q46 73 43 70M50 69Q54 73 57 70', ink, 1.1);
    }
    return noFrame(head + features + curve('M34 42Q40 37 46 41M54 41Q60 37 66 42', '#fffaf4', 1));
  }

  if (n.includes('flamingo')) return noFrame(
    path('M30 76Q34 54 47 52Q60 50 58 39Q57 31 47 30Q40 29 39 35Q38 42 46 42Q50 42 51 39Q53 35 49 33M47 53Q36 55 30 46Q24 37 28 28Q31 22 36 27Q40 33 37 43Q35 50 28 52', 'none', mid, 4) +
    path('M47 52Q60 49 73 62Q65 69 55 66Q47 64 42 59M30 76L25 88M31 79L38 88M24 88H34M36 88H42', 'none', ink, 1.8) + path('M38 35L28 33L35 30Z', glint, ink, 1) + eye(45, 30, 1.2) + curve('M52 55Q64 57 70 63', '#fffaf4', 1.2));
  if (n.includes('girafa')) return noFrame(
    path('M35 87Q35 71 39 55L42 35Q40 21 50 17Q59 14 64 24L62 36Q75 41 73 55Q72 67 62 70L61 87M38 72L31 82M58 70L55 84', mid, ink, 1.8) +
    path('M44 28L47 20M59 27L62 19M47 19L46 12M62 18L64 11M43 39L36 35L38 43M65 40L73 37L70 45', 'none', ink, 1.7) +
    [ellipse(49, 43, 3.5, 4.5, glint, ink, .8), ellipse(61, 50, 3.4, 4, glint, ink, .8), ellipse(48, 58, 3.5, 4, glint, ink, .8), ellipse(63, 63, 3, 3.5, glint, ink, .8), ellipse(41, 71, 3, 4, glint, ink, .8)].join('') + eye(67, 47, 1.2) + curve('M66 54Q70 57 73 54', ink, 1));
  if (n.includes('elefante')) return noFrame(
    path('M27 48Q28 25 50 24Q69 24 74 42Q79 54 69 62L68 78Q66 87 59 84L58 64Q50 69 40 65L39 84Q36 91 31 85L30 62Q20 61 20 52Q20 47 27 48Z', mid, ink, 1.8) +
    path('M29 45Q13 38 17 58Q19 68 30 65Q37 63 35 54M64 57Q75 61 73 73Q72 82 66 79', 'none', ink, 2) + path('M43 64Q39 72 35 68M53 64Q58 72 62 68', 'none', glint, 1.4) + eye(61, 42, 1.3) + curve('M40 33Q50 27 61 34', '#fffaf4', 1.2));
  if (n.includes('cavalo')) return noFrame(
    path('M38 88L40 64Q29 55 31 43L22 27L42 33Q47 25 58 30L70 20L75 39Q82 53 69 61L67 87M43 67L34 81M61 66L59 84', mid, ink, 1.8) +
    path('M33 42Q44 37 51 43M41 32Q34 23 32 15M46 32Q43 21 48 14M52 31Q53 20 60 14M61 31Q66 22 73 17', 'none', ink, 1.7) + eye(69, 43, 1.2) + path('M72 49L81 53L72 55Z', glint, ink, 1) + curve('M43 53Q52 58 62 53', ink, 1));
  if (n.includes('unicórnio')) return noFrame(
    path('M38 88L40 64Q29 55 31 43L22 27L42 33Q47 25 58 30L70 20L75 39Q82 53 69 61L67 87', mid, ink, 1.8) +
    path('M48 31L56 8L60 32M33 43Q45 38 53 43M41 32Q34 23 32 15M51 30Q54 21 61 16M62 31Q68 22 73 18', 'none', glint, 1.8) + eye(69, 43, 1.2) + curve('M72 49L80 53M41 53Q52 58 62 53', ink, 1) + [circle(30, 67, 1.4, glint), circle(76, 67, 1.4, mid), star(78, 29, 2.7, glint)].join(''));
  if (n.includes('leão')) return noFrame(
    path('M50 12C70 15 85 29 82 49Q91 63 75 70Q70 88 50 87Q31 91 25 73Q8 62 18 48Q14 26 34 20Q41 12 50 12Z', glint, ink, 1.8) +
    path('M34 38Q37 26 50 26Q64 26 67 39L70 56Q66 72 50 76Q34 72 30 56Z', mid, ink, 1.7) +
    eye(42, 48, 1.4) + eye(58, 48, 1.4) + path('M46 59Q50 55 54 59L50 64Z', ink, 'none') + curve('M50 64V69M50 69Q46 73 42 69M50 69Q54 73 58 69M36 41Q42 35 47 41M53 41Q59 35 64 41', ink, 1.2) + [circle(25, 36, 2, mid), circle(74, 37, 2, mid), circle(25, 62, 2, mid), circle(74, 62, 2, mid)].join(''));
  if (n.includes('tigre')) return noFrame(
    path('M50 16L61 27L77 23L75 39L83 49L73 59L73 74L58 72L50 85L41 73L26 76L27 60L17 50L27 39L25 24L41 28Z', mid, ink, 1.8) +
    curve('M34 31L41 43M27 39L39 48M23 49L38 53M34 68L42 60M66 31L59 43M73 39L61 48M77 49L62 53M66 68L58 60M46 36L50 45L54 36M45 63Q50 67 55 63', glint, 2) +
    eye(41, 52, 1.3) + eye(59, 52, 1.3) + path('M46 61Q50 57 54 61L50 65Z', ink, 'none') + curve('M50 65V69M50 69Q46 72 43 69M50 69Q54 72 57 69', ink, 1.1));
  if (n.includes('ovelha')) return noFrame(
    [ellipse(31, 42, 13, 13, '#fffaf4', ink, 1.5), ellipse(43, 31, 13, 13, '#fffaf4', ink, 1.5), ellipse(57, 31, 13, 13, '#fffaf4', ink, 1.5), ellipse(69, 42, 13, 13, '#fffaf4', ink, 1.5), ellipse(31, 57, 13, 13, '#fffaf4', ink, 1.5), ellipse(69, 57, 13, 13, '#fffaf4', ink, 1.5), ellipse(42, 68, 13, 13, '#fffaf4', ink, 1.5), ellipse(58, 68, 13, 13, '#fffaf4', ink, 1.5), path('M34 44Q50 34 66 44L70 62Q62 77 50 78Q37 77 30 62Z', mid, ink, 1.5)].join('') + eye(43, 53, 1.2) + eye(57, 53, 1.2) + ellipse(50, 61, 3, 2.4, '#fffaf4', ink, 1) + path('M37 38Q31 35 29 40M63 38Q69 35 71 40', 'none', glint, 1.2));
  if (n.includes('vaca')) return noFrame(
    path('M29 39L21 24L37 29Q50 24 63 29L79 24L71 42Q78 61 67 74Q57 83 50 82Q40 83 30 74Q20 60 29 39Z', '#fffaf4', ink, 1.8) +
    path('M25 29L21 19M75 29L79 19M27 39Q37 31 43 38L40 47L29 47ZM62 37Q72 32 75 42L68 49L60 45Z', mid, ink, 1.3) +
    eye(40, 51, 1.4) + eye(60, 51, 1.4) + ellipse(50, 65, 13, 8, mid, ink, 1.2) + circle(45, 64, 1.1, ink) + circle(55, 64, 1.1, ink) + curve('M46 72Q50 74 54 72', ink, 1));
  if (n.includes('capivara')) return noFrame(
    path('M20 68Q20 52 37 48L40 34Q44 25 57 27L78 33L84 43L72 48L69 67Q64 77 49 76L28 76Z', mid, ink, 1.8) +
    path('M40 35L36 27L45 30M58 28L62 21L68 31', 'none', ink, 1.4) + eye(73, 39, 1.3) + path('M78 45Q84 48 79 52L70 50Z', glint, ink, 1) + curve('M46 39Q57 34 67 40M31 70Q48 73 65 69', '#fffaf4', 1.1) + path('M23 82Q50 77 80 82M32 86L28 78M69 86L74 77', 'none', glint, 1.2));
  if (n.includes('porco')) return noFrame(
    path('M26 39L24 23L41 31Q50 27 59 31L76 23L74 41Q82 62 69 75Q59 83 50 83Q39 83 30 75Q18 62 26 39Z', mid, ink, 1.8) +
    eye(40, 51, 1.4) + eye(60, 51, 1.4) + ellipse(50, 64, 14, 10, '#fffaf4', ink, 1.4) + ellipse(45, 64, 2, 3, glint, ink, .7) + ellipse(55, 64, 2, 3, glint, ink, .7) + curve('M46 75Q50 78 54 75', ink, 1));
  if (n.includes('raposa')) return noFrame(
    path('M25 49L19 18L43 34Q50 31 57 34L81 18L75 50Q75 69 50 84Q25 69 25 49Z', mid, ink, 1.8) +
    path('M26 47L20 22L41 38M74 47L80 22L59 38M31 60Q50 50 69 60L62 76Q50 83 38 76Z', '#fffaf4', glint, 1.2) +
    eye(40, 51, 1.5) + eye(60, 51, 1.5) + path('M46 65Q50 61 54 65L50 69Z', ink, 'none') + curve('M50 69V73M50 73Q46 76 43 73M50 73Q54 76 57 73', ink, 1.1));
  if (n.includes('urso')) return noFrame(
    path('M29 40Q18 29 26 20Q35 13 43 29Q50 26 57 29Q65 13 74 20Q82 29 71 40Q81 61 69 75Q60 84 50 84Q39 84 30 75Q18 60 29 40Z', mid, ink, 1.8) +
    ellipse(31, 27, 4, 4, glint, ink, 1) + ellipse(69, 27, 4, 4, glint, ink, 1) + eye(40, 50, 1.4) + eye(60, 50, 1.4) + ellipse(50, 63, 11, 8, '#fffaf4', ink, 1.1) + ellipse(50, 60, 3.2, 2.4, ink, 'none') + curve('M50 63V69M50 69Q46 73 43 69M50 69Q54 73 57 69', ink, 1.1));
  if (n.includes('esquilo')) return noFrame(
    path('M37 79Q20 69 25 55Q29 44 42 51Q24 38 30 24Q37 10 49 24Q57 34 51 47Q69 35 78 47Q91 63 76 76Q63 88 49 75Z', mid, ink, 1.8) +
    path('M40 61Q32 48 41 43Q50 40 56 51L64 67Q56 78 44 72Z', '#fffaf4', glint, 1.2) + eye(52, 54, 1.3) + path('M66 65L72 69L64 72Z', glint, ink, .9) + ellipse(27, 75, 8, 5, glint, ink, 1) + path('M24 75L28 60L33 74L39 62L37 79Z', mid, ink, 1));
  if (n.includes('lobo')) return noFrame(
    path('M50 17L62 31L82 23L75 43L82 55L70 64L65 81L50 73L35 81L30 64L18 55L25 43L18 23L38 31Z', mid, ink, 1.8) +
    path('M27 35L22 26L38 34M73 35L78 26L62 34M32 61Q50 49 68 61L62 75Q50 82 38 75Z', '#fffaf4', glint, 1.2) + eye(40, 49, 1.5) + eye(60, 49, 1.5) + path('M46 63Q50 59 54 63L50 67Z', ink, 'none') + curve('M50 67V71M50 71Q46 75 43 71M50 71Q54 75 57 71', ink, 1.1) + curve('M34 39L42 42M66 39L58 42', glint, 1.3));
  if (n.includes('veado')) return noFrame(
    path('M30 43Q30 25 50 24Q70 25 70 43L66 62Q61 77 50 80Q38 77 34 62Z', mid, ink, 1.7) +
    path('M37 29Q28 17 30 8M34 23L24 20M36 17L27 12M63 29Q72 17 70 8M66 23L76 20M64 17L73 12', 'none', ink, 1.8) +
    eye(42, 48, 1.3) + eye(58, 48, 1.3) + path('M46 61Q50 57 54 61L50 65Z', ink, 'none') + curve('M50 65V69M50 69Q46 73 43 69M50 69Q54 73 57 69', ink, 1.1) + [circle(39, 37, 1, glint), circle(61, 37, 1, glint), circle(35, 55, 1, glint), circle(65, 55, 1, glint)].join(''));
  if (n.includes('zebra')) return noFrame(
    path('M29 42L25 23L43 31Q50 28 57 31L75 23L71 44Q80 62 67 76Q57 83 50 83Q40 83 31 75Q19 60 29 42Z', '#fffaf4', ink, 1.8) +
    curve('M31 34L40 43L33 49L42 55L34 62M69 34L60 43L67 49L58 55L66 62M42 33L47 42L42 48M58 33L53 42L58 48', mid, 2) +
    eye(41, 52, 1.3) + eye(59, 52, 1.3) + path('M46 64Q50 60 54 64L50 68Z', ink, 'none') + curve('M50 68V72M50 72Q46 75 43 72M50 72Q54 75 57 72', ink, 1));
  if (n.includes('pinguim')) return noFrame(
    path('M50 16Q76 18 76 48V68Q72 87 50 88Q28 87 24 68V48Q24 18 50 16Z', ink, ink, 1.6) +
    path('M50 34Q68 37 68 57V68Q64 81 50 82Q36 81 32 68V57Q32 37 50 34Z', '#fffaf4', mid, 1.2) +
    ellipse(40, 43, 8, 11, '#fffaf4', 'none') + ellipse(60, 43, 8, 11, '#fffaf4', 'none') + eye(41, 45, 1.3) + eye(59, 45, 1.3) + path('M45 54L50 60L55 54Z', glint, ink, 1) + path('M27 52Q15 61 22 73L31 68M73 52Q85 61 78 73L69 68', mid, ink, 1.5) + path('M38 87L34 92H48M62 87L66 92H52', glint, ink, 1));
  if (n.includes('coruja')) return noFrame(
    path('M25 80Q20 58 25 39L18 21L39 31Q50 24 61 31L82 21L75 39Q80 58 75 80Q50 91 25 80Z', mid, ink, 1.8) +
    ellipse(39, 51, 13, 15, '#fffaf4', ink, 1.2) + ellipse(61, 51, 13, 15, '#fffaf4', ink, 1.2) + eye(39, 51, 2) + eye(61, 51, 2) +
    path('M46 66L50 60L54 66L50 70Z', glint, ink, .9) + curve('M31 73Q39 68 46 74M54 74Q61 68 69 73M31 80Q39 75 46 81M54 81Q61 75 69 80', ink, 1.1) +
    path('M33 85L28 91M67 85L72 91M23 92H38M62 92H77', 'none', ink, 1.5));
  if (n.includes('passarinho')) return noFrame(
    path('M25 56Q28 35 48 34Q62 33 68 45L83 40L72 52Q67 70 48 72Q31 72 25 56Z', mid, ink, 1.7) +
    path('M39 49Q51 40 63 51Q53 63 39 59Z', glint, ink, 1.1) + path('M81 41L91 45L82 49Z', glint, ink, 1) + eye(68, 43, 1.2) +
    path('M42 72Q37 80 31 82M47 72Q50 80 57 82M30 82H39M54 82H62', 'none', ink, 1.3) + curve('M22 85Q49 81 75 85M38 84L34 77M64 84L68 77', glint, 1.2));
  if (n.includes('cisne')) return noFrame(
    path('M25 72Q39 54 57 61Q72 67 79 55Q73 53 68 47Q61 38 67 29Q71 24 78 26Q75 32 79 35Q84 39 91 34Q89 47 78 50Q91 73 71 82Q49 90 25 72Z', '#fffaf4', ink, 1.8) +
    path('M69 29L80 24L76 34Z', glint, ink, 1) + eye(76, 30, 1) + curve('M34 72Q51 77 69 70M43 67Q54 57 67 66M50 70Q57 64 65 69', mid, 1.2) + path('M79 36L86 38', 'none', ink, 1));
  if (n.includes('pavão')) return noFrame(
    path('M49 76Q45 55 49 43L43 34Q34 31 29 20Q43 20 50 33Q55 17 69 15Q69 31 57 39L56 76Z', mid, ink, 1.7) +
    Array.from({ length: 7 }, (_, i) => {
      const x = 15 + i * 12, y = 34 + Math.abs(3 - i) * 5;
      return path('M50 69Q' + (x - 13) + ' ' + (y + 17) + ' ' + x + ' ' + y + 'Q' + (x + 12) + ' ' + (y + 16) + ' 50 69Z', i % 2 ? '#fffaf4' : mid, ink, 1.1) + ellipse(x, y + 2, 3, 5, glint, ink, .8);
    }).join('') + curve('M48 77L37 88M55 77L64 88M34 88H43M60 88H69', ink, 1.4));
  if (n.includes('polvo')) return noFrame(
    path('M30 52Q28 25 50 22Q73 25 70 52Q69 64 61 68H39Q31 64 30 52Z', mid, ink, 1.8) +
    [0,1,2,3,4,5,6,7].map((i) => {
      const x = 34 + i * 4.6, bend = i % 2 ? -1 : 1;
      return path('M' + x + ' 64Q' + (x + bend * 10) + ' 69 ' + (x + bend * 5) + ' 80Q' + (x + bend * 1) + ' 88 ' + (x + bend * 8) + ' 91', 'none', i % 2 ? ink : mid, 2.2) + circle(x + bend * 5, 80, 1.1, glint);
    }).join('') + eye(43, 47, 1.5) + eye(57, 47, 1.5) + curve('M40 57Q50 61 60 57M38 34Q50 29 62 34', '#fffaf4', 1.2));
  if (n.includes('golfinho')) return noFrame(
    path('M15 59Q25 39 48 40Q57 39 65 31L78 22L75 40L90 50L76 60Q65 73 48 71Q31 69 15 59ZM48 41L42 27L60 39M48 70L42 84L59 71', mid, ink, 1.8) + eye(68, 46, 1.3) + curve('M22 61Q38 54 54 60M28 67Q38 72 48 69', glint, 1.2) + path('M19 86Q30 80 40 85M70 86Q79 80 88 85', 'none', glint, 1.2));
  if (n.includes('baleia')) return noFrame(
    path('M14 59Q23 39 48 40Q62 40 75 31L83 24L81 41L91 49L79 55Q70 74 49 75Q27 75 14 59Z', mid, ink, 1.8) +
    path('M69 37Q73 25 81 16Q87 27 83 39', 'none', glint, 1.6) + eye(72, 49, 1.3) + curve('M25 63Q44 71 64 63M79 42L86 39', '#fffaf4', 1.1) + [path('M80 16Q76 9 78 5M84 16Q88 8 87 4M82 16V3', 'none', glint, 1.2)].join(''));
  if (n.includes('tubarão')) return noFrame(
    path('M12 57Q29 40 48 43L61 28L69 43Q78 46 87 40L82 52L90 63Q78 60 69 65L61 81L49 66Q30 72 12 57Z', mid, ink, 1.8) +
    path('M59 65L67 64L65 70M66 61L73 63L70 68M71 58L78 61L75 65', '#fffaf4', ink, .8) + eye(76, 50, 1.3) + curve('M31 52L28 61M37 50L34 64M43 49L41 65', glint, 1) + path('M19 76Q27 71 35 76M19 82Q27 77 35 82', 'none', glint, 1.2));
  if (n.includes('peixe')) return noFrame(
    path('M15 52Q34 27 62 39Q70 42 79 31L78 48L91 52L78 57L79 73Q70 62 62 65Q34 77 15 52Z', mid, ink, 1.8) +
    path('M38 40Q51 52 38 64M48 38Q61 52 48 66', 'none', glint, 1.2) + [circle(44,46,1,ink),circle(52,44,1,ink),circle(60,47,1,ink),circle(43,57,1,ink),circle(52,60,1,ink),circle(60,57,1,ink)].join('') + eye(29, 49, 1.4) + curve('M19 78Q34 72 46 78M57 82Q69 75 82 80', glint, 1.2));
  if (n.includes('sapo')) return noFrame(
    path('M30 53Q27 42 33 36Q36 30 43 36Q50 31 57 36Q64 30 68 36Q74 42 70 53Q78 61 72 73L63 81H37L28 73Q22 61 30 53Z', mid, ink, 1.8) +
    ellipse(38, 38, 8, 9, '#fffaf4', ink, 1.1) + ellipse(62, 38, 8, 9, '#fffaf4', ink, 1.1) + eye(38, 38, 1.5) + eye(62, 38, 1.5) +
    path('M33 64Q50 76 67 64', 'none', ink, 1.4) + path('M22 82Q50 74 78 82Q67 92 50 91Q33 92 22 82Z', glint, ink, 1.2) +
    [circle(18,72,1.5,glint),circle(82,72,1.5,glint),circle(50,21,2,glint)].join(''));
  if (n.includes('jacaré')) return noFrame(
    path('M13 59Q18 49 34 48L53 43L81 47L90 55L82 61L55 63Q47 72 30 69L18 66Z', mid, ink, 1.8) +
    path('M22 51L25 42L33 49M38 47L41 39L48 46M59 47L62 39L69 47', 'none', ink, 1.4) + eye(73, 49, 1.2) +
    path('M19 59Q39 55 54 59L51 64Q39 66 24 63Z', '#fffaf4', ink, 1) + [0,1,2,3,4,5].map(i => path('M' + (29+i*4) + ' 59L' + (31+i*4) + ' 63', 'none', ink, .8)).join('') +
    curve('M32 69L30 78M45 68L45 77M59 64L63 71', ink, 1.3));
  if (n.includes('dragão')) return noFrame(
    path('M22 70Q34 56 49 62Q60 67 70 54Q79 42 67 37Q57 34 52 43Q47 50 56 53Q61 54 64 50M70 54L83 50L75 61L84 67L66 64M35 62Q36 45 50 37L44 28L56 31L61 22L66 35Q79 35 83 43L72 48', 'none', mid, 3) +
    path('M41 59Q26 34 17 31Q21 51 37 66ZM45 56Q48 35 64 27Q64 46 51 62Z', mid, ink, 1.5) + path('M58 41L68 44L61 48Z', glint, ink, .9) + eye(68, 39, 1.2) +
    curve('M39 65L34 73L42 70L43 78L50 70M53 65L57 74L61 68L67 74', glint, 1.3) + path('M31 74L27 86M44 75L43 86M62 67L68 80', 'none', ink, 1.5));
  if (n.includes('cobra')) return noFrame(
    path('M21 81Q12 63 28 55Q43 47 56 56Q71 66 80 52Q89 36 73 28Q59 21 51 33Q44 43 54 48Q62 52 67 44', 'none', mid, 9) +
    path('M21 81Q12 63 28 55Q43 47 56 56Q71 66 80 52Q89 36 73 28Q59 21 51 33Q44 43 54 48Q62 52 67 44', 'none', ink, 1.3) +
    path('M61 26Q68 18 82 22L76 35Q68 35 61 31Z', mid, ink, 1.4) + eye(76, 25, 1) + path('M79 31L88 34L80 36Z', glint, ink, .8) + curve('M25 58Q31 58 36 62M50 55Q53 61 51 66M69 54Q74 57 78 54', glint, 1));
  if (n.includes('caracol')) return noFrame(
    path('M19 69Q20 47 39 46Q43 46 45 49Q44 25 62 22Q82 21 83 42Q83 59 67 62L65 72Q48 80 28 74Z', mid, ink, 1.8) +
    path('M45 49Q47 29 63 29Q76 29 76 42Q76 54 63 55Q55 55 54 48Q54 42 61 41Q66 41 67 46', 'none', glint, 1.8) +
    path('M25 63L22 44M34 63L35 41', 'none', ink, 1.4) + circle(22, 42, 1.7, ink) + circle(35, 39, 1.7, ink) + curve('M22 73Q45 80 70 70', '#fffaf4', 1));
  if (n.includes('dinossauro')) return noFrame(
    path('M18 71Q18 58 31 54L38 41L41 25L48 37L54 22L60 37L68 28L69 43Q82 47 82 58L75 65L78 78L69 78L65 64Q52 71 39 65L35 84L27 84L28 65L21 77Z', mid, ink, 1.8) +
    path('M71 46L87 52L73 56Z', glint, ink, 1) + eye(74, 48, 1.2) + curve('M40 44L46 49M53 43L59 49M39 58Q51 63 63 58', glint, 1.2));
  if (n.includes('tartaruga')) return noFrame(
    path('M23 57Q22 37 43 32Q62 28 72 43L81 39L78 52L86 58L76 61Q72 77 53 78Q34 78 27 66L19 72L21 63L14 60Z', mid, ink, 1.8) +
    path('M35 43L45 35L56 38L66 46L61 61L49 69L37 62Z', 'none', glint, 1.3) + path('M45 35L46 47L56 38M46 47L37 62M46 47L61 61M46 47L66 46M46 47L49 69', 'none', ink, 1) + eye(76, 48, 1.2) + curve('M28 68L25 77M38 74L36 82M64 74L67 82', ink, 1.3));
  return noFrame(path('M50 18Q72 20 77 42Q82 64 62 80L50 88L38 80Q18 64 23 42Q28 20 50 18Z', mid, ink, 1.8) + eye(42, 49, 1.5) + eye(58, 49, 1.5) + path('M46 61Q50 57 54 61L50 66Z', ink, 'none') + curve('M50 66V71M50 71Q46 75 43 71M50 71Q54 75 57 71', ink, 1.1));
}

function animalHero(name) {
  const n = name.toLowerCase();
  const outline = P, soft = S, accent = D;
  const svgArt = (parts) => svg(parts);
  const lineArt = (d, color = outline, width = 1.4) => path(d, 'none', color, width);
  const eye = (x, y, r = 1.5) => ellipse(x, y, r * 1.3, r, outline, 'none') + circle(x - .35, y - .45, .5, '#fffaf4');
  const leaf = (x, y, angle) => path('M' + x + ' ' + y + 'Q' + (x + angle) + ' ' + (y - 12) + ' ' + (x + angle * 1.65) + ' ' + (y - 17) + 'Q' + (x + angle * 1.3) + ' ' + (y - 5) + ' ' + x + ' ' + y + 'Z', accent, outline, .9);

  if (n === 'panda') {
    return svgArt(
      path('M24 38Q18 26 27 19Q37 13 45 30Q50 28 55 30Q64 13 74 19Q83 26 76 39Q84 56 75 72Q66 86 50 86Q34 86 25 72Q16 56 24 38Z', '#fffaf4', outline, 1.8) +
      ellipse(30, 25, 5.5, 6.5, outline, 'none') + ellipse(70, 25, 5.5, 6.5, outline, 'none') +
      ellipse(38, 51, 7, 10, outline, 'none', 0, 'rotate(22 38 51)') + ellipse(62, 51, 7, 10, outline, 'none', 0, 'rotate(-22 62 51)') +
      eye(38, 51, 1.55) + eye(62, 51, 1.55) +
      path('M41 65Q50 59 59 65Q57 75 50 76Q43 75 41 65Z', soft, outline, 1.1) + path('M46 65Q50 62 54 65L50 69Z', outline, 'none') +
      lineArt('M50 69V73M50 73Q46 77 42 73M50 73Q54 77 58 73', outline, 1.15) +
      lineArt('M31 62L20 59M31 66L19 67M69 62L80 59M69 66L81 67', soft, 1) +
      lineArt('M23 83Q16 71 14 56M14 56L9 50M14 56L20 51M18 70Q11 66 7 68M18 70Q13 76 12 80', accent, 1.35) +
      leaf(14, 57, -7) + leaf(17, 69, 7) + leaf(12, 78, -5)
    );
  }

  if (n === 'gato') {
    return svgArt(
      path('M38 84Q31 76 31 65Q31 53 40 46L36 37L39 17L53 32Q60 30 66 35L79 24L77 47Q83 59 77 72Q73 81 67 85M37 66Q25 68 23 79Q21 89 31 90Q38 90 44 83', soft, outline, 1.9) +
      path('M42 40L40 22L52 35M69 40L77 29L75 47', 'none', accent, 1.25) +
      eye(48, 49, 1.35) + eye(66, 49, 1.35) +
      path('M54 59Q58 56 62 59L58 63Z', outline, 'none') + lineArt('M58 63V68M58 68Q54 72 51 68M58 68Q62 72 65 68', outline, 1.05) +
      lineArt('M52 61L40 59M52 65L39 66M64 61L77 59M64 65L78 66', outline, 1) +
      path('M47 78Q55 81 65 78M49 73Q56 76 64 73', 'none', '#fffaf4', 1.1) +
      path('M38 83Q24 79 22 66Q20 55 28 52Q36 50 36 59', 'none', outline, 3.3) +
      lineArt('M39 87Q53 91 70 87', accent, 1.25) + circle(56, 87, 2, accent, outline, .8)
    );
  }

  if (n === 'coelho') {
    return svgArt(
      ellipse(53, 69, 22, 16, soft, outline, 1.7) +
      path('M34 60Q29 50 35 42Q39 37 47 38Q53 39 56 45Q61 43 67 47Q73 53 69 61L62 67L42 67Z', '#fffaf4', outline, 1.6) +
      path('M42 41C32 17 29 5 35 7Q46 10 50 39M53 40C50 18 53 6 59 9Q68 14 62 44', soft, outline, 1.55) +
      path('M39 36Q34 17 36 12Q42 18 46 38M56 39Q55 19 59 14Q64 23 60 39', 'none', accent, 1.2) +
      eye(62, 50, 1.35) + path('M69 56L77 59L69 61Z', accent, outline, .8) +
      lineArt('M50 53Q55 50 59 52M43 63Q56 70 69 62', '#fffaf4', 1.1) +
      path('M69 74Q79 68 82 76Q83 83 75 84Q69 83 69 74Z', '#fffaf4', outline, 1.2) +
      lineArt('M37 78Q51 82 66 79M38 84L35 89M61 84L64 89', outline, 1.1) +
      leaf(24, 51, -5) + path('M22 54Q18 45 19 38M19 43L14 40M19 43L23 39', 'none', accent, 1.1)
    );
  }

  if (n === 'cachorro') {
    return svgArt(
      path('M29 41Q17 27 21 18Q29 13 43 34Q50 30 57 33Q72 11 81 18Q85 29 72 45Q78 57 73 70Q66 84 50 84Q34 84 27 70Q21 57 29 41Z', soft, outline, 1.8) +
      path('M28 35Q18 22 23 19Q31 16 41 35M72 35Q82 23 79 19Q72 16 62 35', 'none', accent, 1.2) +
      path('M38 51Q42 45 47 50M53 50Q58 45 62 51', 'none', outline, 1.2) + eye(42, 51, 1.35) + eye(58, 51, 1.35) +
      path('M37 62Q50 54 63 62Q62 75 50 77Q38 75 37 62Z', '#fffaf4', outline, 1.2) + ellipse(50, 62, 3.8, 2.5, outline, 'none') +
      lineArt('M50 65V70M50 70Q46 74 43 70M50 70Q54 74 57 70', outline, 1.1) +
      path('M34 82Q50 88 66 82L62 91Q50 95 38 91Z', accent, outline, 1.2) + circle(50, 87, 2, '#fffaf4', outline, .8) +
      lineArt('M29 45Q25 58 31 65M71 45Q75 58 69 65', '#fffaf4', 1)
    );
  }

  if (n === 'patinhas') {
    const stamp = (x, y, scale, rotation) => '<g transform=\"translate(' + x + ' ' + y + ') rotate(' + rotation + ' 50 50) scale(' + scale + ')\">' +
      path('M25 37C19 34 18 24 22 19Q27 13 32 20Q37 28 33 35Q30 39 25 37ZM43 28C39 23 41 13 47 10Q54 7 56 16Q58 23 52 29Q47 32 43 28ZM64 35C61 29 65 20 71 18Q78 17 78 26Q78 33 71 37Q67 39 64 35ZM81 48C78 42 83 35 89 35Q96 36 94 44Q92 51 86 52Q82 52 81 48ZM56 45C49 38 39 39 34 47Q28 56 36 66Q44 77 56 84Q68 77 76 66Q84 55 76 47Q68 39 56 45Z', soft, outline, 2.2) +
      lineArt('M38 53Q44 48 50 51M62 51Q68 48 73 54M41 66Q55 75 69 65', '#fffaf4', 1.3) + '</g>';
    return svgArt(stamp(0, 0, .63, -18) + stamp(38, 30, .48, 12) + stamp(-5, 62, .39, -12) + path('M8 94Q28 84 45 88M54 87Q73 81 93 87', 'none', accent, 1.1));
  }

  if (n === 'borboleta') {
    return svgArt(
      path('M48 47C42 25 28 12 18 17Q5 25 15 43Q22 54 44 54C21 58 16 72 25 81Q37 91 48 62M52 47C58 25 72 12 82 17Q95 25 85 43Q78 54 56 54C79 58 84 72 75 81Q63 91 52 62Z', soft, outline, 1.8) +
      lineArt('M47 49Q32 30 17 22M45 53Q27 49 15 42M47 57Q34 65 26 79M53 49Q68 30 83 22M55 53Q73 49 85 42M53 57Q66 65 74 79', accent, 1.2) +
      [ellipse(29, 34, 4.2, 6.5, 'none', accent, 1.2, 'rotate(-35 29 34)'), ellipse(71, 34, 4.2, 6.5, 'none', accent, 1.2, 'rotate(35 71 34)'), circle(33, 68, 3, accent, outline, .8), circle(67, 68, 3, accent, outline, .8)].join('') +
      ellipse(50, 53, 3.2, 21, outline, 'none') + path('M48 34Q38 17 31 21M52 34Q62 17 69 21', 'none', outline, 1.3) +
      circle(31, 21, 1.2, accent) + circle(69, 21, 1.2, accent) +
      lineArt('M48 74Q43 80 40 84M52 74Q57 80 60 84', outline, 1.1)
    );
  }

  if (n === 'urso') {
    return svgArt(
      path('M27 39Q18 29 25 20Q34 12 43 29Q50 26 57 29Q66 12 75 20Q82 29 73 40Q82 58 74 72Q67 84 50 85Q33 84 26 72Q18 58 27 39Z', soft, outline, 1.8) +
      ellipse(30, 26, 5.5, 5.5, accent, outline, 1) + ellipse(70, 26, 5.5, 5.5, accent, outline, 1) +
      path('M34 50Q39 44 45 50M55 50Q61 44 66 50', 'none', outline, 1.25) + eye(40, 51, 1.4) + eye(60, 51, 1.4) +
      path('M38 62Q50 53 62 62Q61 75 50 77Q39 75 38 62Z', '#fffaf4', outline, 1.2) + ellipse(50, 61, 3.6, 2.5, outline, 'none') +
      lineArt('M50 64V69M50 69Q46 73 43 69M50 69Q54 73 57 69', outline, 1.1) +
      lineArt('M30 44L34 40M32 47L37 43M70 44L66 40M68 47L63 43', accent, 1) +
      path('M78 73Q86 66 90 71Q92 77 85 81Q80 81 78 73Z', accent, outline, 1) + lineArt('M83 72Q86 75 87 78', '#fffaf4', 1)
    );
  }

  if (n === 'capivara') {
    return svgArt(
      path('M13 62Q17 49 35 47L38 37Q43 30 54 32L78 37Q87 39 88 46L82 52L72 53Q73 68 66 75Q57 83 40 79L25 77Q15 74 13 62Z', soft, outline, 1.8) +
      path('M37 39Q35 31 42 29L48 36M57 34Q60 27 67 31L68 39', 'none', outline, 1.4) +
      eye(75, 43, 1.3) + path('M82 47Q91 47 91 52L79 53Z', accent, outline, 1) +
      lineArt('M44 41Q57 37 68 42M28 68Q45 74 64 69M31 76L28 84M46 78L45 85M64 75L68 82', '#fffaf4', 1.1) +
      lineArt('M19 89Q34 84 48 89M54 91Q70 85 84 89M24 94L20 87M75 95L79 87', accent, 1.15) +
      path('M18 80Q15 72 17 65M17 71L12 68M17 71L21 67M83 82Q86 74 85 67M85 75L90 71', 'none', outline, 1.1)
    );
  }

  if (n === 'cobra') {
    const scales = Array.from({ length: 4 }, (_, row) => Array.from({ length: 5 }, (_, col) => {
      const x = 39 + col * 6 + (row % 2) * 3, y = 56 + row * 5;
      return path('M' + (x - 3) + ' ' + y + 'Q' + x + ' ' + (y + 5) + ' ' + (x + 3) + ' ' + y, 'none', row % 2 ? accent : outline, .8);
    }).join('')).join('');
    return svgArt(
      path('M46 75C26 78 19 66 27 58Q33 51 48 57Q62 63 72 55Q81 48 74 41L66 38Q61 23 50 20Q39 17 31 24Q22 33 28 44Q34 51 43 49Q51 47 49 41Q47 36 42 39', 'none', soft, 11) +
      path('M46 75C26 78 19 66 27 58Q33 51 48 57Q62 63 72 55Q81 48 74 41L66 38Q61 23 50 20Q39 17 31 24Q22 33 28 44Q34 51 43 49Q51 47 49 41Q47 36 42 39', 'none', outline, 1.5) +
      path('M39 29Q27 18 23 31Q21 43 33 49Q29 36 39 29ZM61 29Q73 18 77 31Q79 43 67 49Q71 36 61 29Z', soft, outline, 1.6) +
      path('M40 22Q50 13 60 22L65 36Q57 42 50 42Q43 42 35 36Z', accent, outline, 1.4) +
      ellipse(50, 28, 4.2, 3.2, soft, outline, 1) + ellipse(50, 28, 1.2, 2.4, outline, 'none') +
      path('M48 32L44 38M52 32L56 38M50 40L46 46M50 40L54 46', 'none', accent, 1.1) +
      scales + lineArt('M28 64Q37 58 45 64M34 72Q45 66 53 72M59 58Q66 59 71 55', '#fffaf4', 1)
    );
  }

  return animalLegacy(name);
}

function fruit(name, seed) {
  const n = name.toLowerCase();
  if (n.includes('cereja')) return framed(path('M50 50Q44 22 34 19M51 49Q56 19 70 18', 'none', S, 3) + circle(36, 58, 18, P, '#fffaf4', 1) + circle(65, 59, 17, D, P, 1.2) + path('M23 50Q34 42 45 51M53 52Q66 42 77 54', 'none', '#fffaf4', 2));
  if (n.includes('morango')) return framed(path('M50 82Q25 60 27 42Q29 27 50 38Q71 27 73 42Q75 60 50 82Z', P, P, 1.5) + path('M50 41Q41 29 34 34L42 25L50 34L58 25L66 34Q59 30 50 41Z', S, P, 1.2) + [34, 48, 62].flatMap((x) => [47, 60].map((y) => ellipse(x + seed % 2, y, 1.4, 2.5, D))).join(''));
  if (n.includes('melancia')) return framed(path('M18 71A45 45 0 0 1 82 71Z', P, P, 1.4) + path('M23 70A38 38 0 0 1 77 70M27 70A33 33 0 0 1 73 70', 'none', '#fffaf4', 3) + [37, 50, 63].map((x) => ellipse(x, 51, 1.5, 3, D, P, 1)).join(''));
  if (n.includes('abacaxi')) return framed(path('M50 86Q28 74 31 48Q32 26 50 25Q68 26 69 48Q72 74 50 86Z', D, P, 2) + path('M50 27Q38 10 32 15L45 32M51 27Q56 8 66 12L56 34M49 28Q49 8 48 10', S, P, 1.6) + [38, 46, 54, 62].map((x) => line(x, 37, x - 7, 70, P, 1.2)).join('') + [42, 54, 64].map((y) => line(34, y, 66, y, P, 1.1)).join(''));
  if (n.includes('banana')) return framed(path('M20 29Q34 62 69 70Q79 72 82 62Q79 83 62 83Q31 81 17 43Z', D, P, 2) + path('M23 27Q47 69 78 64M20 27L17 23M78 64L83 62', 'none', P, 2));
  if (/maçã|pera/.test(n)) return framed(path(n.includes('pera') ? 'M47 27Q42 18 49 13Q58 9 57 22Q76 30 72 54Q68 78 50 83Q30 79 28 56Q27 36 47 27Z' : 'M50 31Q42 22 34 29Q22 40 30 63Q38 83 50 82Q62 83 70 63Q78 40 66 29Q58 22 50 31Z', S, P, 2) + path('M50 31Q49 19 58 16M54 24Q67 16 73 24Q65 31 54 24Z', 'none', D, 2) + path('M39 46Q44 41 48 46', 'none', '#fffaf4', 2));
  if (/pêssego|ameixa|manga|romã|goiaba|caju|acerola|mamão/.test(n)) {
    const shape = n.includes('manga') || n.includes('caju') ? 'M49 83Q26 70 29 46Q31 27 51 30Q69 17 76 36Q83 58 49 83Z' : 'M50 82Q24 76 25 51Q25 29 49 29Q76 25 77 52Q77 75 50 82Z';
    const face = path(shape, n.includes('pêssego') ? '#E69A77' : S, P, 2) + path('M50 30Q50 19 59 16M53 24Q67 14 73 23Q65 31 53 24Z', 'none', D, 2);
    return framed(face + (n.includes('romã') ? path('M38 49Q50 43 62 49M38 60Q50 54 62 60M42 70Q50 66 58 70', 'none', '#fffaf4', 1.7) + [43, 52, 59].map((x) => circle(x, 54 + x % 2 * 10, 1.5, P)).join('') : path('M48 42Q56 51 47 60Q42 68 50 73', 'none', '#fffaf4', 2)));
  }
  if (/pitaya/.test(n)) return framed(path('M50 82Q28 66 32 43Q35 26 50 31Q65 26 68 43Q72 66 50 82Z', '#F1A7B6', P, 2) + path('M34 47L25 36L39 40M66 47L75 36L61 40M38 32L36 20L47 29M62 32L64 20L53 29', S, P, 1.7) + [40, 50, 60].map((x) => ellipse(x, 49 + x % 2 * 10, 1, 2, P)).join(''));
  if (/maracujá/.test(n)) return framed(circle(50, 52, 28, '#B98A46', P, 2) + circle(50, 52, 21, '#F5D879', P, 1.5) + [0, 1, 2, 3, 4, 5].map((i) => circle(38 + i % 3 * 12, 42 + Math.floor(i / 3) * 18, 3, '#E99647', '#fffaf4', 1)).join('') + path('M38 29Q50 20 62 29', 'none', S, 2));
  if (/melão/.test(n)) return framed(path('M21 53A29 29 0 0 0 79 53Q50 81 21 53Z', '#D6C56B', P, 2) + path('M21 53A29 29 0 0 1 79 53M29 51Q50 60 71 51M35 43Q50 48 65 43', 'none', '#fffaf4', 1.8) + path('M50 24Q55 17 63 19', 'none', S, 2));
  if (/abacate/.test(n)) return framed(path('M51 17Q61 16 64 30L78 58Q84 77 64 84Q50 90 35 82Q16 72 25 54L39 27Q43 17 51 17Z', S, P, 2) + path('M50 31Q58 31 62 43L70 60Q73 71 60 76Q49 80 38 73Q29 67 35 56L43 37Q46 31 50 31Z', '#D5C678', P, 1.5) + circle(53, 61, 10, '#8E6040', P, 1.3) + path('M51 58Q55 55 58 59', 'none', '#fffaf4', 1.8));
  if (/coco/.test(n)) return framed(circle(50, 52, 29, '#87583D', P, 2) + path('M34 39Q48 25 62 39M35 42Q49 31 61 42', 'none', '#F3E8D8', 5) + circle(41, 59, 2, '#F3E8D8') + circle(59, 59, 2, '#F3E8D8') + path('M26 75Q50 84 74 75', 'none', D, 2));
  if (/carambola/.test(n)) return framed(path('M50 19L58 38L78 31L67 49L83 63L62 64L58 85L48 66L28 75L37 56L20 43L41 41Z', D, P, 2) + circle(50, 51, 8, '#F5E4A0', P, 1.3) + path('M50 43V59M42 51H58', 'none', P, 1));
  if (/limão|laranja|kiwi|frutas em fatias/.test(n)) return framed(circle(50, 51, 29, n.includes('laranja') ? '#E58A47' : n.includes('kiwi') ? '#8BA45E' : '#D3C45F', P, 2) + circle(50, 51, 21, 'none', '#fffaf4', 2) + Array.from({ length: 8 }, (_, i) => line(50, 51, 50 + Math.cos(i * Math.PI / 4) * 20, 51 + Math.sin(i * Math.PI / 4) * 20, '#fffaf4', 1.5)).join('') + circle(50, 51, 3, '#fffaf4') + ellipse(65, 22, 8, 4, S, P, 1, 'rotate(-25 65 22)'));
  if (/uva|amora|framboesa|mirtilo|cesta/.test(n)) return framed(Array.from({ length: 9 }, (_, i) => circle(34 + i % 3 * 16 + Math.floor(i / 3) * 2, 43 + Math.floor(i / 3) * 15, 9, i % 2 ? P : '#775C91', '#fffaf4', 1)).join('') + path('M49 32Q48 19 58 16M58 19Q70 10 76 19Q67 27 58 19Z', S, P, 1.5));
  return framed(path('M50 84Q25 65 27 43Q29 24 48 29Q53 17 64 22Q77 29 73 48Q69 69 50 84Z', P, P, 2) + path('M48 31Q52 18 66 16', 'none', S, 3) + ellipse(68, 19, 9, 4, S, P, 1, 'rotate(-24 68 19)') + path('M37 41Q44 34 50 39', 'none', '#fffaf4', 2));
}

function object(name, seed, category) {
  const n = name.toLowerCase();
  if (/coroa|princesa/.test(n)) return framed(path('M19 72L15 35L35 50L50 20L65 50L85 35L81 72Z', S, P, 2.1) + line(23, 79, 77, 79, D, 4) + [34, 50, 66].map((x) => circle(x, x === 50 ? 27 : 49, 3, D, P, 1)).join(''));
  if (/coração/.test(n)) return framed(path('M50 78C41 68 19 54 20 36C21 19 41 17 50 32C60 17 80 20 80 37C79 54 60 69 50 78Z', S, P, 2) + path('M33 37Q39 27 45 33', 'none', '#fffaf4', 2));
  if (/sol/.test(n)) return framed(circle(50, 50, 17, D, P, 1.5) + Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return line(50 + Math.cos(a) * 26, 50 + Math.sin(a) * 26, 50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36, P, 2); }).join(''));
  if (/lua|meia-lua/.test(n)) return framed(path('M63 19A32 32 0 1 0 80 68A27 27 0 0 1 63 19Z', D, P, 2) + star(35, 32, 4, S));
  if (/nuvem/.test(n)) return framed(path('M25 67Q13 65 17 52Q19 42 31 43Q34 27 49 30Q62 31 64 44Q80 40 83 53Q87 68 74 69Z', S, P, 2) + path('M31 75L27 83M50 75L46 83M68 75L64 83', 'none', D, 2));
  if (/arco-íris/.test(n)) return framed(path('M20 75A30 30 0 0 1 80 75M28 75A22 22 0 0 1 72 75M36 75A14 14 0 0 1 64 75', 'none', S, 5) + line(16, 78, 84, 78, P, 2));
  if (/pérola/.test(n)) return framed(Array.from({ length: 7 }, (_, i) => circle(23 + i * 9, 49 + Math.sin(i) * 12, 5, S, P, 1)).join('') + path('M20 50Q50 20 80 50', 'none', D, 1.5));
  if (/concha|estrela-do-mar/.test(n)) return framed(path('M50 81Q18 70 21 47Q22 27 50 18Q78 27 79 47Q82 70 50 81Z', S, P, 2) + [0, 1, 2, 3, 4].map((i) => path('M50 77Q' + (31 + i * 9) + ' 45 50 21', 'none', D, 1.6)).join('') + circle(50, 68, 3, '#fffaf4'));
  if (/diamante|cristal|pedraria/.test(n)) return framed(path('M26 33L39 19H61L75 33L50 82Z', S, P, 2.2) + path('M26 33H75M39 19L42 33L50 82L59 33L61 19', 'none', D, 1.5));
  if (/corrente|algema/.test(n)) return framed(Array.from({ length: 5 }, (_, i) => ellipse(29 + i * 11, 50 + i % 2 * 2, 8, 13, 'none', i % 2 ? S : P, 3, 'rotate(-30 ' + (29 + i * 11) + ' 50)')).join(''));
  if (/óculos/.test(n)) return framed(ellipse(32, 49, 16, 14, 'none', P, 3) + ellipse(68, 49, 16, 14, 'none', P, 3) + path('M48 47Q50 42 52 47M16 45L9 39M84 45L91 39', 'none', S, 2));
  if (/relógio/.test(n)) return framed(rect(29, 37, 42, 31, S, P, 8) + path('M39 37L42 21H58L61 37M39 68L42 83H58L61 68', 'none', P, 3) + circle(50, 52, 11, '#fffaf4', P, 1.5) + line(50, 52, 50, 43, D, 2) + line(50, 52, 57, 56, P, 1.5));
  if (/livro|carta|mapa|documento/.test(n)) return framed(path('M18 24Q35 18 50 28Q65 18 82 24V76Q64 70 50 80Q35 70 18 76Z', S, P, 2) + path('M50 28V80M27 37Q37 35 43 40M27 49Q38 47 43 51M58 40Q68 35 75 38M58 52Q68 48 75 50', 'none', '#fffaf4', 1.5));
  if (/perfume|esmalte|poção|incenso|frasco/.test(n)) return framed(rect(31, 41, 38, 42, S, P, 8) + rect(40, 25, 20, 17, D, P, 3) + rect(43, 17, 14, 8, P, 'none', 2) + path('M38 57Q50 50 62 57', 'none', '#fffaf4', 2) + circle(50, 66, 3, D));
  if (/câmera|celular|computador|fone|microfone/.test(n)) return framed(rect(20, 31, 60, 42, S, P, 8) + (n.includes('câmera') ? circle(50, 52, 13, '#fffaf4', P, 2) + circle(50, 52, 7, D, P, 1) : rect(27, 37, 46, 29, '#fffaf4', P, 3)) + circle(72, 39, 2, D));
  if (/balão/.test(n)) return framed(ellipse(50, 41, 22, 28, S, P, 2) + path('M45 67L50 75L55 67M50 75Q48 86 54 90', 'none', P, 1.8) + path('M36 42Q41 27 52 25', 'none', '#fffaf4', 2));
  if (/planeta|espaço|foguete|cometa/.test(n)) return framed(circle(47, 49, 18, S, P, 2) + ellipse(50, 50, 34, 11, 'none', D, 2, 'rotate(-28 50 50)') + star(25, 26, 5, D) + circle(73, 73, 2.5, P));
  if (/presente|gift/.test(n)) return framed(rect(22, 39, 56, 42, S, P, 5) + rect(18, 32, 64, 11, D, P, 3) + rect(45, 32, 10, 49, '#fffaf4', P, 2) + path('M50 33Q28 31 32 19Q37 10 50 30Q63 10 68 19Q72 31 50 33Z', 'none', P, 2) + circle(50, 29, 3, D, P, 1));
  if (/bolo|cupcake/.test(n)) return framed(path('M25 48H75L69 78H31Z', S, P, 2) + path('M24 48Q28 34 40 40Q44 27 52 37Q62 29 65 41Q78 38 77 48Z', '#fffaf4', P, 2) + line(50, 20, 50, 34, P, 2) + path('M50 15Q54 21 50 25Q46 21 50 15Z', D, P, 1));
  if (/relógio|virada/.test(n)) return framed(circle(50, 50, 29, '#fffaf4', P, 2.3) + circle(50, 50, 22, 'none', S, 1.5) + line(50, 50, 50, 31, P, 2.3) + line(50, 50, 65, 58, D, 2.3) + [0, 1, 2, 3].map((i) => circle(50 + Math.cos(i * Math.PI / 2) * 20, 50 + Math.sin(i * Math.PI / 2) * 20, 1.8, P)).join(''));
  if (/floco de neve|neve|cristal de gelo/.test(n)) return framed(Array.from({ length: 6 }, (_, i) => {
    const a = i * Math.PI / 3, x = 50 + Math.cos(a) * 34, y = 50 + Math.sin(a) * 34;
    return line(50, 50, x, y, P, 2) + line(x, y, x - Math.cos(a - .55) * 8, y - Math.sin(a - .55) * 8, S, 1.8) + line(x, y, x - Math.cos(a + .55) * 8, y - Math.sin(a + .55) * 8, S, 1.8);
  }).join('') + circle(50, 50, 4, D));
  if (/árvore de natal|pinheiro/.test(n)) return framed(path('M50 16L33 39H41L27 56H40L24 74H76L60 56H73L59 39H67Z', S, P, 2) + rect(46, 74, 8, 11, D, P, 1) + star(50, 14, 6, D, P));
  if (/abóbora/.test(n)) return framed(path('M50 28Q39 20 32 32Q19 27 18 51Q17 76 35 77Q50 86 65 77Q83 78 82 51Q81 27 68 32Q60 20 50 28Z', D, P, 2) + path('M50 30Q48 20 55 15', 'none', S, 4) + path('M38 40Q45 51 39 66M50 38Q56 52 50 69M62 40Q56 51 62 66', 'none', P, 1.5));
  if (/cogumelo/.test(n)) return framed(path('M20 49Q22 21 50 20Q78 21 80 49Z', S, P, 2) + path('M42 48L38 79Q50 86 62 79L58 48', '#fffaf4', P, 2) + [35, 50, 65].map((x, i) => circle(x, 35 + i % 2 * 6, 3, D)).join(''));
  if (/fogueira/.test(n)) return framed(path('M50 18Q65 40 51 49Q62 43 67 34Q82 67 65 78Q51 88 36 78Q17 65 37 39Q36 57 47 57Q56 47 50 18Z', S, P, 2) + path('M48 55Q57 68 48 76Q39 71 48 55Z', D, P, 1.5) + line(31, 83, 68, 83, P, 3));
  if (/bandeirinha|serpentina|confete/.test(n)) return framed(path('M18 24Q50 36 82 24V76L66 65L50 78L34 65L18 76Z', S, P, 2) + [26, 38, 50, 62, 74].map((x, i) => star(x, i % 2 ? 47 : 54, 3.5, D)).join('') + path('M16 17Q50 29 84 17', 'none', P, 1.8));
  if (/castelo|princesas/.test(n)) return framed(path('M21 79V38H36V51H43V30H57V51H64V38H79V79ZM47 79V62Q50 54 54 62V79M25 38V25L31 30L37 25V38M63 38V25L69 30L75 25V38', S, P, 2) + star(50, 19, 5, D));
  if (/sapatinho|cristal/.test(n)) return framed(path('M19 64Q40 65 54 48Q59 42 64 49L71 65L81 71V80H19Z', '#fffaf4', P, 2) + path('M27 65Q47 67 59 51M66 53L72 76', 'none', D, 2) + [0, 1, 2].map((i) => star(41 + i * 11, 69, 2.6, S)).join(''));
  if (/varinha|varinhas/.test(n)) return framed(path('M29 75L66 24', 'none', P, 4) + star(70, 19, 9, D, P) + star(30, 31, 4, S) + star(78, 48, 3.5, S) + circle(46, 55, 2, D) + circle(38, 66, 1.7, D));
  if (/maçã envenenada/.test(n)) return fruit('Maçã', seed);
  if (/papai noel/.test(n)) return framed(path('M25 47Q27 23 50 22Q73 23 75 47L70 73Q50 84 30 73Z', S, P, 2) + path('M23 43Q50 34 77 43L72 53Q50 47 28 53Z', '#fffaf4', P, 2) + circle(42, 56, 2, P) + circle(58, 56, 2, P) + path('M42 67Q50 73 58 67', 'none', P, 1.7) + circle(50, 75, 4, '#fffaf4'));
  if (/rena/.test(n)) return framed(path('M32 42Q28 23 17 18M34 35Q22 29 21 20M68 42Q72 23 83 18M66 35Q78 29 79 20', 'none', P, 2.4) + path('M28 48Q29 30 50 30Q71 30 72 48V62Q67 80 50 82Q33 80 28 62Z', S, P, 2) + circle(41, 51, 2, P) + circle(59, 51, 2, P) + circle(50, 65, 5, D, P, 1));
  if (/chapéu de bruxa/.test(n)) return framed(path('M20 71Q50 62 80 71L76 79H24Z', S, P, 2) + path('M31 67L50 20L71 68Z', P, P, 2) + path('M39 50Q52 55 63 49', 'none', D, 4) + star(50, 18, 4, D));
  if (/chocolate/.test(n)) return framed(path('M25 33L72 25L79 69L32 78Z', S, P, 2) + path('M41 30L47 75M57 28L63 72M28 48L76 40M30 63L78 55', 'none', D, 1.5) + path('M68 24L78 30', 'none', '#fffaf4', 2));
  if (/flecha/.test(n)) return framed(path('M20 76L75 25M64 25H76V37M26 68L20 78L31 76', 'none', P, 3) + path('M22 28Q40 16 50 31Q58 43 72 41', 'none', S, 2) + star(50, 51, 5, D));
  if (/lábios/.test(n)) return framed(path('M15 51Q32 32 50 44Q68 32 85 51Q66 70 50 64Q34 70 15 51Z', S, P, 2.2) + path('M18 51Q50 56 82 51', 'none', P, 1.6) + path('M37 39Q50 31 63 39', 'none', D, 1.5));
  if (/cartas de amor|mensagem delicada/.test(n)) return framed(path('M19 30H81V75H19Z', '#fffaf4', P, 2) + path('M20 33L50 56L80 33M20 72L41 53M80 72L59 53', 'none', S, 2) + circle(50, 55, 4, D));
  if (/confete|taça|champanhe/.test(n)) return framed(path('M28 22H72Q70 48 51 57V76H64V81H36V76H49V57Q30 48 28 22Z', S, P, 2) + path('M36 40Q50 47 64 40M50 17V10M63 18L67 11M38 18L34 12', 'none', D, 1.8));
  if (/milho/.test(n)) return framed(path('M50 19Q68 27 65 54Q62 78 50 84Q38 78 35 54Q32 27 50 19Z', D, P, 2) + [0, 1, 2, 3].map((i) => ellipse(43 + i % 2 * 13, 36 + Math.floor(i / 2) * 17, 3, 5, '#F6E5AB', P, 1)).join('') + path('M36 59Q21 49 23 34Q36 41 42 58M64 59Q79 49 77 34Q64 41 58 58', S, P, 1.7));
  if (/máscara|carnaval/.test(n)) return framed(path('M18 37Q50 19 82 37L75 69Q61 66 50 57Q39 66 25 69Z', S, P, 2) + path('M26 44Q37 39 46 46L43 52Q34 48 28 53M54 46Q63 39 74 44L72 53Q66 48 57 52Z', '#fffaf4', P, 1.5) + [27, 50, 73].map((x, i) => star(x, 26, 3.4 + i % 2, D)).join(''));
  if (/cogumelo/.test(n)) return framed(path('M20 49Q22 21 50 20Q78 21 80 49Z', S, P, 2) + path('M42 48L38 79Q50 86 62 79L58 48', '#fffaf4', P, 2) + [35, 50, 65].map((x, i) => circle(x, 35 + i % 2 * 6, 3, D)).join(''));
  if (/navio|pirata/.test(n)) return framed(path('M17 63H83L71 79H33Z', S, P, 2.1) + path('M49 25V62M51 30Q70 35 73 56H51ZM47 34Q30 38 27 56H47Z', '#fffaf4', P, 1.8) + line(24, 84, 76, 84, D, 2));
  if (/sabre|lâmina|punhal|espada/.test(n)) return framed(path('M29 72L70 23L77 17L75 28L37 77Z', S, P, 2) + path('M25 72L40 84M22 79L34 67M35 84L45 74', 'none', D, 3) + circle(71, 25, 2, '#fffaf4'));
  if (/fantasma/.test(n)) return framed(path('M25 81V48Q25 22 50 21Q75 22 75 48V81L62 72L50 82L38 72Z', '#fffaf4', P, 2.2) + circle(42, 48, 3, P) + circle(58, 48, 3, P) + path('M44 58Q50 63 56 58', 'none', D, 1.5));
  if (/robô/.test(n)) return framed(rect(27, 29, 46, 43, S, P, 10) + rect(37, 42, 9, 9, '#fffaf4', P, 2) + rect(54, 42, 9, 9, '#fffaf4', P, 2) + path('M42 60Q50 66 58 60M50 29V20M45 19H55M20 43H27M73 43H80M38 73L34 82M62 73L66 82', 'none', P, 2) + circle(50, 20, 2.5, D));
  if (/bolsa/.test(n)) return framed(path('M25 39H75L71 81H29Z', S, P, 2) + path('M38 40Q38 21 50 21Q62 21 62 40M36 56Q50 65 64 56', 'none', D, 2.2) + circle(50, 54, 3, P));
  if (/sapato|salto/.test(n)) return framed(path('M20 64Q40 63 51 49Q58 41 64 49L70 65L80 72V81H20Z', S, P, 2.2) + path('M65 52L72 77M24 72H77', 'none', D, 2));
  if (/batom|maquiagem/.test(n)) return framed(path('M36 45L43 25L57 25L64 45V80H36Z', S, P, 2) + path('M43 25Q49 13 58 22L57 29H42Z', D, P, 1.8) + line(36, 57, 64, 57, '#fffaf4', 2));
  if (/pente|escova|pincel/.test(n)) return framed(path('M26 30H74V48H26Z', S, P, 2) + Array.from({ length: 7 }, (_, i) => line(31 + i * 6.3, 30, 31 + i * 6.3, 20, P, 1.5)).join('') + path('M50 48L43 82Q50 88 57 82L52 48', 'none', P, 2));
  if (/gravata/.test(n)) return framed(path('M42 20H58L55 34L62 42L53 80H47L38 42L45 34Z', S, P, 2.2) + path('M42 25L50 31L58 25M40 53H60', 'none', D, 1.5));
  if (/bigode/.test(n)) return framed(path('M50 52Q39 41 30 47Q20 40 17 50Q14 65 30 66Q43 66 50 57Q57 66 70 66Q86 65 83 50Q80 40 70 47Q61 41 50 52Z', P, P, 1));
  if (/fogos de artifício|fogos/.test(n)) return framed(Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI * 2 / 10; return line(50, 50, 50 + Math.cos(a) * 34, 50 + Math.sin(a) * 34, i % 2 ? S : D, i % 2 ? 2 : 1.4); }).join('') + circle(50, 50, 4, P) + star(25, 24, 4, D) + star(76, 74, 3, S));
  if (/pentagrama|símbolo feminino/.test(n)) return framed((n.includes('pentagrama') ? star(50, 50, 33, 'none', P) : circle(50, 42, 19, 'none', P, 2.5) + line(50, 61, 50, 84, P, 2.5) + line(39, 75, 61, 75, P, 2.5)));
  if (/caveira/.test(n)) return framed(path('M28 51Q28 22 50 21Q72 22 72 51L65 63V78H57L54 68H46L43 78H35V63Z', S, P, 2.3) + circle(40, 48, 6, P) + circle(60, 48, 6, P) + path('M48 58L50 53L53 58V65H48Z', D, P, 1) + line(42, 72, 58, 72, P, 1.5));
  if (/cruz/.test(n)) return framed(path('M42 18H58V40H79V56H58V82H42V56H21V40H42Z', S, P, 2));
  if (/raio/.test(n)) return framed(path('M57 14L28 55H47L40 85L73 42H53Z', D, P, 2.2) + path('M72 25L78 22M21 70L27 67', 'none', S, 2));
  if (/cacto/.test(n)) return framed(path('M42 82V45Q42 31 51 31Q59 31 59 43V82M42 54H33V45M59 62H69V51', 'none', S, 7) + line(38, 82, 64, 82, P, 2) + [0, 1, 2, 3, 4].map((i) => line(46 + i * 3, 40 + i % 2 * 13, 44 + i * 3, 38 + i % 2 * 13, D, 1.3)).join(''));
  if (/nota musical|disco de vinil/.test(n)) return framed(n.includes('vinil') ? circle(50, 50, 29, P, P, 1) + circle(50, 50, 20, 'none', D, 1.2) + circle(50, 50, 12, 'none', S, 1.2) + circle(50, 50, 4, '#fffaf4') + path('M54 46L71 33V60Q68 67 61 64Q55 61 62 56L67 55V41L54 51Z', D, P, 1.2) : path('M59 21V63Q57 74 44 74Q33 73 38 65Q41 58 54 61V31L76 25V54Q73 65 62 65', S, P, 2) + [0, 1, 2].map((i) => star(25 + i * 8, 32 + i * 15, 3, D)).join(''));
  if (/guitarra/.test(n)) return framed(path('M53 25Q68 15 75 28Q81 38 69 47Q76 61 64 72Q57 79 48 68Q39 76 29 68Q20 61 29 50Q36 42 46 48Q54 41 49 33Z', S, P, 2) + path('M50 48L72 27M61 30L76 45M43 53L58 67', 'none', D, 1.8) + circle(43, 59, 5, 'none', P, 1.5));
  if (/chave|cadeado/.test(n)) return framed(n.includes('cadeado') ? rect(29, 46, 42, 35, S, P, 6) + path('M38 46V35Q38 21 50 21Q62 21 62 35V46', 'none', P, 3) + circle(50, 59, 4, D, P, 1) + line(50, 63, 50, 72, P, 2) : circle(38, 38, 13, 'none', P, 4) + path('M48 46L74 72M64 62L69 57M70 69L75 64', 'none', D, 4) + circle(38, 38, 4, S));
  if (/vela/.test(n)) return framed(path('M34 37H66V81H34Z', S, P, 2) + path('M50 37Q44 29 50 20Q57 28 50 37Z', D, P, 1.4) + path('M38 53Q50 60 62 53', 'none', '#fffaf4', 2) + line(30, 83, 70, 83, P, 2));
  if (/foguete/.test(n)) return framed(path('M50 14Q76 33 66 64L50 81L34 64Q24 33 50 14Z', S, P, 2) + circle(50, 44, 7, '#fffaf4', P, 1.5) + path('M34 53L21 69L37 65M66 53L79 69L63 65M42 74L38 86M58 74L62 86', 'none', D, 2));
  if (/cogumelo/.test(n)) return framed(path('M20 49Q22 21 50 20Q78 21 80 49Z', S, P, 2) + path('M42 48L38 79Q50 86 62 79L58 48', '#fffaf4', P, 2) + [35, 50, 65].map((x, i) => circle(x, 35 + i % 2 * 6, 3, D)).join(''));
  if (/cerejeira/.test(n)) return flower('Flores de cerejeira', seed);
  if (/moinho/.test(n)) return framed(path('M39 40H61L65 80H35Z', S, P, 2) + path('M50 39V18M50 39L31 24M50 39L69 24M50 39L34 57M50 39L66 57', 'none', P, 2.5) + circle(50, 39, 4, D, P, 1));
  if (/monstera|folha|folhagem/.test(n)) return flower('Folhas de monstera', seed);
  if (/teia/.test(n)) return framed(Array.from({ length: 8 }, (_, i) => { const a = Math.PI * 2 * i / 8; return line(50, 50, 50 + Math.cos(a) * 38, 50 + Math.sin(a) * 38, P, 1.3); }).join('') + [13, 23, 33].map((r) => path('M' + (50 - r) + ' 50Q50 ' + (50 - r * .5) + ' ' + (50 + r) + ' 50Q50 ' + (50 + r * .5) + ' ' + (50 - r) + ' 50Z', 'none', S, 1.1)).join(''));
  if (/torre|big ben|arco do triunfo/.test(n)) return framed(path('M50 14L36 84M50 14L64 84M39 68H61M42 52H58M45 37H55M29 84H71M36 59L64 59M41 44L59 44', 'none', P, 2.3) + circle(50, 12, 4, D, P, 1.2) + path('M31 72L69 72M44 28H56', 'none', S, 2));
  if (/coliseu/.test(n)) return framed(path('M19 78V44Q50 25 81 44V78ZM27 46V64M39 42V64M51 40V64M63 42V64M75 46V64M15 78H85', S, P, 2) + [27, 39, 51, 63, 75].map((x) => path('M' + (x - 4) + ' 55Q' + x + ' 47 ' + (x + 4) + ' 55', 'none', D, 1.3)).join(''));
  if (/estátua da liberdade/.test(n)) return framed(path('M50 22L58 30L56 39L69 49L60 50L62 69H71V80H29V69H38L40 50L31 49L44 39L42 30Z', S, P, 2) + star(50, 14, 7, D, P) + line(38, 80, 62, 80, P, 2));
  if (/fuji|pão de açúcar|crist[oó] redentor/.test(n)) return framed(path('M14 79Q33 43 43 48Q53 31 61 50Q70 43 86 79Z', S, P, 2.2) + path('M43 48L50 57L55 48M20 79H80', 'none', '#fffaf4', 2.5) + line(50, 48, 50, 62, D, 1.5));
  if (/taj mahal|coliseu|esfinge/.test(n)) return framed(path('M23 78V53H77V78M30 53Q50 30 70 53M38 53V40M50 53V32M62 53V40M18 78H82M45 78V62Q50 56 55 62V78', S, P, 2) + star(50, 25, 4, D));
  if (/mapa-múndi|globo terrestre|mapas de países/.test(n)) return framed(circle(50, 50, 32, 'none', P, 2) + path('M18 50H82M50 18Q30 50 50 82M50 18Q70 50 50 82M26 34Q50 42 74 34M26 66Q50 58 74 66', 'none', S, 1.6) + ellipse(50, 50, 14, 32, 'none', D, 1.4));
  if (/coração partido/.test(n)) return framed(path('M50 79C42 69 19 53 20 36C21 18 41 17 50 32C59 17 80 20 80 37C79 54 59 70 50 79Z', S, P, 2) + path('M54 26L46 40L53 48L45 58L51 67', 'none', D, 3));
  if (/chama|fogo|incêndio/.test(n)) return framed(path('M50 14Q69 36 57 47Q67 43 72 32Q85 65 65 79Q50 91 35 79Q17 65 38 38Q36 56 48 57Q56 47 50 14Z', S, P, 2) + path('M49 54Q59 67 49 76Q40 70 49 54Z', D, P, 1.3));
  if (/asa|asas negras|morcego/.test(n)) return framed(path('M50 50Q37 24 18 23L24 40L13 37L24 57Q33 53 50 69Q67 53 76 57L87 37L76 40L82 23Q63 24 50 50Z', S, P, 2) + path('M50 46V76M37 41L42 58M63 41L58 58', 'none', D, 1.5) + circle(50, 39, 4, P));
  if (/tarô|tarot|sigilo|símbolos ocultistas|símbolos esotéricos/.test(n)) return framed(rect(27, 17, 46, 66, 'none', P, 5) + rect(32, 22, 36, 56, 'none', D, 1) + star(50, 42, 12, S, P) + circle(50, 62, 5, D, P, 1) + path('M39 28Q50 22 61 28M39 72Q50 78 61 72', 'none', P, 1.3));
  if (/olhos místicos|olho/.test(n)) return framed(path('M14 50Q50 18 86 50Q50 82 14 50Z', S, P, 2.2) + circle(50, 50, 13, D, P, 1.5) + circle(50, 50, 5, P) + [0, 1, 2, 3].map((i) => circle(50 + Math.cos(i * Math.PI / 2) * 22, 50 + Math.sin(i * Math.PI / 2) * 22, 1.6, '#fffaf4')).join(''));
  if (/estrela/.test(n)) return framed(star(50, 48, 28, S, P) + star(28, 26, 5, D) + star(74, 71, 4, D));
  if (/pirâmide|esfinge/.test(n)) return framed(path('M13 79L47 24L85 79Z', S, P, 2.2) + path('M47 24L50 79M31 51H67M22 66H77', 'none', D, 1.5) + line(13, 82, 87, 82, P, 2));
  if (/escudo/.test(n)) return framed(path('M50 14L79 26V50Q75 71 50 86Q25 71 21 50V26Z', S, P, 2.3) + star(50, 49, 14, D, P) + path('M50 30V68M33 49H67', 'none', P, 1.5));
  return framed(circle(50, 50, 27, 'none', P, 2.4) + circle(50, 50, 20, S, P, 1.4) + star(50, 50, 11, D, P) + [0, 1, 2, 3].map((i) => circle(50 + Math.cos(i * Math.PI / 2) * 36, 50 + Math.sin(i * Math.PI / 2) * 36, 2, P)).join(''));
}

function country(name, seed) {
  const n = name.toLowerCase();
  if (n.startsWith('bandeira')) {
    const countryName = n.replace(/^bandeira (dos |do |da |de )?/, ''), c = FLAG_COLORS[countryName] || ['#2861A0', '#FFFFFF', '#D84348'];
    const CP = 'var(--guria-primary, ' + c[0] + ')', CS = 'var(--guria-secondary, ' + c[1] + ')', CD = 'var(--guria-detail, ' + c[2] + ')';
    let body = rect(19, 28, 62, 44, CS, CP, 4);
    if (countryName === 'brasil') body += rect(19, 28, 62, 44, CP, 'none', 4) + path('M50 35L69 50L50 65L31 50Z', CS, 'none') + circle(50, 50, 9, CD) + [0, 1, 2, 3, 4].map((i) => circle(45 + i * 2.3, 49 + i % 2 * 4, 1, '#fff')).join('');
    else if (countryName === 'estados unidos') body += Array.from({ length: 7 }, (_, i) => rect(20, 29 + i * 6, 60, 3, i % 2 ? CS : CP)).join('') + rect(20, 29, 28, 22, CD) + [0, 1, 2, 3, 4, 5].map((i) => star(24 + i % 3 * 9, 33 + Math.floor(i / 3) * 9, 2, CS)).join('');
    else if (countryName === 'reino unido') body += rect(20, 29, 60, 42, CP) + path('M20 29L80 71M80 29L20 71', 'none', CS, 9) + path('M20 29L80 71M80 29L20 71', 'none', CD, 3.5) + path('M20 50H80M50 29V71', 'none', CS, 13) + path('M20 50H80M50 29V71', 'none', CD, 5);
    else if (countryName === 'portugal') body += rect(20, 29, 24, 42, CP) + rect(44, 29, 36, 42, CD) + circle(44, 50, 7, CS, '#D8B85D', 2) + circle(44, 50, 3, '#D8B85D');
    else if (countryName === 'china') body += rect(20, 29, 60, 42, CP) + star(34, 42, 8, CS) + [0, 1, 2, 3].map((i) => star(49 + (i % 2) * 9, 34 + Math.floor(i / 2) * 11, 3, CS)).join('');
    else if (countryName === 'suíça') body += rect(20, 29, 60, 42, CP) + rect(45, 36, 10, 28, CS, 'none', 1) + rect(36, 45, 28, 10, CS, 'none', 1);
    else if (countryName === 'coreia do sul') body += rect(20, 29, 60, 42, '#fff', 'none', 3) + path('M50 38A12 12 0 0 1 50 62A6 6 0 0 0 50 50A6 6 0 0 1 50 38Z', CD, 'none') + path('M50 38A12 12 0 0 0 50 62A6 6 0 0 1 50 50A6 6 0 0 0 50 38Z', '#C83847', 'none') + path('M29 38H40M29 42H40M60 60H71M60 64H71M30 60H41M32 64H39M60 38H71M62 42H69', 'none', P, 2);
    else if (countryName === 'chile') body += rect(20, 29, 60, 21, CP) + rect(20, 50, 60, 21, CS) + rect(20, 29, 21, 21, CD) + star(30, 39, 5, CP);
    else if (countryName === 'austrália') body += rect(20, 29, 60, 42, CP) + rect(20, 29, 29, 21, CD) + path('M20 29L49 50M49 29L20 50', 'none', CS, 4) + path('M20 29L49 50M49 29L20 50', 'none', CD, 1.5) + path('M20 39.5H49M34.5 29V50', 'none', CS, 5) + path('M20 39.5H49M34.5 29V50', 'none', CD, 2) + [0, 1, 2, 3, 4].map((i) => star(57 + i % 2 * 13, 38 + Math.floor(i / 2) * 10, 3, CS)).join('');
    else if (countryName === 'peru') body += rect(20, 29, 60, 14, CP) + rect(20, 43, 60, 14, CS) + rect(20, 57, 60, 14, CD);
    else if (/frança|itália|irlanda|méxico/.test(countryName)) body += rect(20, 29, 20, 42, CP) + rect(40, 29, 20, 42, CS) + rect(60, 29, 20, 42, CD);
    else if (/alemanha|rússia|holanda|colômbia|argentina|uruguai|espanha|índia/.test(countryName)) {
      const top = countryName === 'espanha' ? 11 : countryName === 'colômbia' ? 22 : 14;
      const bottom = countryName === 'espanha' ? 17 : countryName === 'colômbia' ? 11 : 14;
      body += rect(20, 29, 60, top, CP) + rect(20, 29 + top, 60, 44 - top - bottom, CS) + rect(20, 73 - bottom, 60, bottom, CD);
      if (countryName === 'índia') body += circle(50, 51, 8, 'none', '#24528A', 1.7) + [0, 1, 2, 3, 4, 5].map((i) => { const a = i * Math.PI / 3; return line(50, 51, 50 + Math.cos(a) * 7, 51 + Math.sin(a) * 7, '#24528A', .8); }).join('');
      if (countryName === 'espanha') body += circle(38, 50, 5, CD, '#E6C16A', 1.1);
    }
    else if (countryName === 'japão') body += circle(50, 50, 12, CS);
    else if (countryName === 'grécia') body += Array.from({ length: 5 }, (_, i) => rect(20, 29 + i * 8, 60, 4, i % 2 ? CS : CP)).join('') + rect(20, 29, 25, 24, CP) + path('M20 41H45M32.5 29V53', 'none', CS, 4);
    else if (countryName === 'suécia' || countryName === 'noruega') body += rect(20, 29, 60, 42, CP) + rect(37, 29, 7, 42, CS, 'none') + rect(20, 46, 60, 7, CS, 'none') + (countryName === 'noruega' ? rect(39, 29, 3, 42, CD, 'none') + rect(20, 48, 60, 3, CD, 'none') : '');
    else if (countryName === 'áfrica do sul') body += rect(20, 29, 60, 42, CP) + path('M20 29L48 48H80V57H48L20 71', 'none', '#FFFFFF', 17) + path('M20 29L48 48H80V57H48L20 71', 'none', CD, 10) + path('M20 29L45 50H20Z', '#202020', 'none') + path('M20 29L44 48', 'none', CS, 2) + path('M20 71L48 57H80V71Z', '#24528A', 'none');
    else if (countryName === 'canadá') body += rect(20, 29, 13, 42, CP) + rect(33, 29, 34, 42, CS) + rect(67, 29, 13, 42, CP) + path('M50 36L55 46L62 45L58 52L62 60L52 57L50 66L47 57L38 60L42 52L38 45L46 46Z', CD, 'none');
    else body += rect(20, 29, 60, 42, CP, 'none', 3) + path('M20 50H80M50 29V71', 'none', CS, 5) + path('M20 50H80M50 29V71', 'none', CD, 2);
    return svg(body + line(28, 78, 72, 78, D, 2));
  }
  return object(name, seed, 'countries');
}

function art(category, name, seed) {
  const n = name.toLowerCase();
  if (category === 'classics') return classic(name, seed);
  if (category === 'effects') return effect(name, seed);
  if (category === 'animals') return animalHero(name);
  if (category === 'florals') return flower(name, seed);
  if (category === 'fruits') return fruit(name, seed);
  if (category === 'countries') return country(name, seed);
  if (/flor|margarida|folha|ramo|trevo|rosa|girassol/.test(n)) return flower(name, seed);
  if (/borboleta|abelha|esquilo|rena|coelho|fantasma|morcego|gato preto|pintinho|urso/.test(n)) return animalLegacy(name, seed);
  return object(name, seed, category);
}
function makeTags(name, categoryName) {
  return [...new Set((name + ' ' + categoryName).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 1))];
}

await mkdir(join(root, 'assets/elements/library'), { recursive: true });
const catalogFile = join(root, 'data/catalog.json');
let previousAnimalAssets = [];
try {
  const previousCatalog = JSON.parse(await readFile(catalogFile, 'utf8'));
  previousAnimalAssets = previousCatalog.categories?.find((category) => category.id === 'animals')?.elements?.map((element) => element.asset) || [];
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const catalog = { categories: [] };
for (const category of categories) {
  const elements = [];
  for (let i = 0; i < category.entries.length; i++) {
    const name = category.entries[i].trim();
    const id = legacy.get(category.id + '|' + name) || (category.id + '-' + slug(name) + '-' + String(i + 1).padStart(2, '0'));
    const importedName = importedAssets.get(category.id + '|' + name);
    const asset = importedName
      ? '/assets/elements/user-imports/' + category.id + '/' + importedName + '.svg'
      : '/assets/elements/library/' + id + '.svg';
    const file = join(root, asset.slice(1));
    if (importedName) {
      await readFile(file, 'utf8');
    } else {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, applyTheme(art(category.id, name, i + 1), category.id, name), 'utf8');
    }
    const element = { id, name, asset, tags: makeTags(name, category.name) };
    if (importedName) {
      element.renderAsImage = true;
      element.aspectRatio = 1;
    } else {
      const scheme = paletteFor(category.id, name);
      element.colors = { primary: scheme[0], secondary: scheme[1], detail: scheme[2] };
    }
    elements.push(element);
  }
  catalog.categories.push({ id: category.id, name: category.name, icon: category.icon, elements });
}
await writeFile(catalogFile, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
const currentAssets = new Set(catalog.categories.flatMap((category) => category.elements.map((element) => element.asset)));
let removedAnimalAssets = 0;
for (const asset of previousAnimalAssets) {
  if (!/^\/assets\/elements\/library\/[\w.-]+\.svg$/.test(asset) || currentAssets.has(asset)) continue;
  await unlink(join(root, asset.slice(1))).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  removedAnimalAssets++;
}
console.log('Biblioteca gerada: ' + catalog.categories.map((category) => category.name + ' (' + category.elements.length + ')').join(', '));
console.log('Total de elementos: ' + catalog.categories.reduce((sum, category) => sum + category.elements.length, 0));
console.log('Ilustrações antigas de Animais removidas: ' + removedAnimalAssets);
