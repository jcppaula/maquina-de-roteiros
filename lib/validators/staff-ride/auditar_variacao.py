#!/usr/bin/env python3
"""
Auditor de variação — roteirista-historia-militar.

Compara o roteiro novo com os vídeos já feitos (histórico e registro) e com as frases gastas.

FALHA:
  - sequência de 8 palavras idêntica a um roteiro do histórico (fora a última frase e os bordões)
  - frase gasta (references/frases-gastas.txt)
  - rotação violada (ver references/ficha-de-estrutura.md):
      ≠ anterior: abertura, promessa, outro_lado, registro, nome, fecho, tempo, mapas, analogia (≠ AN0),
                  nº de pedidos, tipo de inscrição, tipo de pergunta, nº de blocos
      janela de 5: abertura ≤ 2, fecho ≤ 2, RG1 ≤ 2, D2 ≤ 3
      momento da promessa: não 3 vezes seguidas
      mesma zona para o mesmo tipo de pedido do anterior
      bordão opcional usado no vídeo anterior
  - sequência de tipos de bloco > 0,75 parecida com a de algum vídeo da janela
AVISO:
  - mais de 3 sequências de 6 palavras repetidas de um mesmo roteiro do histórico
  - sequência de tipos > 0,65 parecida
  - as primeiras ou as últimas 150 palavras parecidas demais com as de outro vídeo
  - abertura que começa com as mesmas 3 palavras de outro vídeo
  - histórico vazio ou sem ficha (a rotação usa só o registro)

O histórico é uma pasta de roteiros .md, um por vídeo, nomeados AAAA-MM-DD-NN-slug.md (data de
postagem), para a ordem sair do nome. Quando um roteiro do histórico não tem ficha (o 07), a forma
dele vem da coluna Estrutura do registro.

Uso:
  python3 auditar_variacao.py 02-roteiro.md --historico <pasta> [--registro registro-de-producao.md]
         [--numero NN] [--gastas references/frases-gastas.txt]
"""
import argparse
import difflib
import glob
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ficha_lib import (BORDOES, FINAL, bordoes_usados, curta_para_dict, ficha_para_curta, ler_ficha,
                       ler_registro, narracao, norm, parse_roteiro, zona_de)

AQUI = os.path.dirname(os.path.abspath(__file__))


def palavras(texto):
    t = norm(texto)
    for frase in list(BORDOES.values()) + [FINAL]:
        t = t.replace(norm(frase), " | ")
    return t.split()


def ngramas(ws, n):
    out = set()
    for i in range(len(ws) - n + 1):
        g = ws[i:i + n]
        if "|" in g:
            continue
        out.add(" ".join(g))
    return out


def jaccard(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


def forma_do_roteiro(path):
    """Forma (dicionário de códigos) a partir da ficha embutida, ou None."""
    R = parse_roteiro(path)
    F = ler_ficha(R["raw"])
    if not F:
        return None, R
    return curta_para_dict(ficha_para_curta(F)), R


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("roteiro")
    ap.add_argument("--historico", required=True)
    ap.add_argument("--registro")
    ap.add_argument("--numero", help="Nº do vídeo novo, para não comparar com a própria linha do registro")
    ap.add_argument("--gastas", default=os.path.join(AQUI, "..", "references", "frases-gastas.txt"))
    a = ap.parse_args()

    falhas, avisos = [], []
    novo_forma, RN = forma_do_roteiro(a.roteiro)
    if novo_forma is None:
        print("FALHA: o roteiro novo não tem ficha de estrutura.")
        sys.exit(1)
    novo_txt = narracao(RN["clean"])
    novo_ws = palavras(novo_txt)

    # ---------- frases gastas ----------
    pats = []
    for ln in open(a.gastas, encoding="utf-8"):
        ln = ln.strip()
        if ln and not ln.startswith("#"):
            pats.append(re.compile(ln, re.I))
    for p in pats:
        m = p.search(novo_txt)
        if m:
            falhas.append(f'frase gasta: "{m.group(0)}" (padrão {p.pattern})')

    # ---------- histórico ----------
    arquivos = sorted(f for f in glob.glob(os.path.join(a.historico, "*.md"))
                      if os.path.abspath(f) != os.path.abspath(a.roteiro))
    hist = []  # (nome, nº, forma, palavras)
    for f in arquivos:
        base = os.path.basename(f)
        m = re.match(r"\d{4}-\d{2}-\d{2}-(\d+)", base)
        num = m.group(1) if m else None
        forma, R = forma_do_roteiro(f)
        hist.append({"nome": base, "num": num, "forma": forma, "ws": palavras(narracao(R["clean"]))})
    if not hist:
        avisos.append(f"histórico vazio em {a.historico}: nada para comparar no texto")

    # formas vindas do registro (preenche quem não tem ficha e vídeos ausentes do histórico)
    reg_formas = []
    if a.registro:
        for row in ler_registro(a.registro):
            est = row.get("estrutura", "").strip()
            num = row.get("nº", row.get("no", "")).strip()
            if not est or (a.numero and num == a.numero):
                continue
            reg_formas.append({"num": num, "forma": curta_para_dict(est)})
    # ordem: registro manda (é a ordem de postagem); histórico completa
    janela = []
    if reg_formas:
        por_num = {h["num"]: h for h in hist}
        for r in reg_formas:
            h = por_num.get(r["num"])
            janela.append({"num": r["num"], "forma": (h["forma"] if h and h["forma"] else r["forma"])})
    else:
        janela = [{"num": h["num"], "forma": h["forma"]} for h in hist if h["forma"]]
    sem_forma = [h["nome"] for h in hist if not h["forma"] and not any(r["num"] == h["num"] for r in reg_formas)]
    if sem_forma:
        avisos.append("sem ficha e sem linha Estrutura no registro: " + ", ".join(sem_forma))
    janela = janela[-5:]

    # ---------- texto contra o histórico ----------
    g8n, g6n = ngramas(novo_ws, 8), ngramas(novo_ws, 6)
    ab_novo, fe_novo = ngramas(novo_ws[:150], 4), ngramas(novo_ws[-150:], 4)
    for h in hist:
        rep8 = g8n & ngramas(h["ws"], 8)
        if rep8:
            falhas.append(f"{len(rep8)} trecho(s) de 8 palavras iguais a {h['nome']}: " +
                          "; ".join(f'"{x}"' for x in sorted(rep8)[:3]))
        rep6 = g6n & ngramas(h["ws"], 6)
        if len(rep6) > 3:
            avisos.append(f"{len(rep6)} trechos de 6 palavras iguais a {h['nome']}")
        if h["ws"][:3] == novo_ws[:3]:
            avisos.append(f"a abertura começa com as mesmas três palavras de {h['nome']}")
        ja = jaccard(ab_novo, ngramas(h["ws"][:150], 4))
        jf = jaccard(fe_novo, ngramas(h["ws"][-150:], 4))
        if ja > 0.10:
            avisos.append(f"abertura parecida com a de {h['nome']} ({ja:.2f})")
        if jf > 0.10:
            avisos.append(f"fecho parecido com o de {h['nome']} ({jf:.2f})")

    # ---------- rotação ----------
    N = novo_forma
    if janela:
        P = janela[-1]["forma"]
        print(f"Vídeo anterior: nº {janela[-1]['num']} · janela: {[j['num'] for j in janela]}")
        for k in ("abertura", "promessa", "outro_lado", "registro", "nome", "fecho", "tempo", "mapas"):
            if N.get(k) and N.get(k) == P.get(k):
                falhas.append(f"{k} {N[k]} repete o vídeo anterior")
        if N.get("analogia") not in (None, "AN0") and N.get("analogia") == P.get("analogia"):
            falhas.append(f"analogia {N['analogia']} repete o vídeo anterior")
        if N.get("pedidos") is not None and N.get("pedidos") == P.get("pedidos"):
            falhas.append(f"{N['pedidos']} pedido(s), como o vídeo anterior; a quantidade precisa mudar")
        if N.get("inscricao") and N.get("inscricao") == P.get("inscricao"):
            falhas.append(f"tipo de inscrição {N['inscricao']} repete o anterior")
        if N.get("pergunta") and N.get("pergunta") == P.get("pergunta"):
            falhas.append(f"tipo de pergunta {N['pergunta']} repete o anterior")
        if N.get("inscricao_zona") and N.get("inscricao_zona") == P.get("inscricao_zona"):
            falhas.append(f"inscrição na mesma zona do anterior ({N['inscricao_zona']})")
        if N.get("pergunta_zona") and N.get("pergunta_zona") == P.get("pergunta_zona"):
            falhas.append(f"pergunta na mesma zona do anterior ({N['pergunta_zona']})")
        if N.get("blocos") and N.get("blocos") == P.get("blocos"):
            falhas.append(f"{N['blocos']} blocos, como o anterior")
        rep_bo = set(N.get("bordoes", [])) & set(P.get("bordoes", []))
        if rep_bo:
            falhas.append(f"bordão opcional repetido do anterior: {sorted(rep_bo)}")
        # janelas
        conta = lambda k, v: sum(1 for j in janela if j["forma"].get(k) == v)
        if N.get("abertura") and conta("abertura", N["abertura"]) >= 2:
            falhas.append(f"abertura {N['abertura']} já aparece 2 vezes nos últimos 5")
        if N.get("fecho") and conta("fecho", N["fecho"]) >= 2:
            falhas.append(f"fecho {N['fecho']} já aparece 2 vezes nos últimos 5")
        if N.get("registro") == "RG1" and conta("registro", "RG1") >= 2:
            falhas.append("RG1 já aparece 2 vezes nos últimos 5")
        if N.get("dobradica") == "D2" and conta("dobradica", "D2") >= 3:
            falhas.append("D2 já aparece 3 vezes nos últimos 5")
        ult2 = [j["forma"].get("pc_quando") for j in janela[-2:]]
        if len(ult2) == 2 and N.get("pc_quando") and ult2[0] == ult2[1] == N.get("pc_quando"):
            falhas.append(f"promessa no momento '{N['pc_quando']}' pela terceira vez seguida")
        for j in janela:
            s1, s2 = N.get("sequencia", []), j["forma"].get("sequencia", [])
            if s1 and s2:
                r = difflib.SequenceMatcher(None, s1, s2).ratio()
                if r > 0.75:
                    falhas.append(f"sequência de blocos {r:.2f} parecida com a do nº {j['num']} (limite 0,75)")
                elif r > 0.65:
                    avisos.append(f"sequência de blocos {r:.2f} parecida com a do nº {j['num']}")
    else:
        avisos.append("nenhum vídeo anterior com forma conhecida: rotação não conferida")

    print(f"\n=== auditoria de variação: {a.roteiro}")
    print(f"Comparado com {len(hist)} roteiro(s) do histórico e {len(janela)} forma(s) na janela")
    print("Forma do novo:", ficha_para_curta(ler_ficha(RN["raw"])))
    print("\n--- RESULTADO")
    for f in falhas:
        print("FALHA:", f)
    for v in avisos:
        print("AVISO:", v)
    if not falhas and not avisos:
        print("OK: nenhuma repetição detectada (a leitura em sequência continua obrigatória).")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
