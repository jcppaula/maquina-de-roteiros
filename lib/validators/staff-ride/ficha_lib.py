#!/usr/bin/env python3
"""
Funções comuns aos scripts da skill roteirista-historia-militar:
leitura do roteiro marcado, da ficha de estrutura, da forma curta do registro e dos bordões.
"""
import re

BORDOES = {
    "B1": "This is The Staff Ride. What they planned, what they believed, and what was true.",
    "B2": "Here is the map in his head.",
    "B3": "And here is the ground.",
    "B4": "That is what the record shows. Here is where it goes quiet.",
}
FINAL = "The map is never the ground."

TIPOS = {"ABR", "CTX", "CRE", "CHA", "POV", "MEC", "EXE", "DOB", "PLA", "NOM", "REG", "CON", "FEC"}
CODIGOS = {
    "abertura": {f"AB{i}" for i in range(1, 9)},
    "promessa": {f"PC{i}" for i in range(1, 6)},
    "dobradica": {"D1", "D2", "D3"},
    "outro_lado": {f"PV{i}" for i in range(1, 5)},
    "registro": {f"RG{i}" for i in range(1, 5)},
    "nome": {f"NM{i}" for i in range(0, 5)},
    "fecho": {f"FC{i}" for i in range(1, 7)},
    "tempo": {f"TN{i}" for i in range(1, 6)},
    "mapas": {f"MP{i}" for i in range(1, 5)},
    "analogia": {f"AN{i}" for i in range(0, 4)},
    "ritmo": {"RT1", "RT2", "RT3"},
}
ZONAS = {"Z1": (0.15, 0.30), "Z2": (0.30, 0.45), "Z3": (0.45, 0.65), "Z4": (0.65, 0.80), "Z5": (0.80, 0.95)}
FAIXA_D = {"D1": (0.25, 0.40), "D2": (0.40, 0.55), "D3": (0.55, 0.70)}
# nomes antigos de marcação (vídeo 07) → nomes atuais
ALIAS = {"CTA-MEIO": "CTA-INSCRICAO", "PONTE": "CTA-PERGUNTA"}

BLOCK_RE = re.compile(r"^##\s*\[B(\d+)\]\s*(.*?)\s*(?:\{([A-Z+]+)\})?\s*$")
TAG_RE = re.compile(r"\[\[([A-Z\-]+)(?::([A-Za-z0-9_\-]+))?\]\]")
REF_RE = re.compile(r"\[(?:[SPEC]\d+(?:\s*,\s*[SPEC]\d+)*)\]")
MD_RE = re.compile(r"(\*\*|__|\*|_|`)")


def ler_ficha(texto):
    """Lê o comentário <!-- FICHA ... --> e devolve {chave: (valor, justificativa)}."""
    m = re.search(r"<!--\s*FICHA(.*?)-->", texto, re.S)
    if not m:
        return None
    ficha = {}
    for linha in m.group(1).splitlines():
        if ":" not in linha:
            continue
        k, resto = linha.split(":", 1)
        k = k.strip().lower()
        if "|" in resto:
            v, j = resto.split("|", 1)
        else:
            v, j = resto, ""
        ficha[k] = (v.strip(), j.strip())
    return ficha


def parse_roteiro(path):
    """Devolve blocos [num, nome, tipos, palavra_inicial, caracteres], tags [(tag, arg, palavra, bloco)],
    total de palavras, lista de linhas limpas, nº de pistas MAPA, texto bruto."""
    bruto = open(path, encoding="utf-8").read()
    lines = bruto.splitlines()
    started, words, mapas, in_comment = False, 0, 0, False
    blocks, tags, clean, refs = [], [], [], []
    for raw in lines:
        line = raw.rstrip()
        st = line.strip()
        if in_comment:
            if "-->" in st:
                in_comment = False
            continue
        if st.startswith("<!--"):
            in_comment = "-->" not in st
            continue
        m = BLOCK_RE.match(line)
        if m:
            started = True
            tipos = m.group(3).split("+") if m.group(3) else []
            blocks.append([int(m.group(1)), m.group(2).strip(), tipos, words, 0])
            if clean and clean[-1] != "":
                clean.append("")
            continue
        if not started:
            continue
        if st.startswith("## "):
            break
        if st.startswith(">"):
            if st.lstrip("> ").upper().startswith("MAPA"):
                mapas += 1
            continue
        if st.startswith("#") or st.startswith("|") or st == "---":
            continue
        for t in TAG_RE.finditer(st):
            tag = ALIAS.get(t.group(1), t.group(1))
            tags.append((tag, t.group(2), words, blocks[-1][0]))
        for r in REF_RE.finditer(st):
            refs.append((r.group(0), blocks[-1][0]))
        text = TAG_RE.sub("", st)
        text = REF_RE.sub("", text)
        text = MD_RE.sub("", text)
        text = re.sub(r"\s{2,}", " ", text).strip()
        if not text:
            if clean and clean[-1] != "":
                clean.append("")
            continue
        words += len(text.split())
        blocks[-1][4] += len(text) + 1
        clean.append(text)
    return {"blocks": blocks, "tags": tags, "words": words, "clean": clean,
            "mapas": mapas, "raw": bruto, "refs": refs}


def narracao(clean):
    return " ".join(c for c in clean if c)


def zona_de(pos):
    for z, (a, b) in ZONAS.items():
        if a <= pos < b:
            return z
    return "fora"


def bordoes_usados(texto):
    t = norm(texto)
    return sorted(k for k, v in BORDOES.items() if norm(v) in t)


def norm(s):
    s = s.lower().replace("’", "'").replace("—", " ").replace("–", " ")
    return re.sub(r"[^a-z0-9' ]+", " ", re.sub(r"\s+", " ", s)).strip()


# ---------- forma curta (coluna Estrutura do registro) ----------

def ficha_para_curta(f):
    """Converte a ficha (dicionário de ler_ficha) na forma curta do registro."""
    g = lambda k: f.get(k, ("?", ""))[0].split()[0] if f.get(k, ("", ""))[0] else "?"
    prom = f.get("promessa", ("?", ""))[0].split()
    pc = prom[0] + ("/" + prom[1] if len(prom) > 1 else "")
    ins = f.get("inscricao", ("nenhuma", ""))[0].split()
    per = f.get("pergunta", ("fixado", ""))[0].split()
    s_tok = "S-" if not ins or ins[0].lower().startswith("nenh") else f"{ins[0]}@{ins[1] if len(ins) > 1 else '?'}"
    if not per or per[0].lower().startswith("fix"):
        k_tok = f"{per[1] if len(per) > 1 else 'K?'}@fix"
    else:
        k_tok = f"{per[0]}@{per[1] if len(per) > 1 else '?'}"
    bo = f.get("bordoes", ("nenhum", ""))[0]
    bo = "-" if bo.lower().startswith("nenh") else bo.replace(" ", "")
    seq = ",".join(f.get("sequencia", ("", ""))[0].split())
    partes = [g("abertura"), pc, g("dobradica"), "P" + g("pedidos"), s_tok, k_tok, g("outro_lado"),
              g("registro"), g("nome"), g("fecho"), g("tempo"), g("mapas"), g("analogia"), g("ritmo"),
              "BO:" + bo, "N" + g("blocos"), "SEQ:" + seq]
    return " ".join(partes)


def curta_para_dict(s):
    """Lê a forma curta do registro de volta para um dicionário de códigos."""
    d = {}
    for tok in s.replace("·", " ").split():
        if tok.startswith("SEQ:"):
            d["sequencia"] = [x for x in tok[4:].split(",") if x]
        elif tok.startswith("BO:"):
            v = tok[3:]
            d["bordoes"] = [] if v in ("-", "") else v.split(",")
        elif re.fullmatch(r"AB\d", tok):
            d["abertura"] = tok
        elif re.fullmatch(r"PC\d(/\w+)?", tok):
            d["promessa"] = tok.split("/")[0]
            d["pc_quando"] = tok.split("/")[1] if "/" in tok else "?"
        elif re.fullmatch(r"D\d", tok):
            d["dobradica"] = tok
        elif re.fullmatch(r"P\d", tok):
            d["pedidos"] = int(tok[1])
        elif re.fullmatch(r"S(\d|-)(@\w+)?", tok):
            d["inscricao"] = None if tok.startswith("S-") else tok.split("@")[0]
            d["inscricao_zona"] = tok.split("@")[1] if "@" in tok else None
        elif re.fullmatch(r"K[\d?](@\w+)?", tok):
            d["pergunta"] = tok.split("@")[0]
            z = tok.split("@")[1] if "@" in tok else None
            d["pergunta_zona"] = None if z in (None, "fix") else z
        elif re.fullmatch(r"PV\d", tok):
            d["outro_lado"] = tok
        elif re.fullmatch(r"RG\d", tok):
            d["registro"] = tok
        elif re.fullmatch(r"NM\d", tok):
            d["nome"] = tok
        elif re.fullmatch(r"FC\d", tok):
            d["fecho"] = tok
        elif re.fullmatch(r"TN\d", tok):
            d["tempo"] = tok
        elif re.fullmatch(r"MP\d", tok):
            d["mapas"] = tok
        elif re.fullmatch(r"AN\d", tok):
            d["analogia"] = tok
        elif re.fullmatch(r"RT\d", tok):
            d["ritmo"] = tok
        elif re.fullmatch(r"N\d+", tok):
            d["blocos"] = int(tok[1:])
    return d


def ler_registro(path):
    """Linhas do registro de produção (na ordem da tabela) com Nº, Título e Estrutura."""
    linhas = open(path, encoding="utf-8").read().splitlines()
    header, out = None, []
    for ln in linhas:
        if not ln.startswith("|"):
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if header is None:
            if any(c.lower() == "estrutura" for c in cells):
                header = [c.lower() for c in cells]
            continue
        if set("".join(cells)) <= set("-: "):
            continue
        row = dict(zip(header, cells))
        out.append(row)
    return out
